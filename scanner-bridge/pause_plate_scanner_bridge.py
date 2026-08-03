#!/usr/bin/env python3
"""Pause & Plate Scanner Bridge — Windows WIA + macOS/Linux SANE.

The server binds to 127.0.0.1 only and exposes the minimum API required by
the GitHub Pages application:
  GET  /health
  GET  /scanners
  POST /scan-file
"""

from __future__ import annotations

import argparse
import base64
import email
import html
import json
import logging
import mimetypes
import os
import platform
import re
import shutil
import ssl
import subprocess
import sys
import tempfile
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


VERSION = "2.2.1"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 17891
SCAN_LOCK = threading.Lock()
MOCK_FILE: Path | None = None
NETWORK_SCANNER_CACHE: tuple[float, list[dict]] = (0.0, [])
NETWORK_SCANNER_CACHE_LOCK = threading.Lock()
NAPS2_DEVICE_CACHE: dict[str, tuple[float, list[str]]] = {}
NAPS2_DEVICE_CACHE_LOCK = threading.Lock()

ALLOWED_WEB_ORIGINS = {
    "https://asmaabd1987-ui.github.io",
    "http://asmaabd1987-ui.github.io",
    "null",
}


def default_log_file() -> Path:
    system = platform.system().lower()
    if system == "windows":
        root = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "PausePlateScanner"
    elif system == "darwin":
        root = Path.home() / "Library" / "Logs"
    else:
        root = Path.home() / ".local" / "state" / "pause-plate-scanner"
    try:
        root.mkdir(parents=True, exist_ok=True)
    except OSError:
        root = Path(tempfile.gettempdir()) / "pause-plate-scanner"
        root.mkdir(parents=True, exist_ok=True)
    return root / "bridge.log"


def configure_logging() -> None:
    log_file = default_log_file()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.FileHandler(log_file, encoding="utf-8"), logging.StreamHandler()],
    )
    logging.info("Pause & Plate Scanner Bridge %s starting", VERSION)


def platform_label() -> str:
    system = platform.system().lower()
    if system == "windows":
        return "Windows"
    if system == "darwin":
        return "macOS"
    return platform.system() or "Unknown"


def allowed_origin(origin: str | None) -> bool:
    if not origin:
        return True
    if origin in ALLOWED_WEB_ORIGINS:
        return True
    try:
        parsed = urlparse(origin)
        return parsed.scheme in {"http", "https"} and parsed.hostname in {"localhost", "127.0.0.1", "::1"}
    except ValueError:
        return False


def scanimage_path() -> str | None:
    candidates = [
        shutil.which("scanimage"),
        "/opt/homebrew/bin/scanimage",
        "/usr/local/bin/scanimage",
        "/usr/bin/scanimage",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return str(candidate)
    return None


def naps2_command_prefix() -> list[str] | None:
    """Return the NAPS2 CLI command prefix for the current platform."""
    system = platform.system().lower()
    if system == "windows":
        candidates = [
            shutil.which("NAPS2.Console.exe"),
            str(Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "NAPS2" / "NAPS2.Console.exe"),
            str(Path(os.environ.get("LOCALAPPDATA", Path.home())) / "Programs" / "NAPS2" / "NAPS2.Console.exe"),
        ]
        for candidate in candidates:
            if candidate and Path(candidate).is_file():
                return [str(candidate)]
        return None
    if system == "darwin":
        candidates = [
            "/Applications/NAPS2.app/Contents/MacOS/NAPS2",
            str(Path.home() / "Applications" / "NAPS2.app" / "Contents" / "MacOS" / "NAPS2"),
            shutil.which("naps2"),
        ]
        for candidate in candidates:
            if candidate and Path(candidate).is_file():
                return [str(candidate), "console"]
    return None


def _naps2_device_id(driver: str, name: str) -> str:
    encoded = base64.urlsafe_b64encode(name.encode("utf-8")).decode("ascii").rstrip("=")
    return f"naps2:{driver}:{encoded}"


def _decode_naps2_device_id(device_id: str) -> tuple[str, str]:
    parts = str(device_id).split(":", 2)
    if len(parts) != 3 or parts[0] != "naps2" or parts[1] not in {"wia", "twain", "escl", "apple"}:
        raise RuntimeError("Identifiant NAPS2 invalide.")
    token = parts[2]
    token += "=" * (-len(token) % 4)
    try:
        name = base64.urlsafe_b64decode(token.encode("ascii")).decode("utf-8")
    except Exception as error:
        raise RuntimeError("Nom du scanner NAPS2 invalide.") from error
    return parts[1], name


def _naps2_output_lines(raw: bytes) -> list[str]:
    lines: list[str] = []
    for raw_line in decode_process_output(raw).splitlines():
        line = re.sub(r"^[\s>*-]+", "", raw_line).strip()
        if not line or re.search(r"(?i)^(naps2|devices?|scanners?|driver|warning|error)\s*[:=]", line):
            continue
        if line not in lines:
            lines.append(line)
    return lines


def list_naps2_devices(driver: str, force: bool = False) -> list[str]:
    now = time.monotonic()
    with NAPS2_DEVICE_CACHE_LOCK:
        cached_at, cached_names = NAPS2_DEVICE_CACHE.get(driver, (0.0, []))
        if not force and cached_at > 0 and now - cached_at < 20:
            return list(cached_names)
    prefix = naps2_command_prefix()
    if not prefix:
        return []
    flags = 0x08000000 if platform.system().lower() == "windows" else 0
    try:
        process = subprocess.run(
            prefix + ["--listdevices", "--driver", driver],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=12,
            creationflags=flags,
            check=False,
        )
    except Exception as error:
        logging.debug("NAPS2 %s discovery failed: %s", driver, error)
        return []
    if process.returncode != 0:
        logging.debug("NAPS2 %s discovery: %s", driver, decode_process_output(process.stderr))
        return []
    names = _naps2_output_lines(process.stdout)
    with NAPS2_DEVICE_CACHE_LOCK:
        NAPS2_DEVICE_CACHE[driver] = (time.monotonic(), list(names))
    return names


def scan_naps2(device_id: str, resolution: int, mode: str) -> tuple[bytes, str, str]:
    prefix = naps2_command_prefix()
    if not prefix:
        raise RuntimeError("NAPS2 est introuvable. Relancez l’installateur du Scanner Bridge.")
    driver, name = _decode_naps2_device_id(device_id)
    resolution = max(75, min(int(resolution or 300), 600))
    bit_depth = "gray" if str(mode).lower().startswith("gray") else "color"
    flags = 0x08000000 if platform.system().lower() == "windows" else 0

    # Older Windows Network TWAIN drivers (notably KONICA MINOLTA bizhub)
    # may reject NAPS2's automatic DAT_CAPS negotiation. Run them through an
    # isolated native-UI profile with the old DSM instead. This opens the
    # manufacturer's own window without touching the user's NAPS2 profiles.
    if driver == "twain" and platform.system().lower() == "windows":
        with tempfile.TemporaryDirectory(prefix="pause-plate-naps2-native-") as temp_dir:
            root = Path(temp_dir)
            app_data = root / "AppData"
            profile_dir = app_data / "NAPS2"
            profile_dir.mkdir(parents=True, exist_ok=True)
            profile_name = "Pause Plate — TWAIN compatible"
            safe_name = html.escape(name, quote=True)
            safe_profile = html.escape(profile_name, quote=True)
            profile_xml = f"""<?xml version="1.0" encoding="utf-8"?>
<ArrayOfScanProfile xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <ScanProfile>
    <Device><ID>{safe_name}</ID><Name>{safe_name}</Name></Device>
    <DriverName>twain</DriverName>
    <DisplayName>{safe_profile}</DisplayName>
    <IconID>0</IconID><MaxQuality>true</MaxQuality><IsDefault>true</IsDefault><Version>2</Version>
    <UseNativeUI>true</UseNativeUI><AfterScanScale>OneToOne</AfterScanScale>
    <Brightness>0</Brightness><Contrast>0</Contrast><BitDepth>C24Bit</BitDepth>
    <PageAlign>Left</PageAlign><PageSize>A4</PageSize><Resolution>Dpi300</Resolution>
    <PaperSource>Glass</PaperSource><EnableAutoSave>false</EnableAutoSave><Quality>100</Quality>
    <AutoDeskew>false</AutoDeskew><BrightnessContrastAfterScan>false</BrightnessContrastAfterScan>
    <ForcePageSize>false</ForcePageSize><ForcePageSizeCrop>false</ForcePageSizeCrop>
    <TwainImpl>Old</TwainImpl><ExcludeBlankPages>false</ExcludeBlankPages>
    <FlipDuplexedPages>false</FlipDuplexedPages>
  </ScanProfile>
</ArrayOfScanProfile>
"""
            (profile_dir / "profiles.xml").write_text(profile_xml, encoding="utf-8")
            output_path = root / "scan.png"
            env = os.environ.copy()
            env["APPDATA"] = str(app_data)
            process = subprocess.run(
                prefix + ["--profile", profile_name, "--force", "--output", str(output_path)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                timeout=300,
                creationflags=flags,
                check=False,
            )
            if process.returncode == 0 and output_path.is_file() and output_path.stat().st_size > 0:
                return output_path.read_bytes(), "image/png", f"scan-{int(time.time() * 1000)}.png"
            detail = decode_process_output(process.stderr) or decode_process_output(process.stdout)
            raise RuntimeError(detail or "Le pilote TWAIN a annulé la numérisation.")

    errors: list[str] = []
    # Start with full A4 flatbed settings, then progressively let an older
    # vendor TWAIN driver choose unsupported capabilities itself.
    attempts = (
        ["--pagesize", "a4", "--deskew", "--source", "glass"],
        ["--pagesize", "a4"],
        [],
    )
    for compatibility_args in attempts:
        with tempfile.NamedTemporaryFile(prefix="pause-plate-naps2-", suffix=".png", delete=False) as output_file:
            output_path = Path(output_file.name)
        output_path.unlink(missing_ok=True)
        args = prefix + [
            "--noprofile",
            "--driver",
            driver,
            "--device",
            name,
            "--dpi",
            str(resolution),
            "--bitdepth",
            bit_depth,
            "--force",
            "--output",
            str(output_path),
        ] + compatibility_args
        try:
            process = subprocess.run(
                args,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=240,
                creationflags=flags,
                check=False,
            )
            if process.returncode == 0 and output_path.is_file() and output_path.stat().st_size > 0:
                return output_path.read_bytes(), "image/png", f"scan-{int(time.time() * 1000)}.png"
            errors.append(decode_process_output(process.stderr) or decode_process_output(process.stdout))
        finally:
            output_path.unlink(missing_ok=True)
    raise RuntimeError(next((error for error in reversed(errors) if error), "Échec du scan NAPS2."))


def _txt_value(properties: dict, key: str) -> str:
    """Decode a DNS-SD TXT value without failing on vendor encodings."""
    raw = properties.get(key.encode("utf-8"), properties.get(key, b""))
    if isinstance(raw, bytes):
        return raw.decode("utf-8", errors="replace").strip()
    return str(raw or "").strip()


def _network_scanner_name(service_name: str, properties: dict) -> str:
    for key in ("ty", "product", "note", "usb_MDL"):
        value = _txt_value(properties, key)
        if value:
            return value
    return re.sub(r"\._us?cans?\._tcp\.local\.?$", "", service_name, flags=re.IGNORECASE).strip()


def _escl_base_url(service_type: str, info: object) -> str | None:
    addresses: list[str] = []
    try:
        addresses = list(info.parsed_addresses())  # type: ignore[attr-defined]
    except Exception:
        addresses = []
    if not addresses:
        server = str(getattr(info, "server", "") or "").rstrip(".")
        if server:
            addresses = [server]
    if not addresses:
        return None
    host = next((address for address in addresses if ":" not in address), addresses[0])
    if ":" in host and not host.startswith("["):
        host = f"[{host}]"
    properties = dict(getattr(info, "properties", {}) or {})
    resource = _txt_value(properties, "rs") or "eSCL"
    resource = resource.strip().strip("/") or "eSCL"
    scheme = "https" if service_type.lower().startswith("_uscans.") else "http"
    port = int(getattr(info, "port", 0) or (443 if scheme == "https" else 80))
    return f"{scheme}://{host}:{port}/{resource}"


def discover_escl_scanners(force: bool = False) -> list[dict]:
    """Discover driverless AirScan/eSCL scanners advertised with DNS-SD.

    The dependency is optional so USB/WIA/SANE scanning keeps working even if
    package installation or multicast discovery is unavailable.
    """
    global NETWORK_SCANNER_CACHE
    now = time.monotonic()
    with NETWORK_SCANNER_CACHE_LOCK:
        cached_at, cached_rows = NETWORK_SCANNER_CACHE
        if not force and cached_at > 0 and now - cached_at < 20:
            return [dict(row) for row in cached_rows]

    try:
        from zeroconf import ServiceBrowser, ServiceListener, Zeroconf
    except Exception:
        return []

    found: dict[str, dict] = {}
    found_lock = threading.Lock()

    class Listener(ServiceListener):
        def add_service(self, zeroconf: object, service_type: str, name: str) -> None:
            self._remember(zeroconf, service_type, name)

        def update_service(self, zeroconf: object, service_type: str, name: str) -> None:
            self._remember(zeroconf, service_type, name)

        def remove_service(self, zeroconf: object, service_type: str, name: str) -> None:
            return

        def _remember(self, zeroconf: object, service_type: str, name: str) -> None:
            try:
                info = zeroconf.get_service_info(service_type, name, timeout=1400)  # type: ignore[attr-defined]
                if not info:
                    return
                base_url = _escl_base_url(service_type, info)
                if not base_url:
                    return
                properties = dict(getattr(info, "properties", {}) or {})
                row = {
                    "id": f"escl:{base_url}",
                    "name": _network_scanner_name(name, properties) or "Scanner réseau",
                    "vendor": _txt_value(properties, "usb_MFG") or _txt_value(properties, "mfg"),
                    "model": _txt_value(properties, "usb_MDL") or _txt_value(properties, "ty"),
                    "backend": "AirScan/eSCL",
                    "connection": "network",
                    "network": True,
                    "url": base_url,
                }
                with found_lock:
                    found[base_url.lower()] = row
            except Exception as error:
                logging.debug("AirScan service ignored: %s", error)

    zeroconf = Zeroconf()
    browsers = []
    listener = Listener()
    try:
        for service_type in ("_uscan._tcp.local.", "_uscans._tcp.local."):
            browsers.append(ServiceBrowser(zeroconf, service_type, listener))
        time.sleep(2.2)
    finally:
        for browser in browsers:
            try:
                browser.cancel()
            except Exception:
                pass
        zeroconf.close()

    rows = sorted(found.values(), key=lambda row: str(row.get("name", "")).lower())
    with NETWORK_SCANNER_CACHE_LOCK:
        NETWORK_SCANNER_CACHE = (time.monotonic(), [dict(row) for row in rows])
    return rows


def decode_process_output(raw: bytes) -> str:
    if not raw:
        return ""
    if raw.startswith((b"\xff\xfe", b"\xfe\xff")) or b"\x00" in raw[:80]:
        try:
            return raw.decode("utf-16").strip()
        except UnicodeDecodeError:
            pass
    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return raw.decode(encoding).strip()
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace").strip()


def safe_header_filename(value: str) -> str:
    """Return an ASCII-only filename safe for HTTP response headers."""
    original = Path(str(value or "scan.png")).name
    suffix = Path(original).suffix.lower()
    ascii_name = (
        unicodedata.normalize("NFKD", original)
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    ascii_name = re.sub(r"[^A-Za-z0-9._-]+", "-", ascii_name).strip("-._")
    if not ascii_name:
        ascii_name = f"scan-{int(time.time() * 1000)}{suffix or '.png'}"
    elif suffix and not Path(ascii_name).suffix:
        ascii_name += suffix
    return ascii_name[:160]


def clean_powershell_error(value: str) -> str:
    """Convert PowerShell CLIXML errors into a short user-readable message."""
    text = str(value or "").strip()
    if "PP_WIA_ERROR:" in text:
        return text.split("PP_WIA_ERROR:", 1)[1].splitlines()[0].strip()[:600]
    fragments = re.findall(r'<S\s+S="Error">(.*?)</S>', text, flags=re.DOTALL | re.IGNORECASE)
    if fragments:
        text = "\n".join(html.unescape(fragment) for fragment in fragments)
    text = html.unescape(text.replace("#< CLIXML", ""))
    replacements = {
        "_x000D__x000A_": "\n",
        "_x000A_": "\n",
        "_x000D_": "\n",
        "_x0009_": "\t",
    }
    for encoded, decoded in replacements.items():
        text = text.replace(encoded, decoded)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    meaningful = [
        line for line in lines
        if not line.startswith(("Au caractère Ligne:", "At line:", "+", "CategoryInfo", "FullyQualifiedErrorId"))
    ]
    return (meaningful[0] if meaningful else (lines[0] if lines else "Erreur WIA inconnue."))[:600]


def powershell_path() -> str:
    return shutil.which("powershell.exe") or shutil.which("powershell") or "powershell.exe"


def run_powershell(script: str, *, extra_env: dict[str, str] | None = None, timeout: int = 30) -> str:
    encoded = base64.b64encode(script.encode("utf-16le")).decode("ascii")
    env = os.environ.copy()
    if extra_env:
        env.update(extra_env)
    flags = 0x08000000 if platform.system().lower() == "windows" else 0
    process = subprocess.run(
        [powershell_path(), "-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        timeout=timeout,
        creationflags=flags,
        check=False,
    )
    stdout = decode_process_output(process.stdout)
    stderr = decode_process_output(process.stderr)
    if process.returncode != 0:
        raise RuntimeError(clean_powershell_error(stderr or stdout))
    return stdout


WINDOWS_LIST_SCRIPT = r"""
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$manager = New-Object -ComObject WIA.DeviceManager
$rows = @()
$index = 0
foreach($info in @($manager.DeviceInfos)) {
    if([int]$info.Type -ne 1) { continue }
    $index++
    $name = $null
    $vendor = $null
    $port = $null
    $server = $null
    $remoteId = $null
    foreach($prop in @($info.Properties)) {
        if([int]$prop.PropertyID -eq 7) { $name = [string]$prop.Value }
        if([int]$prop.PropertyID -eq 3) { $vendor = [string]$prop.Value }
        if([int]$prop.PropertyID -eq 6) { $port = [string]$prop.Value }
        if([int]$prop.PropertyID -eq 8) { $server = [string]$prop.Value }
        if([int]$prop.PropertyID -eq 9) { $remoteId = [string]$prop.Value }
    }
    if([string]::IsNullOrWhiteSpace($name)) { $name = "Scanner $index" }
    $networkClues = ([string]$info.DeviceID + " " + $port + " " + $server + " " + $remoteId)
    # Do not classify ordinary \\?\usb... WIA device paths as network. Some
    # USB drivers fill WIA's "server" property with a non-host value, so that
    # property alone is not reliable. A WIA network scanner must expose an
    # explicit WSD/WS-Scan/AirScan/eSCL clue; AirScan discovery is handled
    # separately below.
    $isNetwork = $networkClues -match '(?i)(WSD|WS-Scan|DAFWSDProvider|https?://|AirScan|eSCL)'
    $rows += [ordered]@{
        id = [string]$info.DeviceID
        name = $name
        vendor = $vendor
        backend = 'WIA'
        connection = $(if($isNetwork) { 'network' } else { 'local' })
        network = [bool]$isNetwork
    }
}
[ordered]@{ scanners = $rows } | ConvertTo-Json -Depth 5 -Compress
"""


WINDOWS_NETWORK_PRINTERS_SCRIPT = r"""
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$ports = @{}
foreach($port in @(Get-PrinterPort)) {
    $ports[[string]$port.Name] = $port
}
$rows = @()
foreach($printer in @(Get-Printer)) {
    $portName = [string]$printer.PortName
    $port = $ports[$portName]
    $address = if($port) { [string]$port.PrinterHostAddress } else { '' }
    $isNetwork = -not [string]::IsNullOrWhiteSpace($address) -or $portName -match '(?i)^(IP_|WSD-|https?://|\\\\)'
    if(-not $isNetwork) { continue }
    $rows += [ordered]@{
        name = [string]$printer.Name
        driver = [string]$printer.DriverName
        port = $portName
        address = $address
    }
}
[ordered]@{ printers = $rows } | ConvertTo-Json -Depth 5 -Compress
"""


WINDOWS_SCAN_SCRIPT = r"""
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
try {
$selectedId = [string]$env:PP_SCANNER_DEVICE_ID
$outputDir = [string]$env:PP_SCANNER_OUTPUT_DIR
$resolution = 300
if($env:PP_SCANNER_RESOLUTION) { $resolution = [int]$env:PP_SCANNER_RESOLUTION }

function Get-WiaProperty($item, [int]$propertyId) {
    foreach($property in @($item.Properties)) {
        if([int]$property.PropertyID -eq $propertyId) {
            return $property
        }
    }
    return $null
}

function Set-WiaProperty($item, [int]$propertyId, $value) {
    $property = Get-WiaProperty $item $propertyId
    if($null -eq $property) { return $false }
    try {
        $property.Value = $value
        return $true
    } catch {
        return $false
    }
}

# WIA keeps the scan rectangle in pixels.  Several flatbed drivers (including
# Canon MF3010) remember a previous preview/crop rectangle, so a direct
# Transfer() can otherwise return only the top half of the physical sheet.
function Set-WiaExtent($item, [int]$propertyId, [int]$requestedValue) {
    $property = Get-WiaProperty $item $propertyId
    if($null -eq $property) { return 0 }
    $candidate = [int]$requestedValue
    try {
        $minimum = [int]$property.SubTypeMin
        $maximum = [int]$property.SubTypeMax
        $step = [int]$property.SubTypeStep
        if($maximum -gt 0) { $candidate = [Math]::Min($candidate, $maximum) }
        $candidate = [Math]::Max($candidate, $minimum)
        if($step -gt 1) {
            $candidate = $minimum + ([Math]::Floor(($candidate - $minimum) / $step) * $step)
        }
    } catch { }
    try {
        $property.Value = [int]$candidate
        return [int]$property.Value
    } catch {
        return 0
    }
}

$manager = New-Object -ComObject WIA.DeviceManager
$selectedInfo = $null
foreach($info in @($manager.DeviceInfos)) {
    if([int]$info.Type -ne 1) { continue }
    if(-not $selectedInfo) { $selectedInfo = $info }
    if([string]$info.DeviceID -eq $selectedId) { $selectedInfo = $info; break }
}
if(-not $selectedInfo) { throw 'Aucun scanner WIA détecté.' }

$device = $selectedInfo.Connect()
if(-not $device -or $device.Items.Count -lt 1) { throw 'Le scanner WIA ne fournit aucune source de numérisation.' }
$item = $device.Items.Item(1)
Set-WiaProperty $item 6146 1
Set-WiaProperty $item 6147 $resolution
Set-WiaProperty $item 6148 $resolution

# Reset the persisted crop origin and request a complete portrait A4 page.
# Property IDs: 6149 XPOS, 6150 YPOS, 6151 XEXTENT, 6152 YEXTENT.
Set-WiaProperty $item 6149 0
Set-WiaProperty $item 6150 0
$a4Width = [int][Math]::Round(8.27 * $resolution)
$a4Height = [int][Math]::Round(11.69 * $resolution)
$actualWidth = Set-WiaExtent $item 6151 $a4Width
$actualHeight = Set-WiaExtent $item 6152 $a4Height

# Try the extent once more after both axes have been set; a few WIA drivers
# recalculate the second property's valid range when the first one changes.
if($actualWidth -le 0) { $actualWidth = Set-WiaExtent $item 6151 $a4Width }
if($actualHeight -le 0) { $actualHeight = Set-WiaExtent $item 6152 $a4Height }

$png = '{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}'
$jpeg = '{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}'
$bmp = '{B96B3CAB-0728-11D3-9D7B-0000F81EF32E}'
$image = $null
$errors = New-Object System.Collections.Generic.List[string]

# Most WIA drivers support direct JPEG transfer. Some Canon drivers prefer PNG.
try { $image = $item.Transfer($jpeg) } catch { $errors.Add($_.Exception.Message) }
if(-not $image) {
    try { $image = $item.Transfer($png) } catch { $errors.Add($_.Exception.Message) }
}

# Driver-specific fallback: first transfer the selected item with the WIA
# progress dialog, then show the full Windows acquisition UI if necessary.
if(-not $image) {
    $dialog = New-Object -ComObject WIA.CommonDialog
    try { $image = $dialog.ShowTransfer($item, $jpeg, $false) } catch { $errors.Add($_.Exception.Message) }
}
if(-not $image) {
    if(-not $dialog) { $dialog = New-Object -ComObject WIA.CommonDialog }
    try {
        $image = $dialog.ShowAcquireImage(1, 1, 131072, $jpeg, $true, $true, $false)
    } catch {
        $errors.Add($_.Exception.Message)
    }
}
if(-not $image) {
    $details = ($errors | Where-Object { $_ } | Select-Object -Unique) -join ' | '
    if($details) { throw ("Le scanner n'a retourné aucune image. " + $details) }
    throw "Le scanner n'a retourné aucune image. Vérifiez le document et confirmez la fenêtre WIA."
}

$actual = [string]$image.FormatID
if($actual -ne $png -and $actual -ne $jpeg -and $actual -ne $bmp) {
    try {
        $processor = New-Object -ComObject WIA.ImageProcess
        $processor.Filters.Add($processor.FilterInfos.Item('Convert').FilterID)
        $processor.Filters.Item(1).Properties.Item('FormatID').Value = $jpeg
        $image = $processor.Apply($image)
        $actual = $jpeg
    } catch { }
}

$extension = 'jpg'
$mime = 'image/jpeg'
if($actual -eq $png) { $extension = 'png'; $mime = 'image/png' }
elseif($actual -eq $bmp) { $extension = 'bmp'; $mime = 'image/bmp' }
$outputPath = Join-Path $outputDir ("scan." + $extension)
if(Test-Path $outputPath) { Remove-Item -LiteralPath $outputPath -Force }
$image.SaveFile($outputPath)
if(-not (Test-Path $outputPath)) { throw "Le fichier scanne n'a pas ete cree." }

[ordered]@{ path = $outputPath; mime = $mime; filename = ("scan-" + [DateTimeOffset]::Now.ToUnixTimeMilliseconds() + "." + $extension) } | ConvertTo-Json -Compress
} catch {
    [Console]::Error.WriteLine("PP_WIA_ERROR: " + $_.Exception.Message)
    exit 1
}
"""


def parse_json_output(output: str) -> dict:
    start = output.find("{")
    end = output.rfind("}")
    if start < 0 or end < start:
        raise RuntimeError(output or "Réponse scanner invalide.")
    return json.loads(output[start : end + 1])


def list_windows_scanners() -> list[dict]:
    data = parse_json_output(run_powershell(WINDOWS_LIST_SCRIPT, timeout=25))
    rows = data.get("scanners", [])
    if isinstance(rows, dict):
        rows = [rows]
    return rows if isinstance(rows, list) else []


def list_windows_network_printers() -> list[dict]:
    try:
        data = parse_json_output(run_powershell(WINDOWS_NETWORK_PRINTERS_SCRIPT, timeout=25))
    except Exception as error:
        logging.debug("Windows network printer inventory failed: %s", error)
        return []
    rows = data.get("printers", [])
    if isinstance(rows, dict):
        rows = [rows]
    return rows if isinstance(rows, list) else []


def _device_tokens(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9]+", unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode().lower())
        if token not in {"scanner", "printer", "series", "driver", "twain", "wia", "airscan", "escl", "bizhub"}
    }


def _same_physical_device(first: str, second: str) -> bool:
    left = _device_tokens(first)
    right = _device_tokens(second)
    if not left or not right:
        return False
    if left == right or left.issubset(right) or right.issubset(left):
        return True
    shared = left & right
    model_match = any(any(char.isdigit() for char in token) for token in shared)
    return model_match and len(shared) >= 2


def _matching_network_printer(device_name: str, printers: list[dict]) -> dict | None:
    for printer in printers:
        candidates = [str(printer.get("name") or ""), str(printer.get("driver") or "")]
        if any(_same_physical_device(device_name, candidate) for candidate in candidates if candidate):
            return printer
    return None


def list_naps2_scanners(drivers: tuple[str, ...], network_printers: list[dict] | None = None) -> list[dict]:
    rows: list[dict] = []
    network_printers = network_printers or []
    discovered: dict[str, list[str]] = {}
    threads = [
        threading.Thread(
            target=lambda selected_driver=driver: discovered.__setitem__(selected_driver, list_naps2_devices(selected_driver)),
            daemon=True,
        )
        for driver in drivers
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=13)
    for driver in drivers:
        for name in discovered.get(driver, []):
            matched_printer = _matching_network_printer(name, network_printers)
            is_network = driver == "escl" or matched_printer is not None
            address = str((matched_printer or {}).get("address") or "")
            rows.append(
                {
                    "id": _naps2_device_id(driver, name),
                    "name": name,
                    "vendor": "",
                    "backend": f"NAPS2 {driver.upper()}",
                    "connection": "network" if is_network else "local",
                    "network": is_network,
                    **({"address": address} if address else {}),
                }
            )
    return rows


def _merge_scanner_rows(*groups: list[dict]) -> list[dict]:
    merged: list[dict] = []
    for group in groups:
        for row in group:
            row_id = str(row.get("id") or "")
            row_name = str(row.get("name") or row_id)
            if any(
                row_id == str(existing.get("id") or "")
                or _same_physical_device(row_name, str(existing.get("name") or existing.get("id") or ""))
                for existing in merged
            ):
                continue
            merged.append(row)
    return merged


def scan_windows(device_id: str, resolution: int) -> tuple[bytes, str, str]:
    with tempfile.TemporaryDirectory(prefix="pause-plate-scan-") as temp_dir:
        output = run_powershell(
            WINDOWS_SCAN_SCRIPT,
            extra_env={
                "PP_SCANNER_DEVICE_ID": device_id,
                "PP_SCANNER_OUTPUT_DIR": temp_dir,
                "PP_SCANNER_RESOLUTION": str(resolution),
            },
            timeout=240,
        )
        data = parse_json_output(output)
        path = Path(str(data.get("path", "")))
        if not path.is_file() or path.stat().st_size <= 0:
            raise RuntimeError("Le scanner WIA n’a retourné aucun fichier.")
        return path.read_bytes(), str(data.get("mime") or "image/jpeg"), str(data.get("filename") or path.name)


def _local_url_open(request: urllib.request.Request, timeout: int = 20):
    context = ssl._create_unverified_context() if request.full_url.lower().startswith("https://") else None
    return urllib.request.urlopen(request, timeout=timeout, context=context)


def _escl_ticket(resolution: int, mode: str, image_format: str, source: str) -> bytes:
    color_mode = "Grayscale8" if str(mode).lower().startswith("gray") else "RGB24"
    # eSCL ScanRegion dimensions use 1/300 inch units, independently of DPI.
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<scan:ScanSettings xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03"
 xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">
  <pwg:Version>2.0</pwg:Version>
  <pwg:ScanRegions><pwg:ScanRegion>
    <pwg:Height>3508</pwg:Height><pwg:Width>2480</pwg:Width>
    <pwg:XOffset>0</pwg:XOffset><pwg:YOffset>0</pwg:YOffset>
  </pwg:ScanRegion></pwg:ScanRegions>
  <pwg:InputSource>{source}</pwg:InputSource>
  <scan:ColorMode>{color_mode}</scan:ColorMode>
  <scan:XResolution>{resolution}</scan:XResolution>
  <scan:YResolution>{resolution}</scan:YResolution>
  <pwg:DocumentFormat>{image_format}</pwg:DocumentFormat>
  <scan:DocumentFormatExt>{image_format}</scan:DocumentFormatExt>
</scan:ScanSettings>""".encode("utf-8")


def _image_from_escl_response(content: bytes, content_type: str) -> tuple[bytes, str]:
    media_type = str(content_type or "").split(";", 1)[0].strip().lower()
    if media_type.startswith("image/") and content:
        return content, media_type
    if media_type.startswith("multipart/"):
        message = email.message_from_bytes(
            f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode("ascii", errors="ignore")
            + content
        )
        for part in message.walk():
            part_type = str(part.get_content_type() or "").lower()
            payload = part.get_payload(decode=True)
            if part_type.startswith("image/") and payload:
                return payload, part_type
    if content.startswith(b"\xff\xd8\xff"):
        return content, "image/jpeg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return content, "image/png"
    raise RuntimeError("Le scanner réseau n'a pas retourné une image compatible.")


def scan_escl(device_id: str, resolution: int, mode: str) -> tuple[bytes, str, str]:
    if not str(device_id).startswith("escl:"):
        raise RuntimeError("Adresse AirScan/eSCL invalide.")
    base_url = str(device_id)[len("escl:") :].rstrip("/")
    parsed = urllib.parse.urlparse(base_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise RuntimeError("Adresse du scanner réseau invalide.")
    resolution = max(75, min(int(resolution or 300), 600))
    jobs_url = f"{base_url}/ScanJobs"
    errors: list[str] = []

    # Platen/JPEG is preferred for invoices. PNG and ADF are compatibility
    # fallbacks for devices that expose only one format or input source.
    attempts = [
        ("Platen", "image/jpeg"),
        ("Platen", "image/png"),
        ("Feeder", "image/jpeg"),
        ("Feeder", "image/png"),
    ]
    for source, image_format in attempts:
        job_url = ""
        try:
            request = urllib.request.Request(
                jobs_url,
                data=_escl_ticket(resolution, mode, image_format, source),
                method="POST",
                headers={
                    "Content-Type": "text/xml; charset=utf-8",
                    "Accept": "text/xml, application/xml, */*",
                    "User-Agent": f"PausePlateScannerBridge/{VERSION}",
                },
            )
            with _local_url_open(request, timeout=35) as response:
                location = str(response.headers.get("Location") or "").strip()
                if not location:
                    raise RuntimeError("Le scanner réseau n'a pas créé de tâche de scan.")
                job_url = urllib.parse.urljoin(jobs_url + "/", location)

            document_url = job_url.rstrip("/") + "/NextDocument"
            document_request = urllib.request.Request(
                document_url,
                method="GET",
                headers={
                    "Accept": "image/jpeg, image/png, multipart/related, */*",
                    "User-Agent": f"PausePlateScannerBridge/{VERSION}",
                },
            )
            with _local_url_open(document_request, timeout=240) as response:
                raw = response.read()
                content, mime = _image_from_escl_response(raw, str(response.headers.get("Content-Type") or ""))
            extension = "png" if mime == "image/png" else "jpg"
            return content, mime, f"scan-reseau-{int(time.time() * 1000)}.{extension}"
        except urllib.error.HTTPError as error:
            detail = ""
            try:
                detail = error.read(300).decode("utf-8", errors="replace").strip()
            except Exception:
                pass
            errors.append(f"{source}/{image_format}: HTTP {error.code} {detail}".strip())
        except Exception as error:
            errors.append(f"{source}/{image_format}: {error}")
        finally:
            if job_url:
                try:
                    delete_request = urllib.request.Request(job_url, method="DELETE")
                    with _local_url_open(delete_request, timeout=8):
                        pass
                except Exception:
                    pass
    raise RuntimeError(next((error for error in reversed(errors) if error), "Échec du scan réseau AirScan/eSCL."))


def list_sane_scanners() -> list[dict]:
    command = scanimage_path()
    if not command:
        raise RuntimeError("SANE/scanimage n’est pas installé. Sur Mac, lancez INSTALLER-MAC.command.")

    formatted = subprocess.run(
        [command, "-f", "%d|||%v|||%m|||%t%n"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=20,
        check=False,
    )
    output = decode_process_output(formatted.stdout)
    scanners: list[dict] = []
    for line in output.splitlines():
        parts = [part.strip() for part in line.split("|||")]
        if len(parts) < 4 or not parts[0]:
            continue
        device_id, vendor, model, kind = parts[:4]
        scanners.append(
            {
                "id": device_id,
                "name": " ".join(part for part in (vendor, model) if part).strip() or device_id,
                "vendor": vendor,
                "model": model,
                "type": kind,
                "backend": "SANE",
            }
        )

    if scanners:
        return scanners

    fallback = subprocess.run(
        [command, "-L"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20, check=False
    )
    fallback_text = decode_process_output(fallback.stdout)
    for line in fallback_text.splitlines():
        match = re.search(r"device [`']([^`']+)[`'] is a (.+)", line, re.IGNORECASE)
        if match:
            scanners.append(
                {"id": match.group(1), "name": match.group(2).strip(), "vendor": "", "backend": "SANE"}
            )
    return scanners


def scan_sane(device_id: str, resolution: int, mode: str) -> tuple[bytes, str, str]:
    command = scanimage_path()
    if not command:
        raise RuntimeError("SANE/scanimage n’est pas installé.")
    resolution = max(75, min(int(resolution or 300), 600))
    normalized_mode = "Gray" if str(mode).lower().startswith("gray") else "Color"
    attempts = [
        [command, "--device-name", device_id, "--format=png", "--resolution", str(resolution), "--mode", normalized_mode],
        [command, "--device-name", device_id, "--format=png", "--resolution", str(resolution)],
        [command, "--device-name", device_id, "--format=png"],
    ]
    errors: list[str] = []
    for args in attempts:
        with tempfile.NamedTemporaryFile(prefix="pause-plate-scan-", suffix=".png", delete=False) as output_file:
            output_path = Path(output_file.name)
            process = subprocess.run(
                args,
                stdout=output_file,
                stderr=subprocess.PIPE,
                timeout=240,
                check=False,
            )
        try:
            if process.returncode == 0 and output_path.is_file() and output_path.stat().st_size > 0:
                return output_path.read_bytes(), "image/png", f"scan-{int(time.time() * 1000)}.png"
            errors.append(decode_process_output(process.stderr))
        finally:
            output_path.unlink(missing_ok=True)
    raise RuntimeError(next((error for error in reversed(errors) if error), "Échec de la numérisation SANE."))


def list_scanners() -> tuple[list[dict], str]:
    if MOCK_FILE:
        return ([{"id": "mock-1", "name": "Scanner de test", "vendor": "Pause & Plate", "backend": "MOCK"}], "MOCK")
    network_rows = discover_escl_scanners()
    if platform.system().lower() == "windows":
        try:
            local_rows = list_windows_scanners()
        except Exception as error:
            logging.warning("WIA discovery failed: %s", error)
            local_rows = []
        printer_rows = list_windows_network_printers()
        universal_rows = list_naps2_scanners(("twain", "escl"), printer_rows)
        rows = _merge_scanner_rows(local_rows, network_rows, universal_rows)
        backends = ["WIA"]
        if network_rows:
            backends.append("AirScan/eSCL")
        if universal_rows:
            backends.append("NAPS2 TWAIN/eSCL")
        return rows, " + ".join(backends)
    try:
        local_rows = list_sane_scanners()
    except Exception as error:
        logging.warning("SANE discovery failed: %s", error)
        local_rows = []
    universal_rows = list_naps2_scanners(("apple", "escl")) if platform.system().lower() == "darwin" else []
    rows = _merge_scanner_rows(local_rows, network_rows, universal_rows)
    backends = ["SANE"]
    if network_rows:
        backends.append("AirScan/eSCL")
    if universal_rows:
        backends.append("NAPS2 Apple/eSCL")
    return rows, " + ".join(backends)


def scanner_status() -> dict:
    backend = "WIA" if platform.system().lower() == "windows" else "SANE"
    try:
        scanners, backend = list_scanners()
        if not scanners:
            return {
                "ready": False,
                "platform": platform_label(),
                "backend": backend,
                "scanners": [],
                "message": "Aucun scanner détecté. Vérifiez le câble USB ou le réseau local, l’alimentation et le pilote.",
            }
        return {
            "ready": True,
            "platform": platform_label(),
            "backend": backend,
            "scanners": scanners,
            "message": f"{len(scanners)} scanner(s) prêt(s).",
        }
    except Exception as error:  # hardware and driver errors are returned to the UI
        logging.warning("Scanner status: %s", error)
        return {
            "ready": False,
            "platform": platform_label(),
            "backend": backend,
            "scanners": [],
            "message": str(error),
        }


def scan_file(device_id: str, resolution: int, mode: str) -> tuple[bytes, str, str]:
    if MOCK_FILE:
        if not MOCK_FILE.is_file():
            raise RuntimeError("Le fichier de test est introuvable.")
        mime = mimetypes.guess_type(MOCK_FILE.name)[0] or "image/png"
        return MOCK_FILE.read_bytes(), mime, MOCK_FILE.name
    if str(device_id).startswith("naps2:"):
        return scan_naps2(device_id, resolution, mode)
    if str(device_id).startswith("escl:"):
        return scan_escl(device_id, resolution, mode)
    if platform.system().lower() == "windows":
        return scan_windows(device_id, resolution)
    return scan_sane(device_id, resolution, mode)


class ScannerBridgeHandler(BaseHTTPRequestHandler):
    server_version = f"PausePlateScannerBridge/{VERSION}"

    def log_message(self, fmt: str, *args: object) -> None:
        logging.info("%s - %s", self.address_string(), fmt % args)

    def _origin(self) -> str | None:
        return self.headers.get("Origin")

    def _check_origin(self) -> bool:
        if allowed_origin(self._origin()):
            return True
        self._send_json(HTTPStatus.FORBIDDEN, {"error": "Origine web non autorisée."}, include_cors=False)
        return False

    def _cors_headers(self) -> None:
        origin = self._origin()
        self.send_header("Access-Control-Allow-Origin", origin if origin else "*")
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Accept")
        self.send_header("Access-Control-Expose-Headers", "X-PausePlate-Filename, Content-Disposition, Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        self.send_header("Cache-Control", "no-store")

    def _send_json(self, status: int, payload: dict | list, *, include_cors: bool = True) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        if include_cors:
            self._cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        if not self._check_origin():
            return
        self.send_response(HTTPStatus.NO_CONTENT)
        self._cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if not self._check_origin():
            return
        path = urlparse(self.path).path
        if path == "/health":
            self._send_json(HTTPStatus.OK, {"version": VERSION, **scanner_status()})
            return
        if path == "/scanners":
            status = scanner_status()
            self._send_json(HTTPStatus.OK, status)
            return
        self._send_json(HTTPStatus.NOT_FOUND, {"error": "Route inconnue."})

    def do_POST(self) -> None:  # noqa: N802
        if not self._check_origin():
            return
        if urlparse(self.path).path != "/scan-file":
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Route inconnue."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 0 or length > 65536:
                raise ValueError("Requête trop volumineuse.")
            payload = json.loads(self.rfile.read(length) or b"{}")
        except Exception as error:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": f"Requête invalide : {error}"})
            return

        if not SCAN_LOCK.acquire(blocking=False):
            self._send_json(HTTPStatus.CONFLICT, {"error": "Une numérisation est déjà en cours."})
            return
        try:
            scanners, backend = list_scanners()
            if not scanners:
                raise RuntimeError("Aucun scanner détecté.")
            requested = str(payload.get("device_id") or payload.get("scanner_id") or "")
            selected = next((scanner for scanner in scanners if str(scanner.get("id")) == requested), scanners[0])
            resolution = max(75, min(int(payload.get("resolution") or 300), 600))
            mode = str(payload.get("mode") or "Color")
            logging.info("Scanning with %s (%s), %sdpi", selected.get("name"), backend, resolution)
            content, mime, filename = scan_file(str(selected.get("id", "")), resolution, mode)
            if not content:
                raise RuntimeError("Le scanner n’a retourné aucune image.")
            self.send_response(HTTPStatus.OK)
            self._cors_headers()
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(content)))
            header_filename = safe_header_filename(filename)
            self.send_header("X-PausePlate-Filename", header_filename)
            self.send_header("Content-Disposition", f'inline; filename="{header_filename}"')
            self.end_headers()
            self.wfile.write(content)
        except subprocess.TimeoutExpired:
            self._send_json(HTTPStatus.GATEWAY_TIMEOUT, {"error": "Le scanner a dépassé le délai d’attente."})
        except Exception as error:
            logging.exception("Scan failed")
            self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})
        finally:
            SCAN_LOCK.release()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Pause & Plate Scanner Bridge")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--mock-file", type=Path, default=None, help=argparse.SUPPRESS)
    return parser.parse_args()


def main() -> int:
    global MOCK_FILE
    args = parse_args()
    MOCK_FILE = args.mock_file.resolve() if args.mock_file else None
    configure_logging()
    if args.host not in {"127.0.0.1", "localhost", "::1"}:
        raise SystemExit("Le Bridge doit rester lié à l’adresse locale 127.0.0.1.")
    server = ThreadingHTTPServer((args.host, args.port), ScannerBridgeHandler)
    logging.info("Listening on http://%s:%s", args.host, args.port)
    try:
        server.serve_forever(poll_interval=0.3)
    except KeyboardInterrupt:
        logging.info("Bridge stopped by user")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
