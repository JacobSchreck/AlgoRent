-- Test data for ListingSearchApiTest. Reset before every test so ids are predictable.
TRUNCATE messages, inquiries, favorites, listing_images, listings, sources, users RESTART IDENTITY CASCADE;

INSERT INTO sources (name, base_url) VALUES ('Test Source', 'https://example.com');

-- id | city        | rent | available               | notes
--  1 | Gainesville |  750 | 2027-05-01 - 2027-08-31 | furnished studio, utilities included, 2 photos
--  2 | Gainesville | 1100 | 2027-05-15 - 2027-08-15 | unfurnished 2BR, 1 photo
--  3 | gainesville |  600 | no dates                | lower-case city, open-ended availability
--  4 | Gainesville | NULL | 2027-04-01 - 2027-12-31 | no price listed
--  5 | Gainesville |  500 | 2027-05-01 - 2027-08-31 | REMOVED: must never appear
--  6 | Gainesville |  900 | 2027-06-01 - 2027-06-30 | June only
--  7 | Austin      | 1400 | 2027-05-01 - 2027-08-31 | other city
INSERT INTO listings
    (source_id, external_id, source_url, title, city, state, monthly_rent, bedrooms, bathrooms,
     property_type, listing_type, available_from, available_until, furnished, utilities_included, status,
     first_seen_at)
VALUES
    (1, 'ext-1', 'https://example.com/1', 'Gainesville studio near UF', 'Gainesville', 'FL', 750.00, 0, 1,
     'studio', 'sublet', '2027-05-01', '2027-08-31', TRUE, TRUE, 'ACTIVE', '2026-09-01 10:00'),
    (1, 'ext-2', 'https://example.com/2', 'Gainesville 2BR sublet', 'Gainesville', 'FL', 1100.00, 2, 1,
     'apartment', 'sublet', '2027-05-15', '2027-08-15', FALSE, FALSE, 'ACTIVE', '2026-09-02 10:00'),
    (1, 'ext-3', 'https://example.com/3', 'Gainesville room, open dates', 'gainesville', 'FL', 600.00, 1, 1,
     'room', 'room', NULL, NULL, TRUE, TRUE, 'ACTIVE', '2026-09-03 10:00'),
    (1, 'ext-4', 'https://example.com/4', 'Gainesville house, no price', 'Gainesville', 'FL', NULL, 3, 2,
     'house', 'sublet', '2027-04-01', '2027-12-31', TRUE, FALSE, 'ACTIVE', '2026-09-04 10:00'),
    (1, 'ext-5', 'https://example.com/5', 'Gainesville removed listing', 'Gainesville', 'FL', 500.00, 1, 1,
     'apartment', 'sublet', '2027-05-01', '2027-08-31', TRUE, TRUE, 'REMOVED', '2026-09-05 10:00'),
    (1, 'ext-6', 'https://example.com/6', 'Gainesville June only', 'Gainesville', 'FL', 900.00, 1, 1,
     'apartment', 'sublet', '2027-06-01', '2027-06-30', TRUE, FALSE, 'ACTIVE', '2026-09-06 10:00'),
    (1, 'ext-7', 'https://example.com/7', 'Austin 1BR', 'Austin', 'TX', 1400.00, 1, 1,
     'apartment', 'sublet', '2027-05-01', '2027-08-31', TRUE, TRUE, 'ACTIVE', '2026-09-07 10:00');

INSERT INTO listing_images (listing_id, image_url, display_order) VALUES
    (1, 'https://img.example.com/1-second.jpg', 2),
    (1, 'https://img.example.com/1-first.jpg', 1),
    (2, 'https://img.example.com/2.jpg', 0);
