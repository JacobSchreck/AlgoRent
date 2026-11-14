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
        mark_missing_listings_removed,
        source_is_enabled,
        upsert_listings,
        upsert_source,
    )
    from .normalize import (
        normalize_and_validate_reletme,
        normalize_and_validate_rotatingroom,
        normalize_and_validate_subleaps,
    )
    from .scrapers.reletme import ReletMeClient, source_url_builder
    from .scrapers.rotatingroom import RotatingRoomClient
    from .scrapers.subleaps import SubLeapsClient
except ImportError:
    from database import (
        mark_missing_listings_removed,
        source_is_enabled,
        upsert_listings,
        upsert_source,
    )
    from normalize import (
        normalize_and_validate_reletme,
        normalize_and_validate_rotatingroom,
        normalize_and_validate_subleaps,
    )
    from scrapers.reletme import ReletMeClient, source_url_builder
    from scrapers.rotatingroom import RotatingRoomClient
    from scrapers.subleaps import SubLeapsClient


load_dotenv()


@dataclass(frozen=True, slots=True)
class PipelineResult:
    fetched: int
    valid: int
    invalid: int
    inserted: int
    updated: int
    images: int
    source_count_verified: bool
    removed: int = 0


def required_env(name: str) -> str:
    value = os.getenv(name)
    if value is None or not value.strip():
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value.strip()


def seen_ids(listings, failures) -> list[str]:
    """Every listing id the source returned, including ones that failed validation."""
    ids = [listing.external_id for listing in listings]
    ids += [failure.external_id for failure in failures if failure.external_id]
    return ids


def load_fixture(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list) or any(not isinstance(item, dict) for item in payload):
        raise ValueError("fixture must contain a JSON array of listing objects")
    return payload


async def run_reletme_pipeline(
    *, fixture: Path | None = None, dry_run: bool = False,
) -> PipelineResult:
    public_url = os.getenv("RELETME_PUBLIC_URL", "https://reletme.com").strip()
    listing_url = os.getenv("RELETME_LISTING_URL_TEMPLATE")
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
            len(raw_records), len(listings), len(failures), 0, 0,
            sum(len(listing.image_urls) for listing in listings), fixture is None,
        )

    source_id = upsert_source("ReletMe", public_url, "PROPERTY_SITE")
    if not source_is_enabled(source_id):
        raise RuntimeError("ReletMe source is disabled in the sources table")
    persisted = upsert_listings(source_id, listings)
    # A fixture is only a sample, so only a full live fetch can tell us a listing is gone.
    removed = 0 if fixture is not None else mark_missing_listings_removed(
        source_id, seen_ids(listings, failures))

    return PipelineResult(
        len(raw_records), len(listings), len(failures), persisted.inserted, persisted.updated,
        persisted.images, fixture is None, removed,
    )


async def run_subleaps_pipeline(
    *, fixture: Path | None = None, dry_run: bool = False,
) -> PipelineResult:
    public_url = os.getenv("SUBLEAPS_PUBLIC_URL", "https://subleaps.com").strip()
    raw_records = (
        load_fixture(fixture)
        if fixture is not None
        else await SubLeapsClient(base_url=public_url).fetch_active_listings()
    )

    listings, failures = normalize_and_validate_subleaps(raw_records)
    if failures:
        print("Rejected listings:")
        for failure in failures:
            print(f"  {failure.external_id or '<missing id>'}: {', '.join(failure.reasons)}")

    if dry_run:
        return PipelineResult(
            len(raw_records), len(listings), len(failures), 0, 0,
            sum(len(listing.image_urls) for listing in listings), fixture is None,
        )

    source_id = upsert_source("SubLeaps", public_url, "PROPERTY_SITE")
    if not source_is_enabled(source_id):
        raise RuntimeError("SubLeaps source is disabled in the sources table")
    persisted = upsert_listings(source_id, listings)
    # A fixture is only a sample, so only a full live fetch can tell us a listing is gone.
    removed = 0 if fixture is not None else mark_missing_listings_removed(
        source_id, seen_ids(listings, failures))
    return PipelineResult(
        len(raw_records), len(listings), len(failures), persisted.inserted, persisted.updated,
        persisted.images, fixture is None, removed,
    )


async def run_rotatingroom_pipeline(
    *, fixture: Path | None = None, dry_run: bool = False,
) -> PipelineResult:
    public_url = os.getenv("ROTATINGROOM_PUBLIC_URL", "https://rotatingroom.com").strip()
    raw_records = (
        load_fixture(fixture)
        if fixture is not None
        else await RotatingRoomClient(base_url=public_url).fetch_active_listings()
    )

    listings, failures = normalize_and_validate_rotatingroom(raw_records)
    if failures:
        print("Rejected listings:")
        for failure in failures:
            print(f"  {failure.external_id or '<missing id>'}: {', '.join(failure.reasons)}")

    if dry_run:
        return PipelineResult(
            len(raw_records), len(listings), len(failures), 0, 0, 0, False,
        )

    # LINK_ONLY tells downstream clients to expose only title and source_url.
    # Filter metadata remains available to local search queries.
    source_id = upsert_source("RotatingRoom", public_url, "LINK_ONLY")
    if not source_is_enabled(source_id):
        raise RuntimeError("RotatingRoom source is disabled in the sources table")
    persisted = upsert_listings(source_id, listings)
    # A fixture is only a sample, so only a full live fetch can tell us a listing is gone.
    removed = 0 if fixture is not None else mark_missing_listings_removed(
        source_id, seen_ids(listings, failures))
    return PipelineResult(
        len(raw_records), len(listings), len(failures), persisted.inserted, persisted.updated,
        persisted.images, False, removed,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest public listings into AlgoRent")
    parser.add_argument(
        "--source", choices=("reletme", "subleaps", "rotatingroom"), default="reletme",
        help="listing source to ingest (default: reletme)",
    )
    parser.add_argument("--fixture", type=Path, help="read source records from a JSON fixture")
    parser.add_argument("--dry-run", action="store_true", help="fetch and validate without database writes")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    print(f"Starting {args.source} ingestion...")
    runners = {
        "reletme": run_reletme_pipeline,
        "subleaps": run_subleaps_pipeline,
        "rotatingroom": run_rotatingroom_pipeline,
    }
    runner = runners[args.source]
    result = asyncio.run(runner(fixture=args.fixture, dry_run=args.dry_run))
    print(f"Fetched:    {result.fetched}")
    print(f"Valid:      {result.valid}")
    print(f"Invalid:    {result.invalid}")
    print(f"Inserted:   {result.inserted}")
    print(f"Updated:    {result.updated}")
    print(f"Images:     {result.images}")
    print(f"Removed:    {result.removed}")
    if result.source_count_verified:
        print("Fetched count verified against the source's reported total.")
    print("Dry run complete; no database changes were made." if args.dry_run else "Ingestion complete.")


if __name__ == "__main__":
    main()
