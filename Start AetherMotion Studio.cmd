@echo off
rem STUDIO-01 double-click launcher: local Studio with the render settings from docs/continuity/LOCAL_DEVELOPMENT.md.
rem It changes nothing on the system: the settings below apply only to this window.
setlocal
cd /d "%~dp0"
title AetherMotion Studio

rem Already running? Just open it.
curl.exe -s -o nul http://127.0.0.1:4173/ && (start "" http://127.0.0.1:4173 & exit /b 0)

set "PYTHON=%~dp0.venv\Scripts\python.exe"
set "AETHER_FFMPEG=%~dp0.venv\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
set "AETHER_FFPROBE=%~dp0node_modules\@remotion\compositor-win32-x64-msvc\ffprobe.exe"
rem vulkan renders Three.js films on the NVIDIA RTX (owner preference); the repository default stays swangle.
set "AETHER_GL=vulkan"
set "AETHER_CONCURRENCY=8"

for %%F in ("%PYTHON%" "%AETHER_FFMPEG%" "%AETHER_FFPROBE%") do if not exist "%%~F" (
  echo Missing %%~F
  echo Run the setup in docs\continuity\LOCAL_DEVELOPMENT.md first.
  pause
  exit /b 1
)

rem Open the browser once the server has had a moment to start.
start "" /b cmd /c "timeout /t 3 /nobreak >nul & start "" http://127.0.0.1:4173"
echo AetherMotion Studio: http://127.0.0.1:4173  (keep this window open; close it to stop the Studio)
call npm run studio:local
pause
