import html
import json
import unittest

import httpx

from dataPipeline.normalize import normalize_and_validate_rotatingroom, normalize_rotatingroom
from dataPipeline.scrapers.rotatingroom import (
    RotatingRoomClient,
    RotatingRoomResponseError,
    parse_listing_detail,
    parse_reported_total,
    parse_sitemap_listing_ids,
)


def inertia_document(component: str, props: dict) -> str:
    payload = html.escape(
        json.dumps({"component": component, "props": props}), quote=True,
    )
    return f'<html><body><div id="app" data-page="{payload}"></div></body></html>'


def detail_document(listing_id: int, *, status: str = "active") -> str:
    room = {
        "id": listing_id,
        "status": status,
        "title": "Private room near the hospital",
        "description": "This must not enter AlgoRent.",
        "rent": 900,
        "bedrooms": 2,
        "bathrooms": 1,
        "type": "private_room",
        "city": {"name": "Gainesville", "state": "FL"},
        "address": {"address1": "Private address", "city": "Gainesville", "state": "FL"},
        "location": {"lat": 29.65, "lon": -82.32},
        "future_availbility": {"from": "2026-12-01", "to": "2027-05-31"},
        "availabilities": [],
        "amenities": ["fully_furnished", "utilities_included", "onsite_laundry"],
        "images": [{"path": "https://images.example/private.jpg"}],
        "user": {"id": 123, "email": "private@example.com"},
    }
    return inertia_document("NeedRoom/Details", {"room": room})


def sitemap(*listing_ids: int) -> bytes:
    urls = "".join(
        f"<url><loc>https://rotatingroom.com/need-a-room/{item}</loc></url>"
        for item in listing_ids
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"{urls}</urlset>"
    ).encode()


class ParseRotatingRoomTest(unittest.TestCase):
    def test_parses_only_display_and_filter_fields(self) -> None:
        record = parse_listing_detail(
            detail_document(101), 101, "https://rotatingroom.com/need-a-room/101",
        )

        self.assertIsNotNone(record)
        assert record is not None
        self.assertEqual(record["title"], "Private room near the hospital")
        self.assertEqual(record["city"], "Gainesville")
        self.assertEqual(record["latitude"], 29.65)
        self.assertEqual(record["photos"], [])
        self.assertNotIn("description", record)
        self.assertNotIn("address", record)
        self.assertNotIn("user", record)

    def test_parses_sitemap_ids_and_live_total(self) -> None:
        self.assertEqual(parse_sitemap_listing_ids(sitemap(101, 102)), [101, 102])
        directory = inertia_document("Pages/Sublets/SubletsHub", {"totalActiveListings": 2})
        self.assertEqual(parse_reported_total(directory), 2)

    def test_normalizes_filter_fields_without_restricted_content(self) -> None:
        raw = parse_listing_detail(
            detail_document(101), 101, "https://rotatingroom.com/need-a-room/101",
        )
        assert raw is not None

        listing = normalize_rotatingroom(raw)

        self.assertEqual(listing.source, "rotatingroom")
        self.assertEqual(listing.listing_type, "private_room")
        self.assertEqual(str(listing.monthly_rent), "900")
        self.assertEqual(listing.city, "Gainesville")
        self.assertIsNone(listing.description)
        self.assertEqual(listing.image_urls, ())

    def test_rejects_invalid_filter_metadata(self) -> None:
        raw = parse_listing_detail(
            detail_document(101), 101, "https://rotatingroom.com/need-a-room/101",
        )
        assert raw is not None
        raw["latitude"] = "not-a-coordinate"

        listings, failures = normalize_and_validate_rotatingroom([raw])

        self.assertEqual(listings, [])
        self.assertIn("latitude has an invalid value", failures[0].reasons)


class RotatingRoomClientTest(unittest.IsolatedAsyncioTestCase):
    async def test_fetches_all_sitemap_listings(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path == "/sitemap.xml":
                return httpx.Response(200, content=sitemap(101, 102))
            if request.url.path == "/sublets/":
                return httpx.Response(
                    200,
                    text=inertia_document(
                        "Pages/Sublets/SubletsHub", {"totalActiveListings": 2},
                    ),
                )
            listing_id = int(request.url.path.rsplit("/", 1)[1])
            return httpx.Response(200, text=detail_document(listing_id))

        records = await RotatingRoomClient(
            transport=httpx.MockTransport(handler),
        ).fetch_active_listings()

        self.assertEqual([record["id"] for record in records], ["101", "102"])

    async def test_replaces_stale_sitemap_entry_with_newer_active_id(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path == "/sitemap.xml":
                return httpx.Response(200, content=sitemap(101, 102))
            if request.url.path == "/sublets/":
                return httpx.Response(
                    200,
                    text=inertia_document(
                        "Pages/Sublets/SubletsHub", {"totalActiveListings": 2},
                    ),
                )
            listing_id = int(request.url.path.rsplit("/", 1)[1])
            if listing_id in (101, 103):
                return httpx.Response(200, text=detail_document(listing_id))
            return httpx.Response(410 if listing_id == 102 else 404)

        records = await RotatingRoomClient(
            max_new_id_candidates=50,
            transport=httpx.MockTransport(handler),
        ).fetch_active_listings()

        self.assertEqual([record["id"] for record in records], ["101", "103"])

    async def test_rejects_an_incomplete_nationwide_result(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path == "/sitemap.xml":
                return httpx.Response(200, content=sitemap(101, 102))
            if request.url.path == "/sublets/":
                return httpx.Response(
                    200,
                    text=inertia_document(
                        "Pages/Sublets/SubletsHub", {"totalActiveListings": 3},
                    ),
                )
            listing_id = int(request.url.path.rsplit("/", 1)[1])
            return httpx.Response(200, text=detail_document(listing_id))

        with self.assertRaisesRegex(RotatingRoomResponseError, "Incomplete"):
            await RotatingRoomClient(
                max_new_id_candidates=0,
                require_reported_total=True,
                transport=httpx.MockTransport(handler),
            ).fetch_active_listings()


if __name__ == "__main__":
    unittest.main()
