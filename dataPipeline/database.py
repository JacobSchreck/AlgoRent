import os
import psycopg
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )

def insert_source(name, base_url, source_type):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO sources (name, base_url, source_type)
                VALUES (%s, %s, %s)
                RETURNING id;
                """,
                (name, base_url, source_type),
            )

            source_id = cur.fetchone()[0]

        conn.commit()

    return source_id

def insert_listing(listing):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO listings (
                    source_id,
                    external_id,
                    source_url,
                    title,
                    description,
                    property_type,
                    listing_type,
                    monthly_rent,
                    bedrooms,
                    bathrooms,
                    address,
                    city,
                    state,
                    zip_code,
                    available_from,
                    available_until,
                    furnished,
                    utilities_included,
                    parking_available,
                    laundry_available,
                    pets_allowed
                )
                VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s
                )
                RETURNING id;
                """,
                (
                    listing["source_id"],
                    listing["external_id"],
                    listing["source_url"],
                    listing["title"],
                    listing["description"],
                    listing["property_type"],
                    listing["listing_type"],
                    listing["monthly_rent"],
                    listing["bedrooms"],
                    listing["bathrooms"],
                    listing["address"],
                    listing["city"],
                    listing["state"],
                    listing["zip_code"],
                    listing["available_from"],
                    listing["available_until"],
                    listing["furnished"],
                    listing["utilities_included"],
                    listing["parking_available"],
                    listing["laundry_available"],
                    listing["pets_allowed"],
                )
            )

            listing_id = cur.fetchone()[0]

        conn.commit()

    return listing_id
	
if __name__ == "__main__":
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            print(cur.fetchone())

    insert_test_source()
    print("Inserted test source")