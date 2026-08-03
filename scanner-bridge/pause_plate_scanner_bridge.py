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
import html
import json
import logging
import mimetypes
import os
import platform
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import unicodedata
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


VERSION = "2.0.4"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 17891
SCAN_LOCK = threading.Lock()
MOCK_FILE: Path | None = None

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
    foreach($prop in @($info.Properties)) {
        if([int]$prop.PropertyID -eq 7) { $name = [string]$prop.Value }
        if([int]$prop.PropertyID -eq 3) { $vendor = [string]$prop.Value }
    }
    if([string]::IsNullOrWhiteSpace($name)) { $name = "Scanner $index" }
    $rows += [ordered]@{
        id = [string]$info.DeviceID
        name = $name
        vendor = $vendor
        backend = 'WIA'
    }
}
[ordered]@{ scanners = $rows } | ConvertTo-Json -Depth 5 -Compress
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
    if platform.system().lower() == "windows":
        return list_windows_scanners(), "WIA"
    return list_sane_scanners(), "SANE"


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
                "message": "Aucun scanner détecté. Vérifiez le câble, l’alimentation et le pilote.",
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
