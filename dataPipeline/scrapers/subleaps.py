from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import parse_qs, urlparse

import httpx
from bs4 import BeautifulSoup


_LISTING_PATH = re.compile(
    r"^/listings/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/?$",
    re.IGNORECASE,
)
_TOTAL = re.compile(r"\b(\d[\d,]*)\s+result\s*s?\s+found\b", re.IGNORECASE)
_BEDS_BATHS = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*(?:bed|bd)s?\b.*?"
    r"\b(\d+(?:\.\d+)?)\s*(?:bath|ba)s?\b",
    re.IGNORECASE,
)
_COORDINATES = re.compile(
    r'"latitude"\s*:\s*(-?\d+(?:\.\d+)?)\s*,\s*'
    r'"longitude"\s*:\s*(-?\d+(?:\.\d+)?)',
)


class SubLeapsResponseError(RuntimeError):
    """SubLeaps returned a successful response that did not match its public page contract."""


def _html(response: httpx.Response) -> str:
    try:
        return response.content.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise SubLeapsResponseError("SubLeaps returned non-UTF-8 HTML") from exc


def _listing_ids(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    ids: list[str] = []
    seen: set[str] = set()
    for anchor in soup.find_all("a", href=True):
        match = _LISTING_PATH.fullmatch(urlparse(anchor["href"]).path)
        if match is None:
            continue
        listing_id = match.group(1).lower()
        if listing_id not in seen:
            seen.add(listing_id)
            ids.append(listing_id)
    return ids


def _reported_total(html: str) -> int:
    # React splits the plural suffix into a separate text node:
    # ``65</span> result<!-- -->s<!-- --> found``. The matcher therefore
    # allows whitespace between "result" and its plural suffix.
    text = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)
    match = _TOTAL.search(text)
    if match is None:
        raise SubLeapsResponseError("SubLeaps browse page did not report a result count")
    return int(match.group(1).replace(",", ""))


def _has_next_page(html: str, next_page: int) -> bool:
    soup = BeautifulSoup(html, "html.parser")
    for anchor in soup.find_all("a", href=True):
        parsed = urlparse(anchor["href"])
        if parsed.path == "/browse" and parse_qs(parsed.query).get("page") == [str(next_page)]:
            return True
    return False


def _product_json_ld(soup: BeautifulSoup) -> dict[str, Any]:
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        if not script.string:
            continue
        try:
            payload = json.loads(script.string)
        except json.JSONDecodeError:
            continue
        candidates = payload.get("@graph", []) if isinstance(payload, dict) else []
        if isinstance(payload, dict):
            candidates = [payload, *candidates]
        for candidate in candidates:
            if isinstance(candidate, dict) and candidate.get("@type") == "Product":
                return candidate
    raise SubLeapsResponseError("SubLeaps detail page did not contain Product JSON-LD")


def parse_listing_detail(html: str, listing_id: str, source_url: str) -> dict[str, Any]:
    """Parse one public listing page into source-specific raw fields."""

    soup = BeautifulSoup(html, "html.parser")
    product = _product_json_ld(soup)
    offers = product.get("offers") if isinstance(product.get("offers"), dict) else {}
    address = product.get("address") if isinstance(product.get("address"), dict) else {}
    visible_text = soup.get_text(" ", strip=True)
    beds_baths = _BEDS_BATHS.search(visible_text)

    # Next.js serializes map props with escaped quotes inside its RSC payload.
    coordinates = _COORDINATES.search(html.replace(r'\"', '"'))

    images = product.get("image", [])
    if isinstance(images, str):
        images = [images]
    elif not isinstance(images, list):
        images = []

    amenities = {
        label
        for label in (
            "Furnished", "WiFi", "Air Conditioning", "Gym Access", "Laundry",
            "Parking", "Pet Friendly",
        )
        if re.search(rf"\b{re.escape(label)}\b", visible_text, re.IGNORECASE)
    }

    return {
        "id": listing_id,
        "source_url": source_url,
        "title": product.get("name"),
        "description": product.get("description"),
        "rent": offers.get("price"),
        "lease_start": offers.get("availabilityStarts"),
        "lease_end": offers.get("availabilityEnds"),
        "city": address.get("addressLocality"),
        "state": address.get("addressRegion"),
        "photos": images,
        "beds": beds_baths.group(1) if beds_baths else None,
        "baths": beds_baths.group(2) if beds_baths else None,
        "latitude": coordinates.group(1) if coordinates else None,
        "longitude": coordinates.group(2) if coordinates else None,
        "furnished": "Furnished" in amenities,
        "parking_available": "Parking" in amenities,
        "laundry_available": "Laundry" in amenities,
        "pets_allowed": "Pet Friendly" in amenities,
    }


@dataclass(frozen=True, slots=True)
class SubLeapsClient:
    """Read-only scraper for SubLeaps' public browse and listing-detail pages."""

    base_url: str = "https://subleaps.com"
    timeout_seconds: float = 20.0
    max_concurrency: int = 5
    max_pages: int = 100
    transport: httpx.AsyncBaseTransport | None = None

    async def fetch_active_listings(self) -> list[dict[str, Any]]:
        if self.max_concurrency < 1:
            raise ValueError("max_concurrency must be at least 1")
        if self.max_pages < 1:
            raise ValueError("max_pages must be at least 1")

        base_url = self.base_url.rstrip("/")
        headers = {"Accept": "text/html", "User-Agent": "AlgoRent/0.1 listing indexer"}
        async with httpx.AsyncClient(
            headers=headers,
            timeout=httpx.Timeout(self.timeout_seconds),
            follow_redirects=True,
            transport=self.transport,
        ) as client:
            listing_ids: list[str] = []
            seen: set[str] = set()
            reported_total: int | None = None

            for page in range(1, self.max_pages + 1):
                url = f"{base_url}/browse" if page == 1 else f"{base_url}/browse?page={page}"
                response = await client.get(url)
                response.raise_for_status()
                page_html = _html(response)
                if reported_total is None:
                    reported_total = _reported_total(page_html)

                page_ids = _listing_ids(page_html)
                if seen.intersection(page_ids):
                    raise SubLeapsResponseError("SubLeaps browse pages returned duplicate listing ids")
                seen.update(page_ids)
                listing_ids.extend(page_ids)

                if not _has_next_page(page_html, page + 1):
                    break
            else:
                raise SubLeapsResponseError("SubLeaps pagination exceeded the configured page limit")

            if reported_total != len(listing_ids):
                raise SubLeapsResponseError(
                    f"Incomplete SubLeaps response: source reports {reported_total}, "
                    f"fetched {len(listing_ids)} listing links"
                )

            semaphore = asyncio.Semaphore(self.max_concurrency)

            async def fetch_detail(listing_id: str) -> dict[str, Any]:
                source_url = f"{base_url}/listings/{listing_id}"
                async with semaphore:
                    response = await client.get(source_url)
                response.raise_for_status()
                return parse_listing_detail(_html(response), listing_id, source_url)

            return list(await asyncio.gather(*(fetch_detail(item) for item in listing_ids)))
