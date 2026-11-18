#!/usr/bin/env bash
# mac version of start-local.bat (needs docker, jdk 21, node 20)

set -e
cd "$(dirname "$0")"

for tool in docker java node npm curl; do
  if ! command -v "$tool" > /dev/null; then
    echo "ERROR: $tool is not installed or is not on PATH."
    exit 1
  fi
done
if ! docker info > /dev/null 2>&1; then
  echo "ERROR: Docker Desktop is not running. Start it and try again."
  exit 1
fi

echo "Starting PostgreSQL..."
docker compose up -d --wait

export DB_HOST=localhost
export DB_PORT=5433
export DB_NAME=algorent
export DB_USER=algorent
export DB_PASSWORD=algorent
export SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5433/algorent?sslmode=disable"
export CORS_ALLOWED_ORIGINS=http://localhost:3000
export NEXT_PUBLIC_API_URL=http://localhost:8080
# no email server locally, codes go to backend/target/backend.log
export MAIL_ENABLED=false

if [ ! -d frontend/node_modules ]; then
  echo "Installing frontend dependencies..."
  (cd frontend && npm ci)
fi

echo "Starting the backend (log: backend/target/backend.log)..."
mkdir -p backend/target
(cd backend && ./mvnw spring-boot:run > target/backend.log 2>&1) &
BACKEND_PID=$!
trap 'echo; echo "Stopping the backend..."; kill $BACKEND_PID 2> /dev/null; pkill -f "com.algorent.AlgoRentApplication" 2> /dev/null' EXIT

echo "Waiting for the backend and database migrations..."
for attempt in $(seq 1 300); do
  if curl -s http://localhost:8080/actuator/health | grep -q '"status":"UP"'; then
    break
  fi
  if ! kill -0 $BACKEND_PID 2> /dev/null; then
    echo "ERROR: The backend stopped. See backend/target/backend.log"
    exit 1
  fi
  if [ "$attempt" = 300 ]; then
    echo "ERROR: The backend did not start within 5 minutes. See backend/target/backend.log"
    exit 1
  fi
  sleep 1
done

echo "Loading 5,000 demo listings..."
docker exec -i algorent-postgres psql -v ON_ERROR_STOP=1 -q -U algorent -d algorent < database/demo-data.sql > /dev/null

echo
echo "Backend:  http://localhost:8080/actuator/health"
echo "Website:  http://localhost:3000  (starting now)"
echo "Demo admin: admin123@gmail.com / admin123"
echo "New accounts: the verification code is in backend/target/backend.log"
echo "  (grep \"Verification code\" backend/target/backend.log)"
echo
cd frontend
npm run dev
