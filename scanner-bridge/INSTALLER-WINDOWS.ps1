$ErrorActionPreference = "Stop"

Write-Host "==============================================" -ForegroundColor DarkGreen
Write-Host " Pause & Plate Scanner Bridge - Windows" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor DarkGreen
Write-Host ""

$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallDir = Join-Path $env:LOCALAPPDATA "PausePlateScanner"
$BridgeSource = Join-Path $SourceDir "pause_plate_scanner_bridge.py"
$BridgeTarget = Join-Path $InstallDir "pause_plate_scanner_bridge.py"

function Find-PythonExecutable {
    $candidates = @()
    try {
        $fromPy = & py.exe -3 -c "import sys; print(sys.executable)" 2>$null
        if ($LASTEXITCODE -eq 0 -and $fromPy) { $candidates += [string]$fromPy }
    } catch { }
    try {
        $fromPython = & python.exe -c "import sys; print(sys.executable)" 2>$null
        if ($LASTEXITCODE -eq 0 -and $fromPython) { $candidates += [string]$fromPython }
    } catch { }
    $candidates += Get-ChildItem (Join-Path $env:LOCALAPPDATA "Programs\Python\Python*\python.exe") -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
    return $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
}

$PythonExe = Find-PythonExecutable
if (-not $PythonExe) {
    $Winget = Get-Command winget.exe -ErrorAction SilentlyContinue
    if ($Winget) {
        Write-Host "Python 3 n'est pas installe. Installation automatique..." -ForegroundColor Yellow
        & winget.exe install --id Python.Python.3.12 --exact --silent --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -ne 0) { throw "L'installation de Python a echoue." }
        $PythonExe = Find-PythonExecutable
    }
}

if (-not $PythonExe) {
    throw "Python 3 est introuvable. Installez-le depuis https://www.python.org/downloads/windows/ puis relancez l'installateur."
}

if (-not (Test-Path $BridgeSource)) {
    throw "Le fichier pause_plate_scanner_bridge.py est absent du dossier de l'installateur."
}

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item -LiteralPath $BridgeSource -Destination $BridgeTarget -Force

$PythonDir = Split-Path -Parent $PythonExe
$PythonwExe = Join-Path $PythonDir "pythonw.exe"
if (-not (Test-Path $PythonwExe)) { $PythonwExe = $PythonExe }

$StartupDir = [Environment]::GetFolderPath("Startup")
$ShortcutPath = Join-Path $StartupDir "Pause Plate Scanner Bridge.lnk"
$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $PythonwExe
$Shortcut.Arguments = '"' + $BridgeTarget + '"'
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.Description = "Pause & Plate Scanner Bridge"
$Shortcut.WindowStyle = 7
$Shortcut.Save()

$existing = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -and $_.CommandLine.Contains("pause_plate_scanner_bridge.py")
}
if ($existing) {
    $existing | ForEach-Object {
        $BridgeProcessId = $_.ProcessId
        try {
            Stop-Process -Id $BridgeProcessId -Force -ErrorAction Stop
        } catch {
            Write-Host "Le Bridge actif demande une autorisation administrateur pour etre remplace." -ForegroundColor Yellow
            $ElevatedStop = Start-Process -FilePath "taskkill.exe" -Verb RunAs -ArgumentList @("/PID", [string]$BridgeProcessId, "/F") -Wait -PassThru
            if ($ElevatedStop.ExitCode -ne 0) {
                throw "Impossible d'arreter l'ancienne version du Scanner Bridge."
            }
        }
    }
    Start-Sleep -Seconds 1
}
Start-Process -FilePath $PythonwExe -ArgumentList ('"' + $BridgeTarget + '"') -WorkingDirectory $InstallDir -WindowStyle Hidden

Start-Sleep -Seconds 3
try {
    $Health = Invoke-RestMethod -Uri "http://127.0.0.1:17891/health" -Method Get -TimeoutSec 8
    $VersionLine = Get-Content -LiteralPath $BridgeTarget | Where-Object { $_ -match '^VERSION\s*=' } | Select-Object -First 1
    $ExpectedVersion = [regex]::Match([string]$VersionLine, '"([^"]+)"').Groups[1].Value
    if ($ExpectedVersion -and [string]$Health.version -ne $ExpectedVersion) {
        throw ("L'ancienne version " + $Health.version + " est encore active au lieu de " + $ExpectedVersion + ".")
    }
    Write-Host ""
    Write-Host "Scanner Bridge installe et lance avec succes." -ForegroundColor Green
    Write-Host ("Systeme: " + $Health.platform + " | Backend: " + $Health.backend)
    if ($Health.ready) {
        Write-Host ("Scanners detectes: " + $Health.scanners.Count) -ForegroundColor Green
    } else {
        Write-Host ("Bridge actif, scanner non pret: " + $Health.message) -ForegroundColor Yellow
        Write-Host "Installez le pilote WIA officiel de votre scanner, puis redemarrez le Bridge."
    }
    Write-Host "Rechargez Pause & Plate Manager puis cliquez sur Scan en temps reel."
} catch {
    Write-Host "Le Bridge est installe mais le test local n'a pas repondu." -ForegroundColor Yellow
    Write-Host ("Journal: " + (Join-Path $InstallDir "bridge.log"))
    throw
}
