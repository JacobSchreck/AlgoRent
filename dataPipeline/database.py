from __future__ import annotations

import os
from collections.abc import Iterable
from dataclasses import dataclass

import psycopg
from dotenv import load_dotenv

try:
    from .models import Listing
except ImportError:
    from models import Listing


load_dotenv()


@dataclass(frozen=True, slots=True)
class UpsertResult:
    inserted: int
    updated: int


def get_connection() -> psycopg.Connection:
    return psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5433"),
        dbname=os.getenv("DB_NAME", "algorent"),
        user=os.getenv("DB_USER", "algorent"),
        password=os.getenv("DB_PASSWORD", "algorent"),
    )


def upsert_source(name: str, base_url: str, source_type: str) -> int:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO sources (name, base_url, source_type)
                VALUES (%s, %s, %s)
                ON CONFLICT (name) DO UPDATE SET
                    base_url = EXCLUDED.base_url,
                    source_type = EXCLUDED.source_type
                RETURNING id
                """,
                (name, base_url, source_type),
            )
            return cur.fetchone()[0]


def source_is_enabled(source_id: int) -> bool:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT enabled FROM sources WHERE id = %s", (source_id,))
            row = cur.fetchone()
            return bool(row and row[0])


def upsert_listings(source_id: int, listings: Iterable[Listing]) -> UpsertResult:
    """Persist a validated batch using only the existing AlgoRent schema."""

    inserted = 0
    updated = 0
    with get_connection() as conn:
        with conn.cursor() as cur:
            for listing in listings:
                cur.execute(
                    """
                    INSERT INTO listings (
                        source_id, external_id, source_url, title, description,
                        property_type, listing_type, monthly_rent, security_deposit,
                        bedrooms, bathrooms, square_feet, address, city, state,
                        zip_code, latitude, longitude, available_from, available_until,
                        furnished, utilities_included, parking_available,
                        laundry_available, pets_allowed
                    )
                    VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (source_id, external_id) DO UPDATE SET
                        source_url = EXCLUDED.source_url,
                        title = EXCLUDED.title,
                        description = EXCLUDED.description,
                        property_type = EXCLUDED.property_type,
                        listing_type = EXCLUDED.listing_type,
                        monthly_rent = EXCLUDED.monthly_rent,
                        security_deposit = EXCLUDED.security_deposit,
                        bedrooms = EXCLUDED.bedrooms,
                        bathrooms = EXCLUDED.bathrooms,
                        square_feet = EXCLUDED.square_feet,
                        address = EXCLUDED.address,
                        city = EXCLUDED.city,
                        state = EXCLUDED.state,
                        zip_code = EXCLUDED.zip_code,
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
                        available_from = EXCLUDED.available_from,
                        available_until = EXCLUDED.available_until,
                        furnished = EXCLUDED.furnished,
                        utilities_included = EXCLUDED.utilities_included,
                        parking_available = EXCLUDED.parking_available,
                        laundry_available = EXCLUDED.laundry_available,
                        pets_allowed = EXCLUDED.pets_allowed,
                        status = 'ACTIVE',
                        last_seen_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING (xmax = 0) AS inserted
                    """,
                    (
                        source_id, listing.external_id, listing.source_url, listing.title,
                        listing.description, listing.property_type, listing.listing_type,
                        listing.monthly_rent, listing.security_deposit, listing.bedrooms,
                        listing.bathrooms, listing.square_feet, listing.address, listing.city,
                        listing.state, listing.zip_code, listing.latitude, listing.longitude,
                        listing.available_from, listing.available_until, listing.furnished,
                        listing.utilities_included, listing.parking_available,
                        listing.laundry_available, listing.pets_allowed,
                    ),
                )
                if cur.fetchone()[0]:
                    inserted += 1
                else:
                    updated += 1
    return UpsertResult(inserted=inserted, updated=updated)
