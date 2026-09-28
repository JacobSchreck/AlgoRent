# AlgoRent ERD

The schema lives in the Flyway migrations at `backend/src/main/resources/db/migration`. `schema.sql` in this folder is the original V1 snapshot. GitHub renders the diagram below.

```mermaid
erDiagram
    users ||--o{ favorites : saves
    listings ||--o{ favorites : "saved in"
    sources ||--o{ listings : provides
    listings ||--o{ listing_images : has
    users ||--o{ inquiries : makes
    listings ||--o{ inquiries : "asked about in"
    inquiries ||--o{ messages : logs

    users {
        serial id PK
        varchar email UK
        varchar password_hash
        varchar first_name
        varchar last_name
        timestamp created_at
        timestamp updated_at
    }

    sources {
        serial id PK
        varchar name UK
        text base_url
        varchar source_type
        boolean enabled
        timestamp created_at
    }

    listings {
        serial id PK
        integer source_id FK
        text external_id "unique per source"
        text source_url
        text title
        text description
        varchar property_type
        varchar listing_type
        numeric monthly_rent
        numeric security_deposit
        numeric bedrooms
        numeric bathrooms
        integer square_feet
        text address
        varchar city
        varchar state
        varchar zip_code
        double latitude
        double longitude
        date available_from
        date available_until
        boolean furnished
        boolean utilities_included
        boolean parking_available
        boolean laundry_available
        boolean pets_allowed
        varchar contact_name
        varchar contact_email
        varchar contact_phone
        varchar status "ACTIVE, ..."
        timestamp first_seen_at
        timestamp last_seen_at
        timestamp created_at
        timestamp updated_at
    }

    listing_images {
        serial id PK
        integer listing_id FK
        text image_url
        integer display_order
    }

    favorites {
        integer user_id PK, FK
        integer listing_id PK, FK
        timestamp created_at
    }

    inquiries {
        serial id PK
        integer user_id FK
        integer listing_id FK
        date requested_from
        date requested_until
        varchar status "DRAFT, SENT, REPLIED, ACCEPTED, DECLINED, WITHDRAWN"
        text notes
        timestamp created_at
        timestamp updated_at
    }

    messages {
        serial id PK
        integer inquiry_id FK
        varchar direction "OUTBOUND or INBOUND"
        text body
        timestamp sent_at
        timestamp created_at
    }
```

## Notes

- **Availability** is stored on the listing (`available_from`, `available_until`), not in a separate table. Each scraped listing has a single date window. If we later need several windows per listing (calendar sync), that becomes its own table.
- **Hosts are not users.** Listings come from other sites, so inquiries and messages belong to the guest. `messages.direction` records whether the guest sent the message or received it.
- **Deletes cascade** from users and listings to favorites, images, inquiries and messages.
- **Search indexes** (V2) are partial indexes on `lower(city)` for `ACTIVE` listings, combined with dates and with rent.
