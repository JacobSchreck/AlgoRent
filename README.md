# AlgoRent
The team is trying to achieve an app for subleasing, specifically for students looking for short term housing for internships.

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
