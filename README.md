# AlgoRent
The team is trying to achieve an app for subleasing, specifically for students looking for short term housing for internships.

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

### Stop or restart

Run `docker compose down` to stop the database.
Run `docker compose up -d` to start it again.
