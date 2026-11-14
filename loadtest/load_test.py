# Load test for the AlgoRent API. Needs only Python 3, nothing to install.
#
#   python3 loadtest/load_test.py                          25 users for 30 seconds
#   python3 loadtest/load_test.py --users 50 --seconds 60
#   python3 loadtest/load_test.py --url http://localhost:8080
#
# Start the backend with the 5,000 demo listings first (start-local.bat or start-local.sh).
# Each "user" is a thread that sends one request after another with no pause, which is
# harder on the server than real people, who stop to read. The mix of requests is in MIX.
# The script exits with 1 if the run fails the targets at the bottom of the report.

import argparse
import http.client
import json
import random
import threading
import time
from urllib.parse import urlencode, urlsplit

# Cities in database/demo-data.sql, with the city center used for distance searches.
CITIES = [
    ("Gainesville", 29.6516, -82.3248), ("Austin", 30.2672, -97.7431), ("Atlanta", 33.7490, -84.3880),
    ("Boston", 42.3601, -71.0589), ("Chicago", 41.8781, -87.6298), ("New York", 40.7128, -74.0060),
    ("San Francisco", 37.7749, -122.4194), ("Los Angeles", 34.0522, -118.2437), ("Seattle", 47.6062, -122.3321),
    ("Denver", 39.7392, -104.9903), ("Raleigh", 35.7796, -78.6382), ("Charlotte", 35.2271, -80.8431),
    ("Washington", 38.9072, -77.0369), ("Philadelphia", 39.9526, -75.1652), ("Pittsburgh", 40.4406, -79.9959),
    ("Columbus", 39.9612, -82.9988), ("Ann Arbor", 42.2808, -83.7430), ("Nashville", 36.1627, -86.7816),
    ("Phoenix", 33.4484, -112.0740), ("Salt Lake City", 40.7608, -111.8910), ("Portland", 45.5152, -122.6784),
    ("Minneapolis", 44.9778, -93.2650), ("St. Louis", 38.6270, -90.1994), ("New Orleans", 29.9511, -90.0715),
    ("Miami", 25.7617, -80.1918),
]

# What share of requests each kind gets. Roughly what a guest does: mostly searching,
# then opening a listing.
MIX = [
    ("search by city", 40),
    ("search with dates and filters", 20),
    ("search by distance", 15),
    ("search page 3", 5),
    ("listing detail", 20),
]

# Targets the run has to meet.
MAX_P95_MS = 500
MAX_ERROR_PERCENT = 1.0


def next_summer():
    # demo-data.sql puts listings in the coming summer: this year, or next year from September on
    now = time.localtime()
    return now.tm_year + (1 if now.tm_mon >= 9 else 0)


def make_path(kind, listing_ids):
    city, lat, lng = random.choice(CITIES)
    year = next_summer()
    if kind == "search by city":
        params = {"city": city}
    elif kind == "search with dates and filters":
        params = {"city": city, "moveIn": f"{year}-05-25", "moveOut": f"{year}-08-05",
                  "maxRent": 1500, "furnished": "true"}
    elif kind == "search by distance":
        params = {"city": city, "lat": lat, "lng": lng, "radiusMiles": 3, "sort": "distance"}
    elif kind == "search page 3":
        params = {"city": city, "sort": "newest", "page": 2}
    else:
        return f"/api/listings/{random.choice(listing_ids)}"
    return "/api/listings/search?" + urlencode(params)


class Client:
    """One keep-alive connection, reopened if the server drops it."""

    def __init__(self, url):
        parts = urlsplit(url)
        self.https = parts.scheme == "https"
        self.host = parts.netloc
        self.conn = None

    def get(self, path):
        """Returns (status, body, milliseconds). Status is 0 if the request failed."""
        started = time.perf_counter()
        try:
            if self.conn is None:
                make = http.client.HTTPSConnection if self.https else http.client.HTTPConnection
                self.conn = make(self.host, timeout=30)
            self.conn.request("GET", path)
            response = self.conn.getresponse()
            body = response.read()
            status = response.status
        except (OSError, http.client.HTTPException):
            if self.conn is not None:
                self.conn.close()
            self.conn = None
            status, body = 0, b""
        return status, body, (time.perf_counter() - started) * 1000


def find_listings(url):
    """Checks the server is up and collects listing ids to open during the test."""
    client = Client(url)
    listing_ids = []
    total = 0
    for city, _, _ in CITIES:
        status, body, _ = client.get("/api/listings/search?" + urlencode({"city": city, "size": 100}))
        if status != 200:
            raise SystemExit(f"Could not search {city} at {url} (status {status}). Is the backend running?")
        page = json.loads(body)
        total += page["totalResults"]
        listing_ids += [listing["id"] for listing in page["results"]]
    if not listing_ids:
        raise SystemExit("The database has no listings in the demo cities. Load database/demo-data.sql first.")
    return listing_ids, total


def user(url, listing_ids, stop_at, results):
    client = Client(url)
    kinds = [kind for kind, _ in MIX]
    weights = [weight for _, weight in MIX]
    mine = []
    while time.time() < stop_at:
        kind = random.choices(kinds, weights)[0]
        status, _, ms = client.get(make_path(kind, listing_ids))
        mine.append((kind, status == 200, ms))
    results.extend(mine)


def percentile(sorted_times, percent):
    index = min(len(sorted_times) - 1, int(len(sorted_times) * percent / 100))
    return sorted_times[index]


def report(results, users, seconds):
    print(f"{'request':32}{'count':>8}{'errors':>8}{'avg ms':>9}{'p50 ms':>9}{'p95 ms':>9}{'p99 ms':>9}{'max ms':>9}")
    rows = [kind for kind, _ in MIX] + ["all requests"]
    for row in rows:
        picked = [r for r in results if row == "all requests" or r[0] == row]
        if not picked:
            continue
        times = sorted(ms for _, _, ms in picked)
        errors = sum(1 for _, ok, _ in picked if not ok)
        print(f"{row:32}{len(picked):>8}{errors:>8}{sum(times) / len(times):>9.1f}{percentile(times, 50):>9.1f}"
              f"{percentile(times, 95):>9.1f}{percentile(times, 99):>9.1f}{times[-1]:>9.1f}")

    times = sorted(ms for _, _, ms in results)
    errors = sum(1 for _, ok, _ in results if not ok)
    error_percent = 100 * errors / len(results)
    p95 = percentile(times, 95)
    print()
    print(f"{users} users for {seconds} seconds: {len(results)} requests, {len(results) / seconds:.0f} per second")
    print(f"95% of requests finished within {p95:.1f} ms (target: under {MAX_P95_MS} ms)")
    print(f"errors: {errors} ({error_percent:.2f}%, target: under {MAX_ERROR_PERCENT}%)")
    passed = p95 < MAX_P95_MS and error_percent < MAX_ERROR_PERCENT
    print("RESULT: PASS" if passed else "RESULT: FAIL")
    return passed


def main():
    parser = argparse.ArgumentParser(description="Load test the AlgoRent API")
    parser.add_argument("--url", default="http://localhost:8080", help="backend address")
    parser.add_argument("--users", type=int, default=25, help="how many users send requests at once")
    parser.add_argument("--seconds", type=int, default=30, help="how long to run")
    args = parser.parse_args()
    if args.users < 1 or args.seconds < 1:
        parser.error("--users and --seconds must be at least 1")

    listing_ids, total = find_listings(args.url)
    print(f"Backend is up. {total} listings in the {len(CITIES)} demo cities.")
    print(f"Running {args.users} users for {args.seconds} seconds...")
    print()

    results = []
    stop_at = time.time() + args.seconds
    threads = [threading.Thread(target=user, args=(args.url, listing_ids, stop_at, results))
               for _ in range(args.users)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    if not results:
        raise SystemExit("No requests finished. Try a longer --seconds.")
    return 0 if report(results, args.users, args.seconds) else 1


if __name__ == "__main__":
    raise SystemExit(main())
