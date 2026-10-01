# AlgoRent data pipeline

The pipeline reads only the public active-listing fields AlgoRent needs, converts each source record
to the canonical `Listing` model, validates the complete batch, and UPSERTs valid rows into the same
PostgreSQL schema used by the Spring backend.

```text
ReletMe public Supabase query
            |
            v
  scrapers/reletme.py  source transport and pagination
            |
            v
      normalize.py     source names and values -> AlgoRent Listing
            |
            v
       models.py       source-independent data and validation rules
            |
            v
      database.py      transactional UPSERT by (source_id, external_id)
            |
            v
PostgreSQL -> Spring search API -> Next.js frontend
```

ReletMe-specific field names stop at `normalize.py`. The database contract deliberately matches the
existing Spring search endpoint: ReletMe's `lease_end` becomes `available_until`, `lease_type`
becomes canonical `listing_type`, and `pet_friendly` becomes `pets_allowed`.

| ReletMe | Canonical / PostgreSQL | Rule |
| --- | --- | --- |
| `id` | `external_id` | Unique together with the ReletMe source id |
| `rent` | `monthly_rent` | Parsed as an exact decimal; non-positive values are rejected |
| `lease_start`, `lease_end` | `available_from`, `available_until` | Invalid or reversed dates are rejected |
| `lease_type` | `listing_type` | Normalized to `entire_unit`, `private_room`, `shared_room`, or `other` |
| `property_type` | `property_type` | Normalized to the AlgoRent vocabulary |
| `pet_friendly` | `pets_allowed` | Unknown remains `NULL`, not `false` |

## Setup

From `dataPipeline/`, create/activate a virtual environment and install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Fill in `RELETME_SUPABASE_URL` and `RELETME_ANON_KEY` from the read-only public request already
observed in the ReletMe web client. `.env` is ignored by Git. Do not use a service-role key.

Start the existing PostgreSQL database. The intake uses the current `sources` and `listings` tables
without adding or changing backend migrations:

```powershell
docker compose up -d
```

## Safe local workflow

From the repository root, run normalization and validation against the checked-in fixture without
network or database access:

```powershell
python -m dataPipeline.pipeline --fixture dataPipeline/tests/fixtures/reletme_listings.json --dry-run
```

Persist the fixture to PostgreSQL:

```powershell
python -m dataPipeline.pipeline --fixture dataPipeline/tests/fixtures/reletme_listings.json
```

Run the live, read-only intake manually:

```powershell
python -m dataPipeline.pipeline
```

Run tests:

```powershell
python -m unittest discover -s dataPipeline/tests -v
```

## Failure and freshness behavior

- HTTP failures, rate limits, malformed JSON, and database failures produce a non-zero CLI exit.
- Each live fetch requests Supabase's exact active-row count and rejects incomplete or duplicate results.
- All valid listings in one run are UPSERTed in one database transaction.
- A failed fetch or database batch never marks existing listings inactive.
- Missing source records are not deactivated in this first version. Add that only after multiple
  successful production runs establish a safe freshness window.
- Scheduling is intentionally outside this version; run the CLI manually until repeat runs and
  update behavior have been checked against the real source.

Before scheduling unattended ingestion, confirm ReletMe's terms and permitted reuse. Keep the query
limited to the public listing endpoint and the fields declared in `scrapers/reletme.py`.
