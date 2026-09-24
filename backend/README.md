# AlgoRent Backend

Java 21 + Spring Boot 3.5 REST API. Postgres schema is managed by Flyway.

## Run it locally

1. Start the database from the repository root: `docker compose up -d`
2. From `backend/`:

   ```bash
   mvn spring-boot:run
   ```

   Or open `backend/` in IntelliJ and run `AlgoRentApplication`.
3. Check it is up: <http://localhost:8080/actuator/health> should return `{"status":"UP"}`.

On startup Flyway applies any new migrations in `src/main/resources/db/migration`.

Requires JDK 21 and Maven 3.9+ (IntelliJ bundles Maven).

### Configuration

The database settings use the same variable names as `dataPipeline/.env`. The defaults match `docker-compose.yml`, so nothing needs to be set for local work.

| Variable | Default |
| --- | --- |
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5433` |
| `DB_NAME` | `algorent` |
| `DB_USER` | `algorent` |
| `DB_PASSWORD` | `algorent` |
| `PORT` | `8080` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` (comma-separated) |

### Tests

```bash
mvn verify
```

`ListingSearchApiTest` starts a throwaway Postgres 17 in Docker (Testcontainers), runs the migrations, and calls the real API. If Docker is not running, that test is skipped, but CI always runs it.

## Schema changes

The migrations are the source of truth for the schema. Never edit a migration that has already been merged. Add a new file instead: `V3__short_description.sql`, `V4__...`.

`V1__initial_schema.sql` is identical to `database/schema.sql`. If you built your local database by running `schema.sql` by hand, Flyway detects that, records it as V1, and applies only V2 onward.

To start over with an empty database: `docker compose down -v && docker compose up -d`.

## API

### `GET /api/listings/search`

Finds active listings in a city, optionally for a stay (move-in to move-out) and with filters.

| Parameter | Type | Notes |
| --- | --- | --- |
| `city` | text | **Required.** Case-insensitive exact match. |
| `state` | text | Case-insensitive exact match. |
| `moveIn`, `moveOut` | `YYYY-MM-DD` | Give both or neither. `moveOut` must be after `moveIn`. |
| `minRent`, `maxRent` | number | Monthly rent. Listings without a price are left out when either is set. |
| `propertyType` | text | e.g. `apartment`, `studio`, `room`, `house`. Case-insensitive. |
| `listingType` | text | e.g. `sublet`. Case-insensitive. |
| `minBedrooms` | number | Studios have 0 bedrooms. |
| `furnished` | `true`/`false` | |
| `utilitiesIncluded` | `true`/`false` | |
| `sort` | text | `price_asc` (default), `price_desc`, `newest`, `available_soonest`. Listings without a price or date sort last. |
| `page` | integer | Starts at 0. Default 0. |
| `size` | integer | 1 to 100. Default 20. |

**Date matching:** a listing matches when it is available for the whole stay: `available_from` on or before `moveIn`, and `available_until` on or after `moveOut`. A listing with no `available_from` or `available_until` counts as open on that side, because scraped listings often leave dates out.

**Example**

```
GET /api/listings/search?city=Gainesville&moveIn=2027-05-15&moveOut=2027-08-10&maxRent=900&furnished=true
```

```json
{
  "results": [
    {
      "id": 1,
      "title": "Gainesville studio near UF",
      "address": null,
      "city": "Gainesville",
      "state": "FL",
      "zipCode": null,
      "latitude": null,
      "longitude": null,
      "monthlyRent": 750.00,
      "bedrooms": 0.0,
      "bathrooms": 1.0,
      "propertyType": "studio",
      "listingType": "sublet",
      "furnished": true,
      "utilitiesIncluded": true,
      "availableFrom": "2027-05-01",
      "availableUntil": "2027-08-31",
      "sourceUrl": "https://example.com/1",
      "sourceName": "Test Source",
      "thumbnailUrl": "https://img.example.com/1-first.jpg"
    }
  ],
  "page": 0,
  "size": 20,
  "totalResults": 1,
  "totalPages": 1
}
```

Any listing field except `id`, `title`, `city` and `sourceUrl` can be `null` when the source site did not provide it. `thumbnailUrl` is the listing's first image by `display_order`.

**Errors** come back as `400` with a problem-detail body listing every problem:

```json
{
  "type": "about:blank",
  "title": "Invalid search",
  "status": 400,
  "detail": "city is required; moveOut must be after moveIn",
  "instance": "/api/listings/search",
  "errors": ["city is required", "moveOut must be after moveIn"]
}
```

A malformed value, such as `moveIn=05/20/2027` or `maxRent=cheap`, also returns `400`.

### `GET /actuator/health`

Returns `{"status":"UP"}` when the app and its database connection are healthy.
