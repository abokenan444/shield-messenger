@echo off
echo %* | findstr /C:"--build" >nul
if %errorlevel%==0 (
    cmake %*
) else (
    cmake -DANDROID_ABI=arm64-v8a -DANDROID_PLATFORM=android-26 %*
)
