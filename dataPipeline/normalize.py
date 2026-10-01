from __future__ import annotations

from collections.abc import Callable, Iterable
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any

try:
    from .models import Listing, ValidationFailure, validate_listing
except ImportError:
    from models import Listing, ValidationFailure, validate_listing


PROPERTY_TYPES = {
    "apartment": "apartment", "apt": "apartment", "condo": "condo",
    "condominium": "condo", "house": "house", "room": "room", "studio": "studio",
    "townhome": "townhouse", "townhouse": "townhouse",
}
LISTING_TYPES = {
    "entire-place": "entire_unit", "entire place": "entire_unit",
    "entire-unit": "entire_unit", "entire unit": "entire_unit",
    "private-room": "private_room", "private room": "private_room",
    "shared-room": "shared_room", "shared room": "shared_room",
}


def _text(value: Any) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def _decimal(value: Any) -> Decimal | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, str):
        value = value.strip().replace("$", "").replace(",", "")
        if not value:
            return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def _integer(value: Any) -> int | None:
    parsed = _decimal(value)
    if parsed is None or parsed != parsed.to_integral_value():
        return None
    return int(parsed)


def _date(value: Any) -> date | None:
    text = _text(value)
    if text is None:
        return None
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        return None


def _boolean(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "yes", "1"}:
            return True
        if normalized in {"false", "no", "0"}:
            return False
    if isinstance(value, (int, float, Decimal)) and value in (0, 1):
        return bool(value)
    return None


def _canonical(value: Any, vocabulary: dict[str, str]) -> str | None:
    text = _text(value)
    if text is None:
        return None
    return vocabulary.get(text.lower(), "other")


def normalize_reletme(raw: dict[str, Any], build_source_url: Callable[[str], str]) -> Listing:
    """Convert one intentionally limited ReletMe record to AlgoRent's model."""

    external_id = _text(raw.get("id")) or ""
    return Listing(
        source="reletme",
        external_id=external_id,
        source_url=build_source_url(external_id),
        title=_text(raw.get("title")) or "",
        property_type=_canonical(raw.get("property_type"), PROPERTY_TYPES),
        listing_type=_canonical(raw.get("lease_type"), LISTING_TYPES),
        monthly_rent=_decimal(raw.get("rent")),
        security_deposit=_decimal(raw.get("security_deposit")),
        bedrooms=_decimal(raw.get("beds")),
        bathrooms=_decimal(raw.get("baths")),
        square_feet=_integer(raw.get("sqft")),
        address=_text(raw.get("address")),
        city=_text(raw.get("city")),
        state=_text(raw.get("state")),
        zip_code=_text(raw.get("zip")),
        available_from=_date(raw.get("lease_start")),
        available_until=_date(raw.get("lease_end")),
        furnished=None,
        pets_allowed=_boolean(raw.get("pet_friendly")),
    )


def normalize_and_validate_reletme(
    raw_records: Iterable[dict[str, Any]],
    build_source_url: Callable[[str], str],
) -> tuple[list[Listing], list[ValidationFailure]]:
    valid: list[Listing] = []
    failures: list[ValidationFailure] = []
    for raw in raw_records:
        listing = normalize_reletme(raw, build_source_url)
        parsing_errors: list[str] = []
        parsed_values = {
            "rent": listing.monthly_rent,
            "security_deposit": listing.security_deposit,
            "beds": listing.bedrooms,
            "baths": listing.bathrooms,
            "sqft": listing.square_feet,
            "lease_start": listing.available_from,
            "lease_end": listing.available_until,
            "pet_friendly": listing.pets_allowed,
        }
        for field, parsed in parsed_values.items():
            if raw.get(field) not in (None, "") and parsed is None:
                parsing_errors.append(f"{field} has an invalid value")
        errors = (*parsing_errors, *validate_listing(listing))
        if errors:
            failures.append(ValidationFailure(_text(raw.get("id")), tuple(errors)))
        else:
            valid.append(listing)
    return valid, failures
