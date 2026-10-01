import unittest

import httpx

from dataPipeline.scrapers.reletme import ReletMeClient, ReletMeResponseError


class ReletMeClientTest(unittest.IsolatedAsyncioTestCase):
    async def test_fetches_all_pages_with_the_public_active_filter(self) -> None:
        ranges: list[str] = []

        def handler(request: httpx.Request) -> httpx.Response:
            ranges.append(request.headers["Range"])
            self.assertEqual(request.url.params["status"], "eq.active")
            self.assertIn("id", request.url.params["select"])
            self.assertEqual(request.headers["apikey"], "test-key")
            self.assertEqual(request.headers["Prefer"], "count=exact")
            if request.headers["Range"] == "0-1":
                return httpx.Response(
                    200, headers={"Content-Range": "0-1/3"},
                    json=[{"id": "1"}, {"id": "2"}],
                )
            return httpx.Response(
                200, headers={"Content-Range": "2-2/3"}, json=[{"id": "3"}],
            )

        client = ReletMeClient(
            "https://project.supabase.co", "test-key", page_size=2,
            transport=httpx.MockTransport(handler),
        )
        records = await client.fetch_active_listings()

        self.assertEqual([record["id"] for record in records], ["1", "2", "3"])
        self.assertEqual(ranges, ["0-1", "2-3"])

    async def test_rejects_non_array_payload(self) -> None:
        client = ReletMeClient(
            "https://project.supabase.co", "test-key",
            transport=httpx.MockTransport(
                lambda request: httpx.Response(
                    200, headers={"Content-Range": "0-0/1"}, json={"id": "1"},
                )
            ),
        )
        with self.assertRaises(ReletMeResponseError):
            await client.fetch_active_listings()

    async def test_rejects_incomplete_or_duplicate_results(self) -> None:
        incomplete = ReletMeClient(
            "https://project.supabase.co", "test-key",
            transport=httpx.MockTransport(
                lambda request: httpx.Response(
                    200, headers={"Content-Range": "0-0/2"}, json=[{"id": "1"}],
                )
            ),
        )
        with self.assertRaisesRegex(ReletMeResponseError, "Incomplete"):
            await incomplete.fetch_active_listings()

        duplicate = ReletMeClient(
            "https://project.supabase.co", "test-key", page_size=3,
            transport=httpx.MockTransport(
                lambda request: httpx.Response(
                    200, headers={"Content-Range": "0-1/2"},
                    json=[{"id": "1"}, {"id": "1"}],
                )
            ),
        )
        with self.assertRaisesRegex(ReletMeResponseError, "duplicate"):
            await duplicate.fetch_active_listings()


if __name__ == "__main__":
    unittest.main()
