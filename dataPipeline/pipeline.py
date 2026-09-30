from database import insert_source, insert_listing


source_id = insert_source(
    "Test Housing Site",
    "https://example.com",
    "PROPERTY_SITE"
)

listing = {
    "source_id": source_id,
    "external_id": "test-001",
    "source_url": "https://example.com/listing/test-001",

    "title": "1 Bedroom Summer Sublease",
    "description": "Furnished apartment near campus.",

    "property_type": "APARTMENT",
    "listing_type": "SUBLEASE",

    "monthly_rent": 950,
    "bedrooms": 1,
    "bathrooms": 1,

    "address": "123 Example St",
    "city": "Gainesville",
    "state": "FL",
    "zip_code": "32601",

    "available_from": "2027-05-01",
    "available_until": "2027-08-15",

    "furnished": True,
    "utilities_included": False,
    "parking_available": True,
    "laundry_available": True,
    "pets_allowed": False,
}

listing_id = insert_listing(listing)

print(f"Inserted listing: {listing_id}")