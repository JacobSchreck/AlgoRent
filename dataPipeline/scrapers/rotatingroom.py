from __future__ import annotations

import asyncio
import html as html_module
import json
import warnings
import xml.etree.ElementTree as ElementTree
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup


class RotatingRoomResponseError(RuntimeError):
    """RotatingRoom returned an incomplete or unexpected public response."""


def _inertia_page(document: str) -> dict[str, Any]:
    app = BeautifulSoup(document, "html.parser").select_one("#app[data-page]")
    if app is None:
        raise RotatingRoomResponseError("RotatingRoom page did not contain Inertia data")
    try:
        payload = json.loads(html_module.unescape(str(app["data-page"])))
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        raise RotatingRoomResponseError("RotatingRoom returned malformed Inertia data") from exc
    if not isinstance(payload, dict):
        raise RotatingRoomResponseError("RotatingRoom Inertia data was not an object")
    return payload


def parse_sitemap_listing_ids(xml: bytes) -> list[int]:
    """Return the unique numeric listing IDs in sitemap order."""

    try:
        root = ElementTree.fromstring(xml)
    except ElementTree.ParseError as exc:
        raise RotatingRoomResponseError("RotatingRoom returned malformed sitemap XML") from exc

    ids: list[int] = []
    seen: set[int] = set()
    for element in root.iter():
        if not element.tag.endswith("loc") or not element.text:
            continue
        path_parts = urlparse(element.text.strip()).path.strip("/").split("/")
        if len(path_parts) != 2 or path_parts[0] != "need-a-room":
            continue
        try:
            listing_id = int(path_parts[1])
        except ValueError:
            continue
        if listing_id > 0 and listing_id not in seen:
            seen.add(listing_id)
            ids.append(listing_id)
    if not ids:
        raise RotatingRoomResponseError("RotatingRoom sitemap contained no listing IDs")
    return ids


def parse_reported_total(document: str) -> int:
    page = _inertia_page(document)
    value = page.get("props", {}).get("totalActiveListings")
    if isinstance(value, bool):
        value = None
    try:
        total = int(value)
    except (TypeError, ValueError) as exc:
        raise RotatingRoomResponseError(
            "RotatingRoom directory did not report an active-listing total"
        ) from exc
    if total < 0:
        raise RotatingRoomResponseError("RotatingRoom reported a negative listing total")
    return total


def parse_listing_detail(
    document: str, listing_id: int, source_url: str,
) -> dict[str, Any] | None:
    """Parse only display and filtering fields; discard descriptive and personal data."""

    page = _inertia_page(document)
    if page.get("component") != "NeedRoom/Details":
        return None
    room = page.get("props", {}).get("room")
    if not isinstance(room, dict) or room.get("status") != "active":
        return None

    returned_id = room.get("id")
    if str(returned_id) != str(listing_id):
        raise RotatingRoomResponseError(
            f"RotatingRoom detail ID mismatch: requested {listing_id}, received {returned_id}"
        )

    city = room.get("city") if isinstance(room.get("city"), dict) else {}
    address = room.get("address") if isinstance(room.get("address"), dict) else {}
    location = room.get("location") if isinstance(room.get("location"), dict) else {}
    availability = (
        room.get("future_availbility")
        if isinstance(room.get("future_availbility"), dict)
        else None
    )
    if availability is None:
        ranges = room.get("availabilities")
        availability = ranges[0] if isinstance(ranges, list) and ranges else {}

    amenities = {
        item for item in room.get("amenities", []) if isinstance(item, str)
    } if isinstance(room.get("amenities"), list) else set()

    return {
        "id": str(listing_id),
        "source_url": source_url,
        "title": room.get("title") or room.get("default_title"),
        "rent": room.get("rent"),
        "beds": room.get("bedrooms"),
        "baths": room.get("bathrooms"),
        "listing_type": room.get("type"),
        "city": city.get("name") or address.get("city"),
        "state": city.get("state") or address.get("state"),
        "latitude": location.get("lat"),
        "longitude": location.get("lon"),
        "lease_start": availability.get("from") if isinstance(availability, dict) else None,
        "lease_end": availability.get("to") if isinstance(availability, dict) else None,
        "furnished": "fully_furnished" in amenities,
        "utilities_included": "utilities_included" in amenities,
        "parking_available": "free_parking" in amenities,
        "laundry_available": "onsite_laundry" in amenities,
        # Intentionally omitted: description, images, exact address, and user data.
        "photos": [],
    }


@dataclass(frozen=True, slots=True)
class RotatingRoomClient:
    """Read-only client for all publicly indexed active RotatingRoom listings."""

    base_url: str = "https://rotatingroom.com"
    timeout_seconds: float = 30.0
    max_concurrency: int = 5
    max_new_id_candidates: int = 1_000
    require_reported_total: bool = False
    transport: httpx.AsyncBaseTransport | None = None

    async def fetch_active_listings(self) -> list[dict[str, Any]]:
        if self.max_concurrency < 1:
            raise ValueError("max_concurrency must be at least 1")
        if self.max_new_id_candidates < 0:
            raise ValueError("max_new_id_candidates must not be negative")

        base_url = self.base_url.rstrip("/")
        headers = {"Accept": "text/html,application/xml", "User-Agent": "AlgoRent/0.1"}
        async with httpx.AsyncClient(
            headers=headers,
            timeout=httpx.Timeout(self.timeout_seconds),
            follow_redirects=True,
            transport=self.transport,
        ) as client:
            sitemap_response, directory_response = await asyncio.gather(
                client.get(f"{base_url}/sitemap.xml"),
                client.get(f"{base_url}/sublets/"),
            )
            sitemap_response.raise_for_status()
            directory_response.raise_for_status()

            sitemap_ids = parse_sitemap_listing_ids(sitemap_response.content)
            reported_total = parse_reported_total(directory_response.text)
            semaphore = asyncio.Semaphore(self.max_concurrency)

            async def fetch_detail(listing_id: int) -> dict[str, Any] | None:
                source_url = f"{base_url}/need-a-room/{listing_id}"
                async with semaphore:
                    response = await client.get(source_url)
                if response.status_code in (404, 410):
                    return None
                response.raise_for_status()
                return parse_listing_detail(response.text, listing_id, source_url)

            records = [
                record
                for record in await asyncio.gather(*(fetch_detail(item) for item in sitemap_ids))
                if record is not None
            ]
            seen = {int(record["id"]) for record in records}

            if len(records) > reported_total:
                raise RotatingRoomResponseError(
                    f"RotatingRoom returned {len(records)} active sitemap listings but "
                    f"reported only {reported_total}"
                )

            # The sitemap is generated periodically. Check IDs created after its
            # highest entry until the current live total has been recovered.
            next_id = max(sitemap_ids) + 1
            remaining_candidates = self.max_new_id_candidates
            while len(records) < reported_total and remaining_candidates > 0:
                batch_size = min(50, remaining_candidates)
                candidate_ids = range(next_id, next_id + batch_size)
                candidates = await asyncio.gather(*(fetch_detail(item) for item in candidate_ids))
                for record in candidates:
                    if record is None:
                        continue
                    numeric_id = int(record["id"])
                    if numeric_id not in seen:
                        seen.add(numeric_id)
                        records.append(record)
                next_id += batch_size
                remaining_candidates -= batch_size

            if len(records) != reported_total:
                message = (
                    f"Incomplete RotatingRoom response: source reports {reported_total}, "
                    f"fetched {len(records)} unique active listings"
                )
                if self.require_reported_total:
                    raise RotatingRoomResponseError(message)
                warnings.warn(
                    f"{message}. The remaining records are not present in the public sitemap "
                    "or newer public ID range.",
                    RuntimeWarning,
                    stacklevel=2,
                )
            return records
