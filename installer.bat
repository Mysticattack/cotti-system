@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Cotti System – Installer

:: ============================================================
:: Cotti System – Windows Installer
:: Muss als Administrator gestartet werden!
:: ============================================================

:: ── Admin-Prüfung ────────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ╔══════════════════════════════════════════════════╗
    echo  ║   FEHLER: Bitte als Administrator starten!       ║
    echo  ║   Rechtsklick auf installer.bat → Als Admin      ║
    echo  ╚══════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)

cls
echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║          Cotti System – Windows Installer            ║
echo  ║   Installiert alle Abhängigkeiten automatisch        ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Folgendes wird installiert:
echo    [1] winget (falls nicht vorhanden)
echo    [2] Git
echo    [3] Node.js LTS (^>=18)
echo    [4] Python 3.11
echo    [5] ffmpeg
echo    [6] Ollama (Windows-Version)
echo    [7] WSL2 + Ubuntu
echo    [8] Cotti System Repo klonen
echo    [9] npm install + Python venv + Pakete
echo   [10] .env Datei konfigurieren
echo.
echo  ⚠️  WSL2 erfordert möglicherweise einen Neustart.
echo.
pause

:: ── Installationsordner festlegen ────────────────────────────
set "INSTALL_DIR=%USERPROFILE%\cotti-system"
set "REPO_URL=https://github.com/cotti1234/cotti-system.git"
set "REPO_BRANCH=stable"

echo.
echo ━━━ 1/9 · winget prüfen ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
winget --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  ➜  winget nicht gefunden – wird über Microsoft Store aktiviert...
    echo  ℹ️  Öffne: ms-windows-store://pdp/?productid=9NBLGGH4NNS1
    start ms-windows-store://pdp/?productid=9NBLGGH4NNS1
    echo.
    echo  Bitte winget (App-Installer) im Store installieren,
    echo  danach dieses Fenster schließen und installer.bat erneut starten.
    pause
    exit /b 1
) else (
    echo  ✅ winget vorhanden
)

:: ── Git ─────────────────────────────────────────────────────
echo.
echo ━━━ 2/9 · Git ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  ➜  Git installieren...
    winget install --id Git.Git -e --source winget --silent --accept-source-agreements --accept-package-agreements
    if %errorlevel% neq 0 (
        echo  ❌ Git Installation fehlgeschlagen!
        pause
        exit /b 1
    )
    :: PATH neu laden
    set "PATH=%PATH%;C:\Program Files\Git\cmd"
    echo  ✅ Git installiert
) else (
    echo  ✅ Git bereits vorhanden
)

:: ── Node.js ─────────────────────────────────────────────────
echo.
echo ━━━ 3/9 · Node.js LTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  ➜  Node.js installieren...
    winget install --id OpenJS.NodeJS.LTS -e --source winget --silent --accept-source-agreements --accept-package-agreements
    if %errorlevel% neq 0 (
        echo  ❌ Node.js Installation fehlgeschlagen!
        pause
        exit /b 1
    )
    set "PATH=%PATH%;C:\Program Files\nodejs"
    echo  ✅ Node.js installiert
) else (
    echo  ✅ Node.js bereits vorhanden
)

:: ── Python ──────────────────────────────────────────────────
echo.
echo ━━━ 4/9 · Python 3.11 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  ➜  Python installieren...
    winget install --id Python.Python.3.11 -e --source winget --silent --accept-source-agreements --accept-package-agreements
    if %errorlevel% neq 0 (
        echo  ❌ Python Installation fehlgeschlagen!
        pause
        exit /b 1
    )
    set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts"
    echo  ✅ Python installiert
) else (
    echo  ✅ Python bereits vorhanden
)

:: ── ffmpeg ──────────────────────────────────────────────────
echo.
echo ━━━ 5/9 · ffmpeg ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo  ➜  ffmpeg installieren...
    winget install --id Gyan.FFmpeg -e --source winget --silent --accept-source-agreements --accept-package-agreements
    if %errorlevel% neq 0 (
        echo  ⚠️  ffmpeg Installation fehlgeschlagen – Sprachnachrichten nicht verfügbar.
        echo     Manuell: https://ffmpeg.org/download.html
    ) else (
        echo  ✅ ffmpeg installiert
    )
) else (
    echo  ✅ ffmpeg bereits vorhanden
)

:: ── Ollama ──────────────────────────────────────────────────
echo.
echo ━━━ 6/9 · Ollama (KI-Engine) ━━━━━━━━━━━━━━━━━━━━━━━━━━
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo  ➜  Ollama installieren...
    winget install --id Ollama.Ollama -e --source winget --silent --accept-source-agreements --accept-package-agreements
    if %errorlevel% neq 0 (
        echo  ➜  winget fehlgeschlagen – direkter Download...
        set "OLLAMA_INSTALLER=%TEMP%\OllamaSetup.exe"
        powershell -Command "Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile '!OLLAMA_INSTALLER!'"
        "!OLLAMA_INSTALLER!" /S
        if %errorlevel% neq 0 (
            echo  ❌ Ollama Installation fehlgeschlagen!
            pause
            exit /b 1
        )
    )
    set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Ollama"
    echo  ✅ Ollama installiert
) else (
    echo  ✅ Ollama bereits vorhanden
)

:: llama3 Modell herunterladen
echo  ➜  llama3 Modell laden (~4.7 GB – bitte warten)...
echo     (Kann einige Minuten dauern – nicht abbrechen!)
start /B ollama serve >nul 2>&1
timeout /t 3 /nobreak >nul
ollama pull llama3
if %errorlevel% equ 0 (
    echo  ✅ llama3 Modell geladen
) else (
    echo  ⚠️  llama3 Download fehlgeschlagen – später manuell: ollama pull llama3
)

:: ── WSL2 ────────────────────────────────────────────────────
echo.
echo ━━━ 7/9 · WSL2 + Ubuntu ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
wsl --status >nul 2>&1
if %errorlevel% neq 0 (
    echo  ➜  WSL2 aktivieren...
    dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart >nul
    dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart >nul
    echo  ➜  WSL2 als Standard setzen...
    wsl --set-default-version 2 >nul 2>&1
    echo  ➜  Ubuntu installieren...
    wsl --install -d Ubuntu --no-launch
    echo.
    echo  ⚠️  WSL2 wurde aktiviert.
    echo     WICHTIG: System nach diesem Installer neu starten!
    echo     Danach Ubuntu einmal öffnen (Benutzername + Passwort setzen).
    set "WSL_NEEDS_REBOOT=1"
) else (
    echo  ✅ WSL2 bereits aktiv
    set "WSL_NEEDS_REBOOT=0"
)

:: ── Repo klonen ─────────────────────────────────────────────
echo.
echo ━━━ 8/9 · Cotti System klonen ━━━━━━━━━━━━━━━━━━━━━━━━━
if exist "%INSTALL_DIR%\.git" (
    echo  ✅ Repo bereits vorhanden – aktualisiere...
    git -C "%INSTALL_DIR%" fetch origin
    git -C "%INSTALL_DIR%" checkout %REPO_BRANCH%
    git -C "%INSTALL_DIR%" pull origin %REPO_BRANCH%
) else (
    echo  ➜  Repo klonen nach %INSTALL_DIR%...
    git clone --branch %REPO_BRANCH% %REPO_URL% "%INSTALL_DIR%"
    if %errorlevel% neq 0 (
        echo  ❌ Repo klonen fehlgeschlagen! Prüfe Internetverbindung.
        pause
        exit /b 1
    )
    echo  ✅ Repo geklont
)

:: ── npm install + Python-Pakete ─────────────────────────────
echo.
echo ━━━ 9/9 · Abhängigkeiten installieren ━━━━━━━━━━━━━━━━━
echo  ➜  npm install...
call npm install --prefix "%INSTALL_DIR%" --silent
if %errorlevel% neq 0 (
    echo  ❌ npm install fehlgeschlagen!
    pause
    exit /b 1
)
echo  ✅ Node.js Pakete installiert

:: Python venv + whisper + edge-tts
echo  ➜  Python venv erstellen...
python -m venv "%INSTALL_DIR%\venv"
echo  ➜  openai-whisper + edge-tts installieren (kann dauern)...
"%INSTALL_DIR%\venv\Scripts\pip" install openai-whisper edge-tts --quiet
if %errorlevel% equ 0 (
    echo  ✅ Python Pakete installiert
) else (
    echo  ⚠️  Python Pakete teilweise fehlgeschlagen – manuell prüfen
)

:: ── .env konfigurieren ──────────────────────────────────────
echo.
echo ━━━ .env Konfiguration ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if not exist "%INSTALL_DIR%\.env" (
    copy "%INSTALL_DIR%\.env.example" "%INSTALL_DIR%\.env" >nul
    echo  ✅ .env angelegt
)

echo.
echo  Discord Bot Token eingeben:
echo  (Erstellen: https://discord.com/developers/applications)
echo  (Enter überspringen – später in .env eintragen)
echo.
set /p "DISCORD_TOKEN=  Token: "

if not "!DISCORD_TOKEN!"=="" (
    powershell -Command "(Get-Content '%INSTALL_DIR%\.env') -replace 'DISCORD_TOKEN=.*', 'DISCORD_TOKEN=!DISCORD_TOKEN!' | Set-Content '%INSTALL_DIR%\.env'"
    echo  ✅ Discord Token gespeichert
) else (
    echo  ⚠️  Später eintragen: %INSTALL_DIR%\.env
)

:: ── Abschluss ────────────────────────────────────────────────
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║           Setup erfolgreich abgeschlossen!               ║
echo  ╠══════════════════════════════════════════════════════════╣
echo  ║                                                          ║
echo  ║  Bot starten:                                            ║
echo  ║    cd %USERPROFILE%\cotti-system                         ║
echo  ║    npm start                                             ║
echo  ║                                                          ║
echo  ║  WhatsApp: QR-Code im Terminal scannen                   ║
echo  ║  Discord:  Token in .env prüfen                          ║
echo  ║                                                          ║
echo  ║  Installationsordner:                                    ║
echo  ║    %USERPROFILE%\cotti-system                            ║
echo  ║                                                          ║

if defined WSL_NEEDS_REBOOT if "!WSL_NEEDS_REBOOT!"=="1" (
echo  ║  ⚠️  NEUSTART ERFORDERLICH für WSL2!                     ║
echo  ║     Danach Ubuntu öffnen und Benutzer einrichten.        ║
echo  ║                                                          ║
)

echo  ╚══════════════════════════════════════════════════════════╝
echo.

if defined WSL_NEEDS_REBOOT if "!WSL_NEEDS_REBOOT!"=="1" (
    echo  Jetzt neu starten? (J/N)
    set /p "REBOOT_NOW=  "
    if /i "!REBOOT_NOW!"=="J" (
        shutdown /r /t 10 /c "Cotti System: WSL2 Aktivierung – Neustart in 10 Sekunden"
        echo  ➜  Neustart in 10 Sekunden...
    )
)

pause
endlocal
