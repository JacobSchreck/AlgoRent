# AlgoRent Backend

Java 21 + Spring Boot 3.5 REST API. Postgres schema is managed by Flyway.

## Run it locally

1. Start the database from the repository root: `docker compose up -d`
2. From `backend/`:

   ```bash
   ./mvnw spring-boot:run
   ```

   Or open `backend/` in IntelliJ and run `AlgoRentApplication`.
3. Check it is up: <http://localhost:8080/actuator/health> should return `{"status":"UP"}`.

On startup Flyway applies any new migrations in `src/main/resources/db/migration`.

Requires JDK 21. `./mvnw` downloads the right Maven version automatically (or use IntelliJ's bundled Maven).

### Configuration

The database settings use the same variable names as `dataPipeline/.env`. There are no defaults:
set them before starting the backend. `start-local.sh` / `start-local.bat` set everything for the
local Docker database.

| Variable | Notes |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | **Required.** Local Docker: `localhost`, `5433`, `algorent`, `algorent`, `algorent` |
| `SPRING_DATASOURCE_URL` | Optional. The default URL requires SSL (for Supabase). The local Docker database has no SSL, so set `jdbc:postgresql://localhost:5433/algorent?sslmode=disable` |
| `PORT` | Default `8080` |
| `CORS_ALLOWED_ORIGINS` | Default `http://localhost:3000` (comma-separated) |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` | SMTP server for verification codes. Default `localhost:587` |
| `MAIL_ENABLED` | Default `true`. Set `false` to skip email and print verification codes in the backend log instead. The local start scripts do this |
| `SESSION_COOKIE_SAME_SITE`, `SESSION_COOKIE_SECURE` | Default `lax` and `false`. If the website and the API are on different domains, set `none` and `true` (needs HTTPS), or sign-in won't stick |

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
| `lat`, `lng` | number | A point to measure from, such as a campus or workplace. Give both or neither. Adds `distanceMiles` to every result. |
| `radiusMiles` | number | Only listings within this many miles of `lat`/`lng` (more than 0, at most 100). Needs `lat` and `lng`. Listings without coordinates are left out. |
| `sort` | text | `price_asc` (default), `price_desc`, `newest`, `available_soonest`, `distance` (nearest first; needs `lat` and `lng`). Listings without a price, date or location sort last. |
| `page` | integer | Starts at 0. Default 0. |
| `size` | integer | 1 to 100. Default 20. |

**Date matching:** a listing matches when it is available for the whole stay: `available_from` on or before `moveIn`, and `available_until` on or after `moveOut`. A listing with no `available_from` or `available_until` counts as open on that side, because scraped listings often leave dates out. Listings with an approved flag are excluded.

**Distance:** straight-line ("as the crow flies") miles from `lat`/`lng`, rounded to 2 decimals. `distanceMiles` is `null` when the search has no location or the listing has no coordinates.

**Example**

```
GET /api/listings/search?city=Gainesville&moveIn=2027-05-15&moveOut=2027-08-10&maxRent=900&furnished=true
```

Within 3 miles of UF (Century Tower), nearest first:

```
GET /api/listings/search?city=Gainesville&lat=29.6487&lng=-82.3433&radiusMiles=3&sort=distance
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
      "thumbnailUrl": "https://img.example.com/1-first.jpg",
      "distanceMiles": null
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

### `GET /api/listings/{id}`

One listing with every field and all of its photos, for the listing detail page.

```
GET /api/listings/42
```

Returns the same fields as a search result, plus `description`, `securityDeposit`, `squareFeet`, `parkingAvailable`, `laundryAvailable`, `petsAllowed`, `contactName`, `contactEmail`, `contactPhone`, `status`, `lastSeenAt`, and `imageUrls` (every photo, in display order, instead of a single `thumbnailUrl`).

Listings that are no longer active are still returned, with their `status` (for example `REMOVED`), so a saved listing can be shown as "no longer available". An unknown id returns `404` with title `Listing not found`. A non-numeric id returns `400`.

### `GET /api/listings/merge`

For a stay no single listing covers: finds two back-to-back listings in a city that cover it
together (the first starts by `moveIn`, the second starts the day after the first ends or sooner
and runs to `moveOut`). Takes `city`, `moveIn` and `moveOut`. Returns the two listings in order, or
`[]`. Reported listings and link-only listings (their dates are hidden) are never used.

### Accounts: `/api/auth/*`

Session-based sign-in. The browser must send cookies: `fetch(url, { credentials: "include" })`.

| Endpoint | Body | Success | Errors |
| --- | --- | --- | --- |
| `POST /api/auth/signup` | `{"fullName", "email", "password"}` | `201`, emails a 6-digit code | `400` invalid input (password under 8 characters, bad email), `409` email already used, `503` the email couldn't be sent (the account is not created) |
| `POST /api/auth/verify` | `{"email", "code"}` | `200`, marks the email verified | `400` wrong or expired code. A code stops working after 5 wrong tries or 10 minutes |
| `POST /api/auth/resend` | `{"email"}` | `200` with the same message whether or not the account exists. Sends a new code only to unverified accounts, at most once a minute | `400` bad email, `503` the email couldn't be sent |
| `POST /api/auth/login` | `{"email", "password"}` | `200`, starts a session | `400` missing fields, `401` wrong email or password, `403` email not verified, `429` 5 wrong passwords in 15 minutes |
| `GET /api/auth/me` | none | `200` `{"id", "email", "firstName", "lastName", "role"}` | `401` not signed in |
| `POST /api/auth/logout` | none | `200`, ends the session | none |

Emails are stored lower-case, and passwords are stored only as bcrypt hashes. Errors return `{"message": "..."}`.

**Verification:** `users.email_verified_at` and `users.phone_verified_at` are `NULL` until the user verifies (migration V3). Verification codes go in `verification_tokens`. Store only a hash of each code, with an expiry, and set `used_at` once it has been used.

### Listing moderation

Signed-in users can submit one pending report per listing:

```http
POST /api/listings/42/flags
Content-Type: application/json

{"reason":"SCAM","details":"The contact requested payment off-platform."}
```

Valid reasons are `SCAM`, `INACCURATE`, `UNAVAILABLE`, `DUPLICATE`, `INAPPROPRIATE`, and `OTHER`. Details are optional and limited to 1,000 characters.

Users with the `ADMIN` role can manage the queue. Approving a report sets the listing's `flagged`
column to `TRUE`, closes its other pending reports, and removes the listing from search and detail
responses. Dismissing a report leaves the listing visible.

```http
GET /api/moderation/flags
PATCH /api/moderation/flags/{flagId}

{"status":"APPROVED"}
```

Promote a trusted local account explicitly; public signup always creates a regular user:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

### Saved listings: `/api/saved`

Each signed-in user's saved listings, with the status and notes shown on the Saved page. Every
endpoint needs a signed-in session (send cookies with `credentials: "include"`), and a user only
sees their own list. Signed out, every endpoint returns `401`.

| Endpoint | Body | Result |
| --- | --- | --- |
| `GET /api/saved` | none | `200` `[{"id", "status", "notes": [...]}]`, oldest first |
| `PUT /api/saved/{listingId}` | `{"status", "notes": [...]}` | `200` with the saved item. Saves the listing, or replaces its status and notes |
| `DELETE /api/saved/{listingId}` | none | `204`. Removes it and its notes |

- `status` is one of `Interested` (the default), `Messaged host`, `Toured` or `Applied`.
- Blank notes are dropped. A listing can have up to 20 notes of up to 2,000 characters each.
- Errors: `400` for a bad status or note, and `404` for an unknown listing.

The data is in the `favorites` and `favorite_notes` tables (migration V6). The Saved page used to keep
this list in the browser. The first time a user opens it signed in, anything saved in the browser is
moved into their account.

### `GET /actuator/health`

Returns `{"status":"UP"}` when the app and its database connection are healthy.
