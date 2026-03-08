@echo off
echo %* | findstr /C:"--build" >nul
if %errorlevel%==0 (
    cmake %*
) else (
    cmake -DANDROID_ABI=armeabi-v7a -DANDROID_PLATFORM=android-26 %*
)
