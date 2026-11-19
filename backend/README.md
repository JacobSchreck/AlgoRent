# AlgoRent Backend

Java 21 + Spring Boot 3.5 REST API. Flyway manages the database tables.

## Running it

Easiest is `start-local.bat` / `./start-local.sh` from the repo root, which sets everything up.

To run just the backend: start the database with `docker compose up -d`, set the variables below, then run
`./mvnw spring-boot:run` in `backend/` (or run `AlgoRentApplication` in IntelliJ).
<http://localhost:8080/actuator/health> should say `{"status":"UP"}`.

| Variable | Notes |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Required. Local docker is `localhost`, `5433`, and `algorent` for the rest |
| `SPRING_DATASOURCE_URL` | The default needs SSL (Supabase). Locally use `jdbc:postgresql://localhost:5433/algorent?sslmode=disable` |
| `CORS_ALLOWED_ORIGINS` | Default `http://localhost:3000` |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` | Email server for sign-up codes |
| `MAIL_ENABLED` | `false` prints codes in the backend log instead of emailing them (the start scripts do this) |
| `SESSION_COOKIE_SAME_SITE`, `SESSION_COOKIE_SECURE` | Set to `none` and `true` if the frontend and API are on different domains |
| `PORT` | Default `8080` |

Tests: `mvn verify`. Some tests start Postgres in Docker and are skipped if Docker isn't running (CI always runs them).

## Database changes

Don't edit a migration that's already merged, add a new `V<n>__description.sql` instead.
To start over with an empty database: `docker compose down -v && docker compose up -d`.

## API

Endpoints that need an account use the session cookie, so the frontend sends `credentials: "include"`.

### Listings

| Endpoint | What it does |
| --- | --- |
| `GET /api/listings/search` | Search a city. Returns `results`, `page`, `size`, `totalResults`, `totalPages` |
| `GET /api/listings/{id}` | One listing with all fields and photos. Removed listings still come back with their `status` |
| `GET /api/listings/merge?city=&moveIn=&moveOut=` | Two back-to-back listings that cover the stay together, or `[]` |

Search parameters: `city` (required), `state`, `moveIn` + `moveOut`, `minRent`, `maxRent`, `propertyType`,
`listingType`, `minBedrooms`, `furnished`, `utilitiesIncluded`, `lat` + `lng`, `radiusMiles`, `sort`
(`price_asc`, `price_desc`, `newest`, `available_soonest`, `distance`), `page` (from 0) and `size` (max 100).

A listing matches dates if it's available for the whole stay. Missing dates count as open since scraped
listings often don't have them. Reported listings never show up. Bad parameters return `400` with an
`errors` list.

Example: `GET /api/listings/search?city=Gainesville&lat=29.6487&lng=-82.3433&radiusMiles=3&sort=distance`

### Accounts

| Endpoint | Body | Notes |
| --- | --- | --- |
| `POST /api/auth/signup` | `fullName`, `email`, `password` | Emails a 6 digit code. `409` if the email is taken |
| `POST /api/auth/verify` | `email`, `code` | Codes expire after 10 minutes or 5 wrong tries |
| `POST /api/auth/resend` | `email` | At most once a minute |
| `POST /api/auth/login` | `email`, `password` | `403` if not verified, `429` after 5 wrong passwords in 15 minutes |
| `GET /api/auth/me` | | Current user, or `401` |
| `POST /api/auth/logout` | | |

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

### Saved listings

| Endpoint | Notes |
| --- | --- |
| `GET /api/saved` | The user's saved listings with `status` and `notes` |
| `PUT /api/saved/{listingId}` | Body `{"status", "notes"}`. Status is `Interested`, `Messaged host`, `Toured` or `Applied`. Up to 20 notes |
| `DELETE /api/saved/{listingId}` | |
| `GET`, `POST /api/saved/merges`, `DELETE /api/saved/merges/{id}` | Saved merged stays |

All of these return `401` when signed out.
