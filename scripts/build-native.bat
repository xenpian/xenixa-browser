@echo off
echo Building native modules...
call npm run build-native
if %errorlevel% neq 0 (
    echo Build failed!
    exit /b 1
)
echo Build successful!
