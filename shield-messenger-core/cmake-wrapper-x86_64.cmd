@echo off
echo %* | findstr /C:"--build" >nul
if %errorlevel%==0 (
    cmake %*
) else (
    cmake -DANDROID_ABI=x86_64 -DANDROID_PLATFORM=android-26 %*
)
