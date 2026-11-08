\set ON_ERROR_STOP on

-- Local review data only. Every generated record is namespaced with demo-* identifiers
-- and uses example.com addresses. No production or Supabase data is copied.
BEGIN;

SELECT pg_advisory_xact_lock(2147483000);

INSERT INTO sources (name, base_url, source_type, enabled)
VALUES
    ('AlgoRent Demo Housing', 'https://example.com/algorent-demo', 'PROPERTY_SITE', TRUE),
    ('AlgoRent Demo Link Directory', 'https://example.com/algorent-demo-links', 'LINK_ONLY', TRUE)
ON CONFLICT (name) DO UPDATE
SET base_url = EXCLUDED.base_url,
    source_type = EXCLUDED.source_type,
    enabled = TRUE;

INSERT INTO users
    (email, password_hash, first_name, last_name, role, email_verified_at)
VALUES
    (
        'admin123@gmail.com',
        '$2b$12$9NV.pPxdIJsHEc6XPuGafO7L.co7dDm.6NLydpZrvyj2kACmn8ql6',
        'Demo',
        'Admin',
        'ADMIN',
        CURRENT_TIMESTAMP
    ),
    (
        'demo.reporter@example.com',
        '$2b$12$9NV.pPxdIJsHEc6XPuGafO7L.co7dDm.6NLydpZrvyj2kACmn8ql6',
        'Demo',
        'Reporter',
        'USER',
        CURRENT_TIMESTAMP
    )
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    email_verified_at = EXCLUDED.email_verified_at,
    updated_at = CURRENT_TIMESTAMP;

WITH city_data
    (city_number, city, state, zip_code, latitude, longitude, base_rent) AS (
    VALUES
        (1,  'Gainesville',    'FL', '32601', 29.6516::double precision, -82.3248::double precision, 650),
        (2,  'Austin',         'TX', '78701', 30.2672::double precision, -97.7431::double precision, 1050),
        (3,  'Atlanta',        'GA', '30303', 33.7490::double precision, -84.3880::double precision, 950),
        (4,  'Boston',         'MA', '02108', 42.3601::double precision, -71.0589::double precision, 1450),
        (5,  'Chicago',        'IL', '60601', 41.8781::double precision, -87.6298::double precision, 1100),
        (6,  'New York',       'NY', '10001', 40.7128::double precision, -74.0060::double precision, 1800),
        (7,  'San Francisco',  'CA', '94102', 37.7749::double precision, -122.4194::double precision, 1900),
        (8,  'Los Angeles',    'CA', '90012', 34.0522::double precision, -118.2437::double precision, 1500),
        (9,  'Seattle',        'WA', '98101', 47.6062::double precision, -122.3321::double precision, 1350),
        (10, 'Denver',         'CO', '80202', 39.7392::double precision, -104.9903::double precision, 1200),
        (11, 'Raleigh',        'NC', '27601', 35.7796::double precision, -78.6382::double precision, 850),
        (12, 'Charlotte',      'NC', '28202', 35.2271::double precision, -80.8431::double precision, 900),
        (13, 'Washington',     'DC', '20001', 38.9072::double precision, -77.0369::double precision, 1450),
        (14, 'Philadelphia',   'PA', '19103', 39.9526::double precision, -75.1652::double precision, 1050),
        (15, 'Pittsburgh',     'PA', '15222', 40.4406::double precision, -79.9959::double precision, 800),
        (16, 'Columbus',       'OH', '43215', 39.9612::double precision, -82.9988::double precision, 750),
        (17, 'Ann Arbor',      'MI', '48104', 42.2808::double precision, -83.7430::double precision, 900),
        (18, 'Nashville',      'TN', '37201', 36.1627::double precision, -86.7816::double precision, 1000),
        (19, 'Phoenix',        'AZ', '85004', 33.4484::double precision, -112.0740::double precision, 950),
        (20, 'Salt Lake City', 'UT', '84101', 40.7608::double precision, -111.8910::double precision, 950),
        (21, 'Portland',       'OR', '97205', 45.5152::double precision, -122.6784::double precision, 1150),
        (22, 'Minneapolis',    'MN', '55401', 44.9778::double precision, -93.2650::double precision, 900),
        (23, 'St. Louis',      'MO', '63101', 38.6270::double precision, -90.1994::double precision, 750),
        (24, 'New Orleans',    'LA', '70112', 29.9511::double precision, -90.0715::double precision, 850),
        (25, 'Miami',          'FL', '33130', 25.7617::double precision, -80.1918::double precision, 1350)
),
summer AS (
    SELECT EXTRACT(YEAR FROM CURRENT_DATE)::integer
           + CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 9 THEN 1 ELSE 0 END AS year_number
),
generated AS (
    SELECT
        item_number,
        city,
        state,
        zip_code,
        latitude,
        longitude,
        base_rent,
        year_number,
        item_number % 4 = 0 AS link_only
    FROM generate_series(1, 5000) AS series(item_number)
    JOIN city_data
      ON city_number = 1 + ((item_number - 1) % 25)
    CROSS JOIN summer
)
INSERT INTO listings (
    source_id,
    external_id,
    source_url,
    title,
    description,
    property_type,
    listing_type,
    monthly_rent,
    security_deposit,
    bedrooms,
    bathrooms,
    square_feet,
    address,
    city,
    state,
    zip_code,
    latitude,
    longitude,
    available_from,
    available_until,
    furnished,
    utilities_included,
    parking_available,
    laundry_available,
    pets_allowed,
    contact_name,
    contact_email,
    contact_phone,
    status,
    first_seen_at,
    last_seen_at
)
SELECT
    CASE WHEN link_only
        THEN (SELECT id FROM sources WHERE name = 'AlgoRent Demo Link Directory')
        ELSE (SELECT id FROM sources WHERE name = 'AlgoRent Demo Housing')
    END,
    CASE WHEN link_only THEN 'demo-link-' ELSE 'demo-full-' END || item_number,
    'https://example.com/algorent-demo/'
        || CASE WHEN link_only THEN 'link/' ELSE 'listing/' END
        || item_number,
    CASE WHEN link_only THEN
        (ARRAY[
            'Summer room near campus', 'Furnished bedroom for visiting student',
            'Short-term housing close to downtown', 'Flexible sublet for summer internship'
        ])[1 + (item_number % 4)] || ' in ' || city
    ELSE
        (ARRAY['Sunny', 'Furnished', 'Quiet', 'Modern', 'Spacious', 'Walkable'])[1 + (item_number % 6)]
        || ' '
        || (ARRAY['studio', 'apartment', 'private room', 'townhome', 'guest suite'])[1 + (item_number % 5)]
        || ' in ' || city
    END,
    CASE WHEN link_only THEN NULL ELSE
        'Demo listing for local review. Convenient for a summer internship, with flexible dates and access to nearby shops and transit.'
    END,
    CASE WHEN item_number % 10 = 0 THEN 'studio'
         WHEN item_number % 5 = 0 THEN 'house'
         WHEN item_number % 3 = 0 THEN 'room'
         ELSE 'apartment' END,
    CASE WHEN item_number % 7 = 0 THEN 'shared_room'
         WHEN item_number % 3 = 0 THEN 'private_room'
         ELSE 'entire_unit' END,
    CASE WHEN item_number % 17 = 0 THEN NULL
         ELSE (base_rent + ((item_number * 37) % 950))::numeric(10, 2) END,
    CASE WHEN item_number % 6 = 0 THEN NULL
         ELSE (300 + ((item_number * 29) % 900))::numeric(10, 2) END,
    CASE WHEN item_number % 10 = 0 THEN 0
         ELSE 1 + (item_number % 4) END::numeric(3, 1),
    (1 + (item_number % 3) * 0.5)::numeric(3, 1),
    CASE WHEN item_number % 11 = 0 THEN NULL
         ELSE 420 + ((item_number * 43) % 1600) END,
    CASE WHEN link_only THEN NULL
         ELSE (100 + (item_number % 8000)) || ' Demo Street' END,
    city,
    state,
    zip_code,
    CASE WHEN item_number % 13 = 0 THEN NULL
         ELSE latitude + ((((item_number * 17) % 101) - 50)::double precision / 5000.0) END,
    CASE WHEN item_number % 13 = 0 THEN NULL
         ELSE longitude + ((((item_number * 23) % 101) - 50)::double precision / 5000.0) END,
    CASE WHEN item_number % 9 = 0 THEN NULL
         ELSE make_date(year_number, 5, 1 + (item_number % 20)) END,
    CASE WHEN item_number % 10 = 0 THEN NULL
         ELSE make_date(year_number, 8, 10 + (item_number % 20)) END,
    CASE WHEN item_number % 8 = 0 THEN NULL ELSE item_number % 3 <> 0 END,
    CASE WHEN item_number % 9 = 0 THEN NULL ELSE item_number % 4 IN (0, 1) END,
    CASE WHEN item_number % 12 = 0 THEN NULL ELSE item_number % 3 <> 0 END,
    CASE WHEN item_number % 14 = 0 THEN NULL ELSE item_number % 5 <> 0 END,
    CASE WHEN item_number % 15 = 0 THEN NULL ELSE item_number % 4 <> 0 END,
    CASE WHEN link_only THEN NULL ELSE 'Demo Host ' || (1 + (item_number % 100)) END,
    CASE WHEN link_only THEN NULL ELSE 'demo-host-' || item_number || '@example.com' END,
    CASE WHEN link_only THEN NULL ELSE '+1-555-01' || lpad((item_number % 100)::text, 2, '0') END,
    'ACTIVE',
    CURRENT_TIMESTAMP - ((item_number % 45) || ' days')::interval,
    CURRENT_TIMESTAMP
FROM generated
ON CONFLICT (source_id, external_id) DO NOTHING;

WITH demo_full AS (
    SELECT
        listing.id,
        regexp_replace(listing.external_id, '^demo-full-', '')::integer AS item_number
    FROM listings AS listing
    JOIN sources AS source ON source.id = listing.source_id
    WHERE source.name = 'AlgoRent Demo Housing'
      AND listing.external_id LIKE 'demo-full-%'
),
photo_urls AS (
    SELECT ARRAY[
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267d',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2',
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85',
        'https://images.unsplash.com/photo-1497366754035-f200968a6e72',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858',
        'https://images.unsplash.com/photo-1554995207-c18c203602cb'
    ] AS urls
)
INSERT INTO listing_images (listing_id, image_url, display_order)
SELECT
    demo_full.id,
    photo_urls.urls[1 + ((demo_full.item_number + photo_number) % 6)]
        || '?auto=format&fit=crop&w=1200&q=80',
    photo_number
FROM demo_full
CROSS JOIN photo_urls
CROSS JOIN LATERAL generate_series(0, demo_full.item_number % 3) AS photos(photo_number)
WHERE NOT EXISTS (
    SELECT 1
    FROM listing_images AS existing
    WHERE existing.listing_id = demo_full.id
      AND existing.display_order = photo_number
);

WITH reporter AS (
    SELECT id FROM users WHERE email = 'demo.reporter@example.com'
),
flag_candidates AS (
    SELECT listing.id, row_number() OVER (ORDER BY listing.id) AS flag_number
    FROM listings AS listing
    JOIN sources AS source ON source.id = listing.source_id
    WHERE source.name IN ('AlgoRent Demo Housing', 'AlgoRent Demo Link Directory')
    ORDER BY listing.id
    LIMIT 12
)
INSERT INTO listing_flags
    (listing_id, reporter_user_id, reason, details, status)
SELECT
    flag_candidates.id,
    reporter.id,
    (ARRAY['SCAM', 'INACCURATE', 'UNAVAILABLE', 'DUPLICATE', 'INAPPROPRIATE', 'OTHER'])
        [1 + ((flag_candidates.flag_number - 1) % 6)],
    'Demo moderation report ' || flag_candidates.flag_number || ' for reviewer testing.',
    'PENDING'
FROM flag_candidates
CROSS JOIN reporter
WHERE NOT EXISTS (
    SELECT 1
    FROM listing_flags AS existing
    WHERE existing.listing_id = flag_candidates.id
      AND existing.reporter_user_id = reporter.id
);

DO $$
DECLARE
    demo_count integer;
    full_count integer;
    link_count integer;
BEGIN
    SELECT
        count(*),
        count(*) FILTER (WHERE source.source_type = 'PROPERTY_SITE'),
        count(*) FILTER (WHERE source.source_type = 'LINK_ONLY')
    INTO demo_count, full_count, link_count
    FROM listings AS listing
    JOIN sources AS source ON source.id = listing.source_id
    WHERE source.name IN ('AlgoRent Demo Housing', 'AlgoRent Demo Link Directory');

    IF demo_count <> 5000 OR full_count <> 3750 OR link_count <> 1250 THEN
        RAISE EXCEPTION
            'Demo seed validation failed: total %, full %, link-only %',
            demo_count, full_count, link_count;
    END IF;
END $$;

COMMIT;
