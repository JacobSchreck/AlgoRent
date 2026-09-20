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

def insert_test_source():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO sources (name, base_url)
                VALUES (%s, %s)
                ON CONFLICT (name) DO NOTHING;
                """,
                ("Test Source", "https://example.com"),
            )
        conn.commit()

	
if __name__ == "__main__":
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            print(cur.fetchone())

    insert_test_source()
    print("Inserted test source")