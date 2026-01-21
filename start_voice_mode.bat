@echo off
echo Starting MeltingHack in Voice Mode (HTTPS)...
echo.
echo [1/2] Generating Security Certificate...
openssl req -new -x509 -keyout server.pem -out server.pem -days 365 -nodes -subj "/CN=localhost" 2>nul
if not exist server.pem (
    echo WARNING: OpenSSL not found. You might need to install Git Bash or OpenSSL.
    echo Trying to start without new certificate (hoping one exists)...
)

echo.
echo [2/2] Starting Secure Server...
echo.
echo ========================================================
echo   Server is running at: https://localhost:8000
echo.
echo   PLEASE OPEN THIS URL IN [ MICROSOFT EDGE ] BROWSER
echo   (Chrome may fail due to Google connection issues)
echo.
echo   Note: You will see a "Not Secure" warning. 
echo   Click "Advanced" -> "Continue to localhost".
echo ========================================================
echo.
python server_https.py
pause
