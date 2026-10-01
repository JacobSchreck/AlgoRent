from datetime import date
from decimal import Decimal
import unittest

from dataPipeline.models import validate_listing
from dataPipeline.normalize import normalize_and_validate_reletme, normalize_reletme


class NormalizeReletMeTest(unittest.TestCase):
    def test_maps_reletme_record_to_existing_algorent_contract(self) -> None:
        raw = {
            "id": "listing-1", "title": "Two bedroom near campus",
            "city": " Gainesville ", "state": "FL", "zip": "32601",
            "rent": "$1,122.50", "beds": 2, "baths": "1.5", "sqft": 942,
            "lease_start": "2027-05-01", "lease_end": "2027-08-15",
            "property_type": "Apartment", "lease_type": "entire-place",
            "pet_friendly": False,
        }

        listing = normalize_reletme(raw, lambda item_id: f"https://example.com/{item_id}")

        self.assertEqual(listing.external_id, "listing-1")
        self.assertEqual(listing.source_url, "https://example.com/listing-1")
        self.assertEqual(listing.city, "Gainesville")
        self.assertEqual(listing.monthly_rent, Decimal("1122.50"))
        self.assertEqual(listing.bathrooms, Decimal("1.5"))
        self.assertEqual(listing.available_from, date(2027, 5, 1))
        self.assertEqual(listing.available_until, date(2027, 8, 15))
        self.assertEqual(listing.property_type, "apartment")
        self.assertEqual(listing.listing_type, "entire_unit")
        self.assertFalse(listing.pets_allowed)
        self.assertIsNone(listing.furnished)
        self.assertEqual(validate_listing(listing), ())

    def test_rejects_invalid_listing_without_rejecting_the_batch(self) -> None:
        raw_records = [
            {"id": "good", "title": "Valid", "city": "Austin", "rent": 800,
             "lease_start": "2027-05-01", "lease_end": "2027-08-01"},
            {"id": "bad", "title": "Invalid date window", "city": "Austin", "rent": -1,
             "lease_start": "2027-09-01", "lease_end": "2027-08-01"},
        ]

        valid, failures = normalize_and_validate_reletme(
            raw_records, lambda item_id: f"https://example.com/{item_id}",
        )

        self.assertEqual([listing.external_id for listing in valid], ["good"])
        self.assertEqual(len(failures), 1)
        self.assertEqual(failures[0].external_id, "bad")
        self.assertIn("monthly_rent must be greater than zero", failures[0].reasons)
        self.assertIn("available_from must not be after available_until", failures[0].reasons)

    def test_rejects_present_but_malformed_typed_values(self) -> None:
        raw = {"id": "bad-types", "title": "Bad types", "city": "Austin",
               "rent": "ask", "lease_start": "not-a-date"}

        valid, failures = normalize_and_validate_reletme(
            [raw], lambda item_id: f"https://example.com/{item_id}",
        )

        self.assertEqual(valid, [])
        self.assertIn("rent has an invalid value", failures[0].reasons)
        self.assertIn("lease_start has an invalid value", failures[0].reasons)


if __name__ == "__main__":
    unittest.main()
