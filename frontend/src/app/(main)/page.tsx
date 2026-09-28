"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";

import SearchBar from "@/components/SearchBar";
import ListingCard from "@/components/ListingCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type User = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

const listings = [
  {
    id: 1,
    title: "Private room near campus",
    price: 725,
    dates: "May 1 – Aug 15",
    distance: "0.4 mi to UF",
  },
  {
    id: 2,
    title: "Studio off Archer Rd",
    price: 1050,
    dates: "May 10 – Aug 10",
    distance: "1.8 mi to UF",
  },
  {
    id: 3,
    title: "Room in 4BR townhouse",
    price: 640,
    dates: "Apr 28 – Aug 20",
    distance: "2.3 mi to UF",
  },
  {
    id: 4,
    title: "1BR apartment downtown",
    price: 1200,
    dates: "May 5 – Aug 31",
    distance: "1.1 mi to UF",
  },
];

const featureCard =
  "flex-row items-center gap-3.5 rounded-[18px] bg-[#eefaf8] p-[18px] text-base text-[#111418] shadow-none ring-0";

export default function Home() {

  const [user, setUser] =
    useState<User | null>(null);

  const [authChecked, setAuthChecked] =
    useState(false);

  useEffect(() => {

    async function checkUser() {
      try {
        const response = await fetch(
          `${API_URL}/api/auth/me`,
          {
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();
          setUser(data);
        }

      } finally {
        setAuthChecked(true);
      }
    }

    checkUser();

  }, []);

  async function handleLogout() {

    await fetch(
      `${API_URL}/api/auth/logout`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    setUser(null);
  }

  return (
    <div
      className={`${font.className} min-h-screen bg-white pb-20 pt-6 text-[#111418]`}
    >

      <section className="relative mx-6 flex min-h-[600px] flex-col overflow-hidden rounded-[30px] bg-[url('/hero.png')] bg-cover bg-center text-white">

        <div className="absolute inset-0 bg-[#052a2a]/40" />

        <nav className="relative mx-6 mt-5 flex h-16 items-center justify-between rounded-[18px] border border-white/35 bg-white/15 pl-5 pr-3 backdrop-blur-lg">

          <Link
            href="/"
            className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#5eead4] text-[#06302e]">

              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 11l9-7 9 7" />
                <path d="M6 10v10h12V10" />
              </svg>

            </span>

            AlgoRent
          </Link>

          <div className="flex items-center gap-6 text-[15px] font-semibold">

            <Link href="/search">
              Search
            </Link>

            <Link href="/saved">
              Saved
            </Link>

            <Link href="/messages">
              Messages
            </Link>

            <Link
              href="/post"
              className="rounded-xl border border-white/55 px-4 py-2"
            >
              Post a listing
            </Link>

            {authChecked && (
              user ? (
                <>
                  <span>
                    {user.firstName || user.email}
                  </span>

                  <Button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-xl bg-white px-4 py-2.5 font-bold text-[#06302e] hover:bg-white/90"
                  >
                    Sign out
                  </Button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-xl bg-white px-4 py-2.5 font-bold text-[#06302e]"
                >
                  Sign in
                </Link>
              )
            )}

          </div>
        </nav>

        <div className="relative flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">

          <p className="rounded-full border border-white/35 bg-white/15 px-3.5 py-1.5 text-[13px] font-bold backdrop-blur-md">
            For interns and students · 1 to 4 month stays
          </p>

          <h1 className="max-w-[860px] text-[66px] font-extrabold leading-[1.03] tracking-[-2px]">
            Summer housing near your internship,{" "}
            <span className="text-[#5eead4]">
              made easy
            </span>
          </h1>

          <p className="max-w-[560px] text-[19px] leading-relaxed text-[#eafaf7]">
            Browse subleases from other students. No account needed to look around.
          </p>

        </div>

        <div className="relative mx-auto mb-10 w-full max-w-[1048px] px-4">
          <SearchBar />
        </div>

      </section>

      <section className="mx-auto mt-8 grid max-w-[1048px] gap-4 px-4 md:grid-cols-3">

        <Card className={featureCard}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0b7f76] text-white">
            ✓
          </span>

          <div>
            <p className="text-[15px] font-bold">
              Matches your dates
            </p>

            <p className="text-sm text-[#4f5a5c]">
              Only places open when you are
            </p>
          </div>
        </Card>

        <Card className={featureCard}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0b7f76] text-white">
            ◎
          </span>

          <div>
            <p className="text-[15px] font-bold">
              Pinned to your office
            </p>

            <p className="text-sm text-[#4f5a5c]">
              See distance on a map
            </p>
          </div>
        </Card>

        <Card className={featureCard}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0b7f76] text-white">
            ⇄
          </span>

          <div>
            <p className="text-[15px] font-bold">
              Compare side by side
            </p>

            <p className="text-sm text-[#4f5a5c]">
              Line up your favorites
            </p>
          </div>
        </Card>

      </section>

      <section className="mx-auto mt-11 max-w-[1232px] px-6">

        <div className="mb-5 flex items-baseline justify-between">

          <h2 className="text-[30px] font-extrabold tracking-tight">
            Available near UF this summer
          </h2>

          <Link
            href="/search"
            className="text-[15px] font-bold text-[#0b7f76]"
          >
            See all listings
          </Link>

        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          {listings.map((listing) => (

            <ListingCard
              key={listing.id}
              id={listing.id}
              title={listing.title}
              price={listing.price}
              dates={listing.dates}
              distance={listing.distance}
            />

          ))}

        </div>

      </section>

    </div>
  );
}