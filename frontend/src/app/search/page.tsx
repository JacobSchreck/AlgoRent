"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import SearchBar from "@/components/SearchBar";
import ListingCard from "@/components/ListingCard";

const objFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const strApiUrl =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type Listing = {
  id: number;
  title: string;
  city: string;
  state: string | null;
  monthlyRent: number | null;
  availableFrom: string | null;
  availableUntil: string | null;
  thumbnailUrl: string | null;
};

type SearchResponse = {
  results: Listing[];
  totalResults: number;
};

const strPageCss = `
  .bg-drift {
    background: linear-gradient(125deg, #b9cbe0 0%, #9fb6d1 25%, #c3c9e3 50%, #a8c0d6 75%, #b9cbe0 100%);
    background-size: 300% 300%;
    animation: drift 22s ease-in-out infinite;
  }

  @keyframes drift {
    0% { background-position: 0% 30%; }
    50% { background-position: 100% 70%; }
    100% { background-position: 0% 30%; }
  }

  .fade-in { animation: rise 1s ease-out both; }
  .delay-1 { animation-delay: 0.12s; }
  .delay-2 { animation-delay: 0.24s; }

  @keyframes rise {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

function SearchResults() {
  const objParams = useSearchParams();

  const strCity = objParams.get("city") || "";
  const strMoveIn = objParams.get("moveIn") || "";
  const strMoveOut = objParams.get("moveOut") || "";

  const [arrResults, setArrResults] = useState<Listing[]>([]);
  const [numTotal, setNumTotal] = useState(0);
  const [blnLoading, setBlnLoading] = useState(false);
  const [strError, setStrError] = useState("");

  useEffect(() => {
    async function searchListings() {
      if (strCity == "") {
        setArrResults([]);
        setNumTotal(0);
        return;
      }

      setBlnLoading(true);
      setStrError("");

      const objSearch = new URLSearchParams({
        city: strCity,
        size: "20",
      });

      if (strMoveIn != "" && strMoveOut != "") {
        objSearch.set("moveIn", strMoveIn);
        objSearch.set("moveOut", strMoveOut);
      }

      try {
        const objRes = await fetch(
          `${strApiUrl}/api/listings/search?${objSearch}`,
        );

        const objData = await objRes.json();

        if (!objRes.ok) {
          setStrError(objData.detail || "Search failed.");
          setArrResults([]);
          setNumTotal(0);
          return;
        }

        const objSearchData = objData as SearchResponse;

        setArrResults(objSearchData.results);
        setNumTotal(objSearchData.totalResults);
      } catch (objErr) {
        console.log("couldnt reach backend", objErr);
        setStrError("Unable to connect to the server.");
        setArrResults([]);
        setNumTotal(0);
      } finally {
        setBlnLoading(false);
      }
    }

    searchListings();
  }, [strCity, strMoveIn, strMoveOut]);

  return (
    <>
      <div className="fade-in flex flex-col gap-3.5 px-8 pt-5">
        <div className="w-full max-w-[730px]">
          <SearchBar loading={blnLoading} />
        </div>

        <span className="text-sm text-[#4a5866]">
          {numTotal} places
          {strCity && ` · Places in ${strCity}`}
        </span>

        {strError && (
          <p className="text-sm text-red-600">{strError}</p>
        )}
      </div>

      <div className="flex flex-col gap-6 px-8 pb-8 pt-5 lg:flex-row">
        <div className="fade-in delay-1 grid flex-1 content-start gap-5 sm:grid-cols-2 lg:max-w-[640px]">
          {!blnLoading &&
            strCity != "" &&
            arrResults.length == 0 &&
            !strError && (
              <p className="text-[15px] text-[#4a5866]">
                No places found. Try a different city or dates.
              </p>
            )}

          {arrResults.map((objList) => (
            <ListingCard
              key={objList.id}
              id={objList.id}
              title={objList.title}
              price={Number(objList.monthlyRent ?? 0)}
              thumbnailUrl={objList.thumbnailUrl}
              dates={
                objList.availableFrom && objList.availableUntil
                  ? `${objList.availableFrom} – ${objList.availableUntil}`
                  : "Flexible dates"
              }
              distance={[objList.city, objList.state]
                .filter(Boolean)
                .join(", ")}
            />
          ))}
        </div>

        <div className="fade-in delay-2 relative flex h-[520px] flex-1 items-center justify-center overflow-hidden rounded-[22px] border border-white/60 bg-white/35 backdrop-blur-md lg:sticky lg:top-20">
          <p className="text-sm font-semibold text-[#4a5866]">
            Map coming soon
          </p>
        </div>
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <div
      className={`${objFont.className} bg-drift min-h-screen text-[#1c2733]`}
    >
      <style>{strPageCss}</style>

      <nav className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/50 bg-white/40 px-8 backdrop-blur-lg">
        <Link
          href="/"
          className="text-[18px] font-extrabold tracking-tight"
        >
          AlgoRent
        </Link>

        <div className="flex items-center gap-6 text-[14px] font-medium">
          <Link href="/search" className="font-bold">
            Search
          </Link>
          <Link href="/saved">Saved</Link>
          <Link href="/messages">Messages</Link>
          <Link href="/login">Sign in</Link>
        </div>
      </nav>

      <Suspense
        fallback={
          <p className="px-8 pt-6 text-[#4a5866]">Loading...</p>
        }
      >
        <SearchResults />
      </Suspense>
    </div>
  );
}