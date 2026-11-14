# AlgoRent data pipeline

The pipeline reads only the public active-listing fields AlgoRent needs, converts each source record
to the canonical `Listing` model, validates the complete batch, and UPSERTs valid rows into the same
PostgreSQL schema used by the Spring backend.

```text
ReletMe API       SubLeaps HTML       RotatingRoom public index
     |                  |                       |
reletme.py          subleaps.py            rotatingroom.py
     |                  |                       |
     +------------------+-----------------------+
                    |
              normalize.py     source fields -> AlgoRent Listing
                    |
                models.py      source-independent validation
                    |
               database.py     UPSERT by (source_id, external_id)
                    |
       PostgreSQL -> Spring search API -> Next.js frontend
```

Source photo URLs are stored in `listing_images` in source order. The pipeline stores URL text
only; it does not download or duplicate image files. Search results use the first URL as the
thumbnail, while the listing detail endpoint returns the ordered gallery.

Each listing's `source_url` points to ReletMe's public `/listing/{external_id}` detail page so the
AlgoRent UI can send a user to the original source record.

Source-specific field names stop at `normalize.py`. The database contract deliberately matches the
existing Spring search endpoint: ReletMe's `lease_end` becomes `available_until`, `lease_type`
becomes canonical `listing_type`, and `pet_friendly` becomes `pets_allowed`.

The SubLeaps adapter walks every `/browse` page, collects only UUID listing routes, and then reads
each public detail page. It uses Product JSON-LD for core listing fields and the page payload for
coordinates. Before returning anything, it checks that the number of unique links equals the result
count reported by SubLeaps. Detail requests are concurrency-limited to avoid an unbounded burst.

The RotatingRoom adapter covers the nationwide public listing index rather than one school or city.
It checks every numeric listing route in the public sitemap, removes stale `404`/`410` entries, and
checks a bounded range of newer IDs because the sitemap is generated periodically. It retains only
title, source link, and fields needed for local filtering. Descriptions, images, exact addresses,
and user/contact data are discarded. Its `sources.source_type` is `LINK_ONLY`, which downstream UI
code must use to show only the listing title and outbound source link.

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

Validate all live SubLeaps listings without writing to PostgreSQL:

```powershell
python -m dataPipeline.pipeline --source subleaps --dry-run
```

Ingest SubLeaps after reviewing the dry-run counts:

```powershell
python -m dataPipeline.pipeline --source subleaps
```

Validate or ingest the nationwide RotatingRoom public index:

```powershell
python -m dataPipeline.pipeline --source rotatingroom --dry-run
python -m dataPipeline.pipeline --source rotatingroom
```

RotatingRoom's directory-wide marketing counter can exceed the number of publicly indexed detail
pages. The pipeline reports that gap, but only imports active records discoverable through the
public sitemap and bounded newer-ID scan. It does not claim that inaccessible records were fetched.

Run tests:

```powershell
python -m unittest discover -s dataPipeline/tests -v
```

## Failure and freshness behavior

- HTTP failures, rate limits, malformed JSON, and database failures produce a non-zero CLI exit.
- Each live fetch checks the source-reported total and rejects incomplete or duplicate results.
- All valid listings in one run are UPSERTed in one database transaction.
- A listing's ordered image rows are rewritten only when its public source photo list changes.
- A failed fetch or database batch never marks existing listings inactive.
- After a complete live fetch, the source's listings that were not in it are marked `REMOVED`
  (they no longer show in search). Listings rejected by validation count as still listed. If a
  removed listing comes back in a later run, it is set to `ACTIVE` again. Fixture runs and dry runs
  never remove anything, and a fetch that returns no listings removes nothing.
- Scheduling is intentionally outside this version; run the CLI manually until repeat runs and
  update behavior have been checked against the real source.

Before scheduling unattended ingestion, confirm ReletMe's terms and permitted reuse. Keep the query
limited to the public listing endpoint and the fields declared in `scrapers/reletme.py`.

## Nightly updates

`.github/workflows/nightly-pipeline.yml` runs `python -m dataPipeline.scheduled` every night at about
3 AM Eastern. That script runs every source listed in `SOURCES` in `scheduled.py`. If one source fails,
the others still run and the GitHub run is marked as failed. You can also start it by hand from the
Actions tab.

The workflow needs repository secrets for the hosted database (`DB_HOST`, `DB_PORT`, `DB_NAME`,
`DB_USER`, `DB_PASSWORD`) and for ReletMe (`RELETME_SUPABASE_URL`, `RELETME_ANON_KEY`).

To add a new site, give it a pipeline function like `run_reletme_pipeline` and add it to `SOURCES`.
