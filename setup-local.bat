@echo off
setlocal
pushd "%~dp0"

echo.
echo === AlgoRent local setup ===
echo.

where.exe java.exe >nul 2>nul
if errorlevel 1 (
  echo ERROR: Java is not installed or is not on PATH. Install JDK 21 and try again.
  popd
  exit /b 1
)

java -version 2>&1 | findstr /R /C:"version.*21[.]" >nul
if errorlevel 1 (
  echo ERROR: AlgoRent requires JDK 21. The java command is using another version.
  java -version
  popd
  exit /b 1
)

where.exe node.exe >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or is not on PATH. Install Node.js 20 or newer.
  popd
  exit /b 1
)

where.exe npm.cmd >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is not installed or is not on PATH. Install Node.js 20 or newer.
  popd
  exit /b 1
)

node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 (
  echo ERROR: AlgoRent requires Node.js 20 or newer.
  node --version
  popd
  exit /b 1
)

docker version >nul 2>nul
if errorlevel 1 (
  echo ERROR: Docker Desktop is not installed, is not on PATH, or is not running.
  echo Install and open Docker Desktop, wait for it to finish starting, then try again.
  popd
  exit /b 1
)

echo [1/3] Starting the local PostgreSQL database...
docker compose up -d --wait
if errorlevel 1 (
  echo ERROR: PostgreSQL did not start.
  popd
  exit /b 1
)

echo.
echo [2/3] Installing frontend dependencies...
pushd frontend
call npm.cmd ci
if errorlevel 1 (
  echo ERROR: Frontend dependency installation failed.
  popd
  popd
  exit /b 1
)
popd

echo.
echo [3/3] Downloading backend dependencies and compiling...
pushd backend
call mvnw.cmd -DskipTests package
if errorlevel 1 (
  echo ERROR: Backend dependency installation or compilation failed.
  popd
  popd
  exit /b 1
)
popd

echo.
echo Setup complete. Run start-local.bat to launch AlgoRent.
popd
exit /b 0
