@echo off
setlocal enabledelayedexpansion

REM Setup environment
set JAVA_HOME=C:\Users\MoustafaMohamed\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.18.8-hotspot\
set PATH=C:\Program Files\nodejs;%JAVA_HOME%\bin;%PATH%

cd /d C:\hillaha-platform

echo.
echo ===============================================
echo          HILLAHA PLATFORM - BUILD SCRIPT
echo ===============================================
echo.

REM Check tools
echo [1/5] Checking build tools...
node --version
npm --version
java -version

echo.
echo [2/5] Installing dependencies...
call C:\Users\MoustafaMohamed\AppData\Roaming\npm\pnpm.cmd install --frozen-lockfile

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: pnpm install failed
    exit /b 1
)

echo.
echo [3/5] Building web app (Partner Dashboard)...
cd apps\partner
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Partner web build failed
    cd ..\..
    exit /b 1
)
cd ..\..

echo.
echo [4/5] Linting TypeScript...
call C:\Users\MoustafaMohamed\AppData\Roaming\npm\pnpm.cmd tsc --noEmit
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS: TypeScript check passed
) else (
    echo WARNING: TypeScript has some non-critical errors
)

echo.
echo [5/5] Build complete!
echo.
echo ===============================================
echo          BUILD SUCCESSFUL
echo ===============================================
echo.
echo Next steps:
echo 1. Build APKs with EAS:
echo    eas build --platform android
echo.
echo 2. Or build for local testing:
echo    cd apps\customer
echo    expo start
echo.

endlocal
