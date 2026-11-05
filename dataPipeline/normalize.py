from __future__ import annotations

from collections.abc import Callable, Iterable
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any
from urllib.parse import urlparse

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
    "entire_place": "entire_unit", "entire-unit": "entire_unit", "entire unit": "entire_unit",
    "private-room": "private_room", "private room": "private_room",
    "private_room": "private_room",
    "shared-room": "shared_room", "shared room": "shared_room",
    "shared_room": "shared_room",
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


def _float(value: Any) -> float | None:
    parsed = _decimal(value)
    return float(parsed) if parsed is not None else None


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


def _image_urls(value: Any) -> tuple[str, ...]:
    """Keep unique public HTTPS image URLs in source display order."""

    if not isinstance(value, list):
        return ()

    urls: list[str] = []
    seen: set[str] = set()
    for item in value:
        url = _text(item)
        if url is None or url in seen:
            continue
        parsed = urlparse(url)
        if parsed.scheme != "https" or not parsed.netloc:
            continue
        seen.add(url)
        urls.append(url)
    return tuple(urls)


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
        image_urls=_image_urls(raw.get("photos")),
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


def normalize_subleaps(raw: dict[str, Any]) -> Listing:
    """Convert one SubLeaps detail-page record to AlgoRent's model."""

    return Listing(
        source="subleaps",
        external_id=_text(raw.get("id")) or "",
        source_url=_text(raw.get("source_url")) or "",
        title=_text(raw.get("title")) or "",
        description=_text(raw.get("description")),
        monthly_rent=_decimal(raw.get("rent")),
        bedrooms=_decimal(raw.get("beds")),
        bathrooms=_decimal(raw.get("baths")),
        city=_text(raw.get("city")),
        state=_text(raw.get("state")),
        latitude=_float(raw.get("latitude")),
        longitude=_float(raw.get("longitude")),
        image_urls=_image_urls(raw.get("photos")),
        available_from=_date(raw.get("lease_start")),
        available_until=_date(raw.get("lease_end")),
        furnished=_boolean(raw.get("furnished")),
        parking_available=_boolean(raw.get("parking_available")),
        laundry_available=_boolean(raw.get("laundry_available")),
        pets_allowed=_boolean(raw.get("pets_allowed")),
    )


def normalize_and_validate_subleaps(
    raw_records: Iterable[dict[str, Any]],
) -> tuple[list[Listing], list[ValidationFailure]]:
    valid: list[Listing] = []
    failures: list[ValidationFailure] = []
    typed_fields = {
        "rent": "monthly_rent",
        "beds": "bedrooms",
        "baths": "bathrooms",
        "latitude": "latitude",
        "longitude": "longitude",
        "lease_start": "available_from",
        "lease_end": "available_until",
        "furnished": "furnished",
        "parking_available": "parking_available",
        "laundry_available": "laundry_available",
        "pets_allowed": "pets_allowed",
    }

    for raw in raw_records:
        listing = normalize_subleaps(raw)
        parsing_errors = [
            f"{raw_field} has an invalid value"
            for raw_field, model_field in typed_fields.items()
            if raw.get(raw_field) not in (None, "")
            and getattr(listing, model_field) is None
        ]
        errors = (*parsing_errors, *validate_listing(listing))
        if errors:
            failures.append(ValidationFailure(_text(raw.get("id")), tuple(errors)))
        else:
            valid.append(listing)
    return valid, failures


def normalize_rotatingroom(raw: dict[str, Any]) -> Listing:
    """Convert a deliberately limited RotatingRoom record to AlgoRent's model."""

    return Listing(
        source="rotatingroom",
        external_id=_text(raw.get("id")) or "",
        source_url=_text(raw.get("source_url")) or "",
        title=_text(raw.get("title")) or "",
        listing_type=_canonical(raw.get("listing_type"), LISTING_TYPES),
        monthly_rent=_decimal(raw.get("rent")),
        bedrooms=_decimal(raw.get("beds")),
        bathrooms=_decimal(raw.get("baths")),
        city=_text(raw.get("city")),
        state=_text(raw.get("state")),
        latitude=_float(raw.get("latitude")),
        longitude=_float(raw.get("longitude")),
        available_from=_date(raw.get("lease_start")),
        available_until=_date(raw.get("lease_end")),
        furnished=_boolean(raw.get("furnished")),
        utilities_included=_boolean(raw.get("utilities_included")),
        parking_available=_boolean(raw.get("parking_available")),
        laundry_available=_boolean(raw.get("laundry_available")),
    )


def normalize_and_validate_rotatingroom(
    raw_records: Iterable[dict[str, Any]],
) -> tuple[list[Listing], list[ValidationFailure]]:
    valid: list[Listing] = []
    failures: list[ValidationFailure] = []
    typed_fields = {
        "rent": "monthly_rent",
        "beds": "bedrooms",
        "baths": "bathrooms",
        "latitude": "latitude",
        "longitude": "longitude",
        "lease_start": "available_from",
        "lease_end": "available_until",
        "furnished": "furnished",
        "utilities_included": "utilities_included",
        "parking_available": "parking_available",
        "laundry_available": "laundry_available",
    }

    for raw in raw_records:
        listing = normalize_rotatingroom(raw)
        parsing_errors = [
            f"{raw_field} has an invalid value"
            for raw_field, model_field in typed_fields.items()
            if raw.get(raw_field) not in (None, "")
            and getattr(listing, model_field) is None
        ]
        errors = (*parsing_errors, *validate_listing(listing))
        if errors:
            failures.append(ValidationFailure(_text(raw.get("id")), tuple(errors)))
        else:
            valid.append(listing)
    return valid, failures
