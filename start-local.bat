@echo off
setlocal
pushd "%~dp0"

echo.
echo === Starting AlgoRent ===
echo.

if not exist "frontend\node_modules" (
  echo ERROR: Frontend dependencies are missing. Run setup-local.bat first.
  goto :failed
)

docker info >nul 2>nul
if errorlevel 1 (
  echo ERROR: Docker Desktop is not running. Start it and try again.
  goto :failed
)

echo Starting PostgreSQL...
docker compose up -d --wait
if errorlevel 1 goto :failed

rem These values intentionally apply only to the two local development windows.
set "DB_HOST=localhost"
set "DB_PORT=5433"
set "DB_NAME=algorent"
set "DB_USER=algorent"
set "DB_PASSWORD=algorent"
set "SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/algorent?sslmode=disable"
set "CORS_ALLOWED_ORIGINS=http://localhost:3000"
set "NEXT_PUBLIC_API_URL=http://localhost:8080"
rem No email server locally: sign-up codes are printed in the backend window instead.
set "MAIL_ENABLED=false"

echo Opening backend and frontend terminals...
start "AlgoRent Backend" /D "%~dp0backend" cmd /k "call mvnw.cmd spring-boot:run"

echo Waiting for the backend and Flyway migrations...
set "BACKEND_ATTEMPTS=0"
:wait_for_backend
powershell.exe -NoProfile -Command "try { $response = Invoke-RestMethod -Uri 'http://localhost:8080/actuator/health' -TimeoutSec 2; if ($response.status -eq 'UP') { exit 0 } } catch {}; exit 1" >nul 2>nul
if not errorlevel 1 goto :backend_ready
set /a BACKEND_ATTEMPTS+=1
if %BACKEND_ATTEMPTS% GEQ 60 (
  echo ERROR: Backend did not become healthy within 60 seconds.
  echo Review the AlgoRent Backend terminal for the cause.
  goto :failed
)
timeout /t 1 /nobreak >nul
goto :wait_for_backend

:backend_ready
call seed-demo-data.bat
if errorlevel 1 goto :failed

start "AlgoRent Frontend" /D "%~dp0frontend" cmd /k "call npm.cmd run dev"

echo The website will be available at http://localhost:3000
echo The backend health check is at http://localhost:8080/actuator/health
echo New accounts: the verification code is printed in the AlgoRent Backend window.
echo Keep both new terminal windows open while reviewing the app.
echo.
echo Waiting for the frontend...
set "FRONTEND_ATTEMPTS=0"
:wait_for_frontend
powershell.exe -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000' -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto :frontend_ready
set /a FRONTEND_ATTEMPTS+=1
if %FRONTEND_ATTEMPTS% GEQ 60 (
  echo ERROR: Frontend did not become available within 60 seconds.
  echo Review the AlgoRent Frontend terminal for the cause.
  goto :failed
)
timeout /t 1 /nobreak >nul
goto :wait_for_frontend

:frontend_ready
echo Opening the website...
start "" "http://localhost:3000"

popd
exit /b 0

:failed
echo.
echo AlgoRent could not be started. Review the error above.
popd
exit /b 1
