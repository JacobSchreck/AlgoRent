@echo off
setlocal
pushd "%~dp0"

echo Seeding 5,000 local U.S. demo listings...
docker exec -i algorent-postgres psql -v ON_ERROR_STOP=1 -U algorent -d algorent < "database\demo-data.sql"
if errorlevel 1 (
  echo ERROR: Demo data could not be loaded.
  popd
  exit /b 1
)

docker exec algorent-postgres psql -U algorent -d algorent -tAc "SELECT 'Demo listings: ' || count(*) FROM listings l JOIN sources s ON s.id = l.source_id WHERE s.name IN ('AlgoRent Demo Housing', 'AlgoRent Demo Link Directory');"

echo Demo admin: admin123@gmail.com / admin123
popd
exit /b 0
