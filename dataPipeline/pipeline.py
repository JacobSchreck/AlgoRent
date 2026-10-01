from __future__ import annotations

import argparse
import asyncio
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

try:
    from .database import (
        source_is_enabled,
        upsert_listings,
        upsert_source,
    )
    from .normalize import normalize_and_validate_reletme
    from .scrapers.reletme import ReletMeClient, source_url_builder
except ImportError:
    from database import (
        source_is_enabled,
        upsert_listings,
        upsert_source,
    )
    from normalize import normalize_and_validate_reletme
    from scrapers.reletme import ReletMeClient, source_url_builder


load_dotenv()


@dataclass(frozen=True, slots=True)
class PipelineResult:
    fetched: int
    valid: int
    invalid: int
    inserted: int
    updated: int
    source_count_verified: bool


def required_env(name: str) -> str:
    value = os.getenv(name)
    if value is None or not value.strip():
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value.strip()


def load_fixture(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list) or any(not isinstance(item, dict) for item in payload):
        raise ValueError("fixture must contain a JSON array of listing objects")
    return payload


async def run_reletme_pipeline(
    *, fixture: Path | None = None, dry_run: bool = False,
) -> PipelineResult:
    public_url = os.getenv("RELETME_PUBLIC_URL", "https://reletme.com").strip()
    listing_url = os.getenv("RELETME_LISTING_URL_TEMPLATE") or f"{public_url.rstrip('/')}/listings"
    build_url = source_url_builder(public_url, listing_url)

    if fixture is not None:
        raw_records = load_fixture(fixture)
    else:
        client = ReletMeClient(
            supabase_url=required_env("RELETME_SUPABASE_URL"),
            anon_key=required_env("RELETME_ANON_KEY"),
        )
        raw_records = await client.fetch_active_listings()

    listings, failures = normalize_and_validate_reletme(raw_records, build_url)
    if failures:
        print("Rejected listings:")
        for failure in failures:
            print(f"  {failure.external_id or '<missing id>'}: {', '.join(failure.reasons)}")

    if dry_run:
        return PipelineResult(
            len(raw_records), len(listings), len(failures), 0, 0, fixture is None,
        )

    source_id = upsert_source("ReletMe", public_url, "PROPERTY_SITE")
    if not source_is_enabled(source_id):
        raise RuntimeError("ReletMe source is disabled in the sources table")
    persisted = upsert_listings(source_id, listings)

    return PipelineResult(
        len(raw_records), len(listings), len(failures), persisted.inserted, persisted.updated,
        fixture is None,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest public ReletMe listings into AlgoRent")
    parser.add_argument("--fixture", type=Path, help="read source records from a JSON fixture")
    parser.add_argument("--dry-run", action="store_true", help="fetch and validate without database writes")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    print("Starting ReletMe ingestion...")
    result = asyncio.run(run_reletme_pipeline(fixture=args.fixture, dry_run=args.dry_run))
    print(f"Fetched:    {result.fetched}")
    print(f"Valid:      {result.valid}")
    print(f"Invalid:    {result.invalid}")
    print(f"Inserted:   {result.inserted}")
    print(f"Updated:    {result.updated}")
    if result.source_count_verified:
        print("Source count verified against Supabase's exact total.")
    print("Dry run complete; no database changes were made." if args.dry_run else "Ingestion complete.")


if __name__ == "__main__":
    main()
