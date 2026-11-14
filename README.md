# AlgoRent
The team is trying to achieve an app for subleasing, specifically for students looking for short term housing for internships.

## Reviewer quick start (Windows)

Install these prerequisites before cloning the repository:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) with WSL 2 enabled
- JDK 21
- Node.js 20 or newer

After cloning, open the repository folder and run `setup-local.bat` once. It validates the tools,
starts PostgreSQL, installs the exact frontend dependencies from `package-lock.json`, and downloads
and compiles the backend dependencies.

Run `start-local.bat` whenever you want to review the app. It starts the database and opens the
backend and frontend in separate terminal windows, loads 5,000 local U.S. demo listings, and then
opens <http://localhost:3000>. Keep both terminal windows open while using the site. The first
backend start may take a little longer while Flyway creates the database tables.

The demo dataset contains 3,750 full-detail listings and 1,250 link-only listings across 25 U.S.
cities. It also creates pending moderation reports and this local administrator:

```text
Email: admin123@gmail.com
Password: admin123
```

The records are generated locally from [database/demo-data.sql](database/demo-data.sql). They use
reserved demo identifiers and `example.com` contact/source addresses; no Supabase records, real
users, or production credentials are copied. Starting the app again fills in missing demo records
without duplicating them or erasing review actions.

The website setup does not install or run `dataPipeline/`. That tool is only needed to import fresh
third-party listings and requires separate source credentials. See
[dataPipeline/README.md](dataPipeline/README.md) if pipeline review is part of the handoff.

To stop the website, close the backend and frontend terminal windows. To stop the database too,
run `docker compose down` from the repository root. Database data is retained between runs.

To reset all local review activity and regenerate a clean database, run:

```powershell
docker compose down -v
.\start-local.bat
```

The `-v` reset permanently deletes only the local Docker database volume.

See [REVIEW_GUIDE.md](REVIEW_GUIDE.md) for the acceptance checklist and automated validation
commands to give the reviewing team.

## Mac or Linux

`./start-local.sh` does the same as `setup-local.bat` and `start-local.bat`: it starts PostgreSQL, the
backend and the frontend, and loads the 5,000 demo listings. It needs Docker Desktop (running),
JDK 21 and Node.js 20 or newer. Press Ctrl+C to stop; `docker compose down` stops the database.

To load test the running app, see [loadtest/README.md](loadtest/README.md).

## Repository layout

| Folder | What it is |
| --- | --- |
| `frontend/` | Next.js + TypeScript + Tailwind web app |
| `backend/` | Java 21 + Spring Boot REST API. See [backend/README.md](backend/README.md) |
| `database/` | Original schema snapshot and the [ERD](database/ERD.md) |
| `dataPipeline/` | Python scripts that load listings into Postgres |

## Branches and pull requests

| Branch | Purpose |
| --- | --- |
| `live` | Production. Changes arrive only by reviewed pull request. |
| `dev-BE` | Back-end integration branch |
| `dev-FE` | Front-end integration branch |

Work on a feature branch (for example `jacob/search-api`), open a pull request into `dev-BE` or `dev-FE`, and merge dev branches into `live` by pull request. Every pull request runs CI (`.github/workflows/ci.yml`): the backend build and tests, and the frontend lint and build. CI must pass and one teammate must approve before merging.

## Local Database Setup

AlgoRent uses PostgreSQL in Docker.

### Prerequisites (Windows)

1. Check WSL with `wsl --version`.
   If needed, run `wsl --install` and restart.
2. Install and open Docker Desktop.
3. Run `docker ps` to confirm Docker is ready.

### Start the database

From the repository root:

```powershell
docker compose up -d
```

Connection details:

| Setting | Value |
| --- | --- |
| Host | `localhost` |
| Port | `5433` |
| Database | `algorent` |
| Username | `algorent` |
| Password | `algorent` |

Port `5433` on your computer maps to port `5432` in the container.

### Test the database

Run `docker ps` and look for `algorent-postgres`.
Then connect:

```powershell
docker exec -it algorent-postgres psql -U algorent -d algorent
```

At the `algorent=#` prompt, try `SELECT version();`.
Exit with `\q`.

### Create the tables

Start the backend (see [backend/README.md](backend/README.md)). Flyway creates or updates every table on startup.

### Stop or restart

Run `docker compose down` to stop the database.
Run `docker compose up -d` to start it again.
