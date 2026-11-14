# Load test

Sprint 5 goal: the app stays fast with 5,000 listings.

## How to run it

1. Start everything with the 5,000 demo listings: `start-local.bat` on Windows or `./start-local.sh` on Mac.
2. In another terminal, from the repository root:

```bash
python3 loadtest/load_test.py                          # 25 users for 30 seconds
python3 loadtest/load_test.py --users 50 --seconds 60
```

Each user sends one request after another with no pause: 40% city searches, 20% searches with
dates and filters, 15% distance searches, 5% third-page searches and 20% listing pages.
The run passes if 95% of requests finish in under 500 ms and under 1% fail.

## Results

### Database only (Nov 14)

The exact SQL the API runs, against the 5,000 demo listings on PostgreSQL 16. Each request type
ran in all 25 demo cities, with 10 connections at once (Spring Boot's default connection pool size),
for 30 seconds.

| Request | Count | Avg ms | p50 ms | p95 ms | p99 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Search by city | 26,956 | 3.6 | 3.1 | 8.1 | 11.4 |
| Search with dates and filters | 13,514 | 4.0 | 3.5 | 9.3 | 13.1 |
| Search by distance | 10,226 | 8.8 | 8.1 | 17.4 | 23.7 |
| Search page 3 | 3,323 | 5.9 | 5.3 | 11.9 | 16.0 |
| Listing detail | 13,592 | 2.8 | 2.3 | 6.6 | 9.9 |
| **All requests** | **67,611** | **4.4** | **3.4** | **11.2** | **17.0** |

That's about 2,250 requests per second. The database uses a small part of the 500 ms budget,
and distance search is the slowest because it computes a distance for every listing in the city.

### Full API (Spring Boot + database), Nov 14: PASS

`python3 loadtest/load_test.py` (25 users for 30 seconds), run against `./start-local.sh` with the
5,000 demo listings on a MacBook Pro. The backend, the database and the test all ran on the same
computer, so there is no network delay in these numbers.

| Request | Count | Errors | Avg ms | p50 ms | p95 ms | p99 ms | Max ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Search by city | 63,147 | 0 | 4.7 | 4.1 | 9.3 | 12.9 | 40.3 |
| Search with dates and filters | 31,579 | 0 | 4.7 | 4.1 | 9.3 | 13.2 | 28.0 |
| Search by distance | 23,755 | 0 | 5.6 | 5.0 | 10.4 | 14.2 | 34.0 |
| Search page 3 | 7,860 | 0 | 5.1 | 4.5 | 9.5 | 12.9 | 27.9 |
| Listing detail | 31,169 | 0 | 4.1 | 3.5 | 8.5 | 12.1 | 54.7 |
| **All requests** | **157,510** | **0** | **4.7** | **4.2** | **9.3** | **13.1** | **54.7** |

That's about 5,250 requests per second. 95% of requests finished within 9.3 ms (target: under 500 ms),
with no errors (target: under 1%).
