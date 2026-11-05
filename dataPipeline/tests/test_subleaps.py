import json
import unittest

import httpx

from dataPipeline.normalize import normalize_and_validate_subleaps, normalize_subleaps
from dataPipeline.scrapers.subleaps import (
    SubLeapsClient,
    SubLeapsResponseError,
    parse_listing_detail,
)


ID_1 = "090aa411-b640-44cf-a08d-ccb1ad62bdc3"
ID_2 = "1b7413dc-deb0-408b-b137-ff6b9907a6f7"


def browse_html(total: int, ids: list[str], next_page: int | None = None) -> str:
    links = "".join(f'<a href="/listings/{item}">Listing</a>' for item in ids)
    next_link = f'<a href="/browse?page={next_page}">Next</a>' if next_page else ""
    return f"<html><body><p>{total} results found</p>{links}{next_link}</body></html>"


def detail_html(title: str = "Campus apartment") -> str:
    product = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": title,
        "description": "A furnished apartment near campus.",
        "image": [
            "https://images.example.com/front.jpg",
            "https://images.example.com/kitchen.jpg",
        ],
        "offers": {
            "@type": "Offer",
            "price": 895,
            "availabilityStarts": "2026-12-21",
            "availabilityEnds": "2027-08-06",
        },
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Champaign",
            "addressRegion": "IL",
        },
    }
    return (
        '<html><body><script type="application/ld+json">'
        + json.dumps(product)
        + '</script><p>4 bed · 2 bath</p><p>Furnished Laundry Parking</p>'
        + '<script>self.__next_f.push([1,"{\\"latitude\\":40.1,'
        + '\\"longitude\\":-88.2}"])</script></body></html>'
    )


class ParseSubLeapsDetailTest(unittest.TestCase):
    def test_parses_structured_detail_fields(self) -> None:
        record = parse_listing_detail(
            detail_html(), ID_1, f"https://subleaps.com/listings/{ID_1}",
        )

        self.assertEqual(record["id"], ID_1)
        self.assertEqual(record["title"], "Campus apartment")
        self.assertEqual(record["rent"], 895)
        self.assertEqual(record["city"], "Champaign")
        self.assertEqual(record["beds"], "4")
        self.assertEqual(record["baths"], "2")
        self.assertEqual(record["latitude"], "40.1")
        self.assertEqual(record["longitude"], "-88.2")
        self.assertEqual(len(record["photos"]), 2)
        self.assertTrue(record["furnished"])
        self.assertTrue(record["laundry_available"])
        self.assertTrue(record["parking_available"])

    def test_normalizes_to_canonical_listing(self) -> None:
        raw = parse_listing_detail(
            detail_html(), ID_1, f"https://subleaps.com/listings/{ID_1}",
        )

        listing = normalize_subleaps(raw)

        self.assertEqual(listing.source, "subleaps")
        self.assertEqual(str(listing.monthly_rent), "895")
        self.assertEqual(str(listing.bedrooms), "4")
        self.assertEqual(listing.latitude, 40.1)
        self.assertEqual(len(listing.image_urls), 2)

    def test_rejects_a_malformed_typed_value(self) -> None:
        raw = parse_listing_detail(
            detail_html(), ID_1, f"https://subleaps.com/listings/{ID_1}",
        )
        raw["rent"] = "not a price"

        listings, failures = normalize_and_validate_subleaps([raw])

        self.assertEqual(listings, [])
        self.assertEqual(failures[0].reasons, ("rent has an invalid value",))


class SubLeapsClientTest(unittest.IsolatedAsyncioTestCase):
    async def test_accepts_react_split_result_count(self) -> None:
        split_count = browse_html(1, [ID_1]).replace(
            "1 results found", "<span>1</span> result<!-- -->s<!-- --> found",
        )

        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path == "/browse":
                return httpx.Response(200, text=split_count)
            if request.url.path == f"/listings/{ID_1}":
                return httpx.Response(200, text=detail_html())
            return httpx.Response(404)

        records = await SubLeapsClient(
            transport=httpx.MockTransport(handler),
        ).fetch_active_listings()

        self.assertEqual(len(records), 1)

    async def test_fetches_every_paginated_listing_and_excludes_create_route(self) -> None:
        requested: list[str] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requested.append(request.url.path)
            if request.url.path == "/browse" and request.url.params.get("page") is None:
                html = browse_html(2, [ID_1], next_page=2).replace(
                    "</body>", '<a href="/listings/create">Create</a></body>',
                )
            elif request.url.path == "/browse" and request.url.params.get("page") == "2":
                html = browse_html(2, [ID_2])
            elif request.url.path == f"/listings/{ID_1}":
                html = detail_html("First")
            elif request.url.path == f"/listings/{ID_2}":
                html = detail_html("Second")
            else:
                return httpx.Response(404)
            return httpx.Response(200, text=html)

        client = SubLeapsClient(max_concurrency=2, transport=httpx.MockTransport(handler))
        records = await client.fetch_active_listings()

        self.assertEqual([record["id"] for record in records], [ID_1, ID_2])
        self.assertNotIn("/listings/create", requested)

    async def test_rejects_incomplete_pagination(self) -> None:
        client = SubLeapsClient(
            transport=httpx.MockTransport(
                lambda request: httpx.Response(200, text=browse_html(2, [ID_1]))
            )
        )

        with self.assertRaisesRegex(SubLeapsResponseError, "Incomplete"):
            await client.fetch_active_listings()

    async def test_rejects_duplicate_ids_across_pages(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            page = request.url.params.get("page")
            html = browse_html(2, [ID_1], next_page=2) if page is None else browse_html(2, [ID_1])
            return httpx.Response(200, text=html)

        client = SubLeapsClient(transport=httpx.MockTransport(handler))

        with self.assertRaisesRegex(SubLeapsResponseError, "duplicate"):
            await client.fetch_active_listings()


if __name__ == "__main__":
    unittest.main()
