import unittest

from dataPipeline.database import _sync_listing_images


class FakeCursor:
    def __init__(self, existing: tuple[str, ...]) -> None:
        self.existing = existing
        self.executed: list[tuple[str, tuple[object, ...]]] = []
        self.inserted: list[tuple[int, str, int]] = []

    def execute(self, sql: str, params: tuple[object, ...]) -> None:
        self.executed.append((sql, params))

    def fetchall(self) -> list[tuple[str]]:
        return [(url,) for url in self.existing]

    def executemany(self, sql: str, params: object) -> None:
        self.inserted = list(params)


class SyncListingImagesTest(unittest.TestCase):
    def test_does_not_rewrite_unchanged_images(self) -> None:
        urls = ("https://images.example.com/one.jpg",)
        cursor = FakeCursor(urls)

        _sync_listing_images(cursor, 7, urls)

        self.assertEqual(len(cursor.executed), 1)
        self.assertEqual(cursor.inserted, [])

    def test_replaces_changed_images_in_source_order(self) -> None:
        cursor = FakeCursor(("https://images.example.com/old.jpg",))
        urls = (
            "https://images.example.com/front.jpg",
            "https://images.example.com/kitchen.jpg",
        )

        _sync_listing_images(cursor, 7, urls)

        self.assertEqual(len(cursor.executed), 2)
        self.assertIn("DELETE FROM listing_images", cursor.executed[1][0])
        self.assertEqual(
            cursor.inserted,
            [
                (7, "https://images.example.com/front.jpg", 0),
                (7, "https://images.example.com/kitchen.jpg", 1),
            ],
        )

    def test_clears_images_removed_by_source(self) -> None:
        cursor = FakeCursor(("https://images.example.com/old.jpg",))

        _sync_listing_images(cursor, 7, ())

        self.assertEqual(len(cursor.executed), 2)
        self.assertIn("DELETE FROM listing_images", cursor.executed[1][0])
        self.assertEqual(cursor.inserted, [])


if __name__ == "__main__":
    unittest.main()
