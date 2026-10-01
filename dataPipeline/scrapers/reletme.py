from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import httpx


FIELDS = (
    "id", "title", "city", "state", "zip", "address", "rent", "beds", "baths",
    "lease_start", "lease_end", "property_type", "pet_friendly", "sqft",
    "lease_type", "security_deposit", "created_at",
)


class ReletMeResponseError(RuntimeError):
    """The source returned a successful HTTP response with an invalid payload."""


def _exact_total(response: httpx.Response) -> int:
    content_range = response.headers.get("Content-Range")
    if not content_range or "/" not in content_range:
        raise ReletMeResponseError("ReletMe response did not include an exact Content-Range count")
    total_text = content_range.rsplit("/", 1)[1]
    if total_text == "*":
        raise ReletMeResponseError("ReletMe did not return the requested exact listing count")
    try:
        return int(total_text)
    except ValueError as exc:
        raise ReletMeResponseError("ReletMe returned an invalid Content-Range count") from exc


@dataclass(frozen=True, slots=True)
class ReletMeClient:
    """Read-only client for the public listing query used by ReletMe's web app."""

    supabase_url: str
    anon_key: str
    page_size: int = 1000
    timeout_seconds: float = 20.0
    transport: httpx.AsyncBaseTransport | None = None

    async def fetch_active_listings(self) -> list[dict[str, Any]]:
        if not self.supabase_url.strip() or not self.anon_key.strip():
            raise ValueError("ReletMe Supabase URL and anon key are required")
        if self.page_size < 1:
            raise ValueError("page_size must be at least 1")

        endpoint = f"{self.supabase_url.rstrip('/')}/rest/v1/listings"
        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {self.anon_key}",
            "Prefer": "count=exact",
        }
        params = {
            "select": ",".join(FIELDS),
            "status": "eq.active",
            "order": "created_at.desc,id.asc",
        }

        records: list[dict[str, Any]] = []
        reported_total: int | None = None
        async with httpx.AsyncClient(timeout=self.timeout_seconds, transport=self.transport) as client:
            offset = 0
            while True:
                response = await client.get(
                    endpoint,
                    headers={**headers, "Range": f"{offset}-{offset + self.page_size - 1}"},
                    params=params,
                )
                response.raise_for_status()
                page_total = _exact_total(response)
                if reported_total is None:
                    reported_total = page_total
                elif page_total != reported_total:
                    raise ReletMeResponseError("ReletMe listing count changed during pagination")
                try:
                    page = response.json()
                except ValueError as exc:
                    raise ReletMeResponseError("ReletMe returned malformed JSON") from exc
                if not isinstance(page, list) or any(not isinstance(item, dict) for item in page):
                    raise ReletMeResponseError("ReletMe response must be a JSON array of objects")
                records.extend(page)
                if len(page) < self.page_size:
                    break
                offset += self.page_size

        if reported_total != len(records):
            raise ReletMeResponseError(
                f"Incomplete ReletMe response: source reports {reported_total}, fetched {len(records)}"
            )
        external_ids = [record.get("id") for record in records]
        if any(external_id is None for external_id in external_ids):
            raise ReletMeResponseError("ReletMe returned a listing without an id")
        if len(set(external_ids)) != len(external_ids):
            raise ReletMeResponseError("ReletMe returned duplicate listing ids")
        return records


def source_url_builder(public_url: str, listing_url_template: str | None = None) -> Callable[[str], str]:
    """Build source links without assuming ReletMe's client-side route."""

    base_url = public_url.rstrip("/")
    template = listing_url_template or base_url

    def build(external_id: str) -> str:
        return template.format(external_id=external_id, id=external_id)

    return build
