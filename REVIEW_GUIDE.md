# AlgoRent review guide

## Run locally

Install Docker Desktop, JDK 21, and Node.js 20 or newer. Then, from the cloned repository root:

```bat
setup-local.bat
start-local.bat
```

Setup is required only once. Start launches PostgreSQL, the backend, and the frontend; applies the
database migrations; loads the demo data; and opens <http://localhost:3000>. No `.env` file or
Supabase access is required.

Local administrator:

```text
Email: admin123@gmail.com
Password: admin123
```

The local database contains 5,000 synthetic U.S. listings: 3,750 full-detail listings, 1,250
link-only listings, and 12 pending moderation reports. No production records are copied.

## Review checklist

1. Search and filter listings in Gainesville, Austin, Boston, or Chicago.
2. Open, save, compare, and report both full and link-only listings.
3. Add, collapse, and delete notes from Saved.
4. Sign in as the administrator and approve or dismiss a report in Moderation.
5. Confirm an approved listing disappears from search.

## Automated checks

Run from Command Prompt with Docker Desktop open:

```bat
cd backend
set DOCKER_HOST=npipe:////./pipe/dockerDesktopLinuxEngine
set TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock
mvnw.cmd -Dapi.version=1.44 verify
cd ..\frontend
npm.cmd run lint
npm.cmd run build
```

Expected backend result: 51 tests, 0 failures, 0 errors, 0 skipped.

## Stop or reset

Close the backend and frontend windows, then run `docker compose down` to stop PostgreSQL while
keeping its data. For a completely fresh local database, run:

```bat
docker compose down -v
start-local.bat
```

The `-v` command permanently deletes only this local Docker database volume.
