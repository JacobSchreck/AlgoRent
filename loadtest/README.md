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

### Full API (Spring Boot + database)

Run `load_test.py` against the local backend and paste its report here.
