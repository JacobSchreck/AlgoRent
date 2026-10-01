from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal


@dataclass(frozen=True, slots=True)
class Listing:
    """Source-independent listing passed from adapters to database persistence."""

    source: str
    external_id: str
    source_url: str
    title: str
    description: str | None = None
    property_type: str | None = None
    listing_type: str | None = None
    monthly_rent: Decimal | None = None
    security_deposit: Decimal | None = None
    bedrooms: Decimal | None = None
    bathrooms: Decimal | None = None
    square_feet: int | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    available_from: date | None = None
    available_until: date | None = None
    furnished: bool | None = None
    utilities_included: bool | None = None
    parking_available: bool | None = None
    laundry_available: bool | None = None
    pets_allowed: bool | None = None


@dataclass(frozen=True, slots=True)
class ValidationFailure:
    external_id: str | None
    reasons: tuple[str, ...]


def validate_listing(listing: Listing) -> tuple[str, ...]:
    """Return every validation error; an empty tuple means the listing is valid."""

    errors: list[str] = []
    if not listing.external_id.strip():
        errors.append("external_id is required")
    if not listing.title.strip():
        errors.append("title is required")
    if not listing.source_url.strip():
        errors.append("source_url is required")
    if not listing.city or not listing.city.strip():
        errors.append("city is required")
    if listing.monthly_rent is not None and listing.monthly_rent <= 0:
        errors.append("monthly_rent must be greater than zero")
    if listing.bedrooms is not None and listing.bedrooms < 0:
        errors.append("bedrooms must not be negative")
    if listing.bathrooms is not None and listing.bathrooms < 0:
        errors.append("bathrooms must not be negative")
    if listing.square_feet is not None and listing.square_feet <= 0:
        errors.append("square_feet must be greater than zero")
    if (
        listing.available_from is not None
        and listing.available_until is not None
        and listing.available_from > listing.available_until
    ):
        errors.append("available_from must not be after available_until")
    return tuple(errors)
