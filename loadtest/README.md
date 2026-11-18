# Load test

Checks the app stays fast with the 5,000 demo listings (sprint 5).

Start the app with `start-local.bat` or `./start-local.sh`, then in another terminal:

```bash
python3 loadtest/load_test.py                          # 25 users, 30 seconds
python3 loadtest/load_test.py --users 50 --seconds 60
```

It sends a mix of searches and listing page requests. Passes if 95% finish under 500 ms and under 1% fail.

## Results (Nov 14, MacBook Pro, everything running locally)

| Request | Count | Errors | Avg ms | p95 ms |
| --- | ---: | ---: | ---: | ---: |
| Search by city | 63,147 | 0 | 4.7 | 9.3 |
| Search with dates and filters | 31,579 | 0 | 4.7 | 9.3 |
| Search by distance | 23,755 | 0 | 5.6 | 10.4 |
| Search page 3 | 7,860 | 0 | 5.1 | 9.5 |
| Listing detail | 31,169 | 0 | 4.1 | 8.5 |
| **All** | **157,510** | **0** | **4.7** | **9.3** |

About 5,250 requests a second with no errors, so it passed easily.
