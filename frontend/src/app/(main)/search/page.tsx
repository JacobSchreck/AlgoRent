"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import SearchBar from "@/components/SearchBar";
import ListingCard from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { arrListings } from "@/lib/listings";

const objFont = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700", "800"] });

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

const strChipOn = "h-9 rounded-[10px] border border-[#3f5b6e] bg-[#3f5b6e] px-3.5 text-[13px] font-semibold text-white hover:bg-[#34495a]";
const strChipOff = "h-9 rounded-[10px] border border-white/70 bg-white/50 px-3.5 text-[13px] font-semibold text-[#1c2733] hover:bg-white/70";

function SearchResults() {
  const objRouter = useRouter();
  const objParams = useSearchParams();
  const strCity = objParams.get("city") || "";
  const strStart = objParams.get("start") || "";
  const strEnd = objParams.get("end") || "";

  const [blnCheap, setBlnCheap] = useState(false);
  const [blnClose, setBlnClose] = useState(false);
  const [blnWhole, setBlnWhole] = useState(false);
  const [arrCompare, setArrCompare] = useState<number[]>([]);

  const arrResults = arrListings.filter((objList) => {
    const strSearch = strCity.toLowerCase();
    if (strSearch != "" && objList.city.toLowerCase().includes(strSearch) == false && objList.title.toLowerCase().includes(strSearch) == false) {
      return false;
    } else if (blnCheap == true && objList.price >= 1000) {
      return false;
    } else if (blnClose == true && objList.miles > 1) {
      return false;
    } else if (blnWhole == true && objList.type != "Entire place") {
      return false;
    }
    return true;
  });

  function toggleCompare(numId: number) {
    if (arrCompare.includes(numId) == true) {
      setArrCompare(arrCompare.filter((numItem) => numItem != numId));
    } else {
      setArrCompare([...arrCompare, numId]);
    }
  }

  let strTitle = "All places";
  if (strCity != "") {
    strTitle = `Places in ${strCity}`;
  }

  let strDates = "";
  if (strStart != "" && strEnd != "") {
    strDates = ` · ${strStart} to ${strEnd}`;
  }

  return (
    <>
      <div className="fade-in flex flex-col gap-3.5 px-8 pt-5">
        <div className="w-full max-w-[730px]"><SearchBar /></div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="button" onClick={() => setBlnCheap(!blnCheap)} className={blnCheap == true ? strChipOn : strChipOff}>Under $1,000</Button>
          <Button type="button" onClick={() => setBlnClose(!blnClose)} className={blnClose == true ? strChipOn : strChipOff}>Within 1 mi</Button>
          <Button type="button" onClick={() => setBlnWhole(!blnWhole)} className={blnWhole == true ? strChipOn : strChipOff}>Entire place</Button>
          <span className="ml-2 text-sm text-[#4a5866]">{arrResults.length} places · {strTitle}{strDates}</span>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-8 pb-8 pt-5 lg:flex-row">

        {/* results */}
        <div className="fade-in delay-1 grid flex-1 content-start gap-5 sm:grid-cols-2 lg:max-w-[640px]">
          {arrResults.length == 0 && (
            <p className="text-[15px] text-[#4a5866]">No places match that. Try a different city or turn off a filter.</p>
          )}

          {arrResults.map((objList) => (
            <div key={objList.id} className="flex flex-col gap-2">
              <ListingCard id={objList.id} title={objList.title} price={objList.price} dates={objList.dates} distance={objList.distance} />
              <label className="flex items-center gap-2 text-[13px] font-semibold">
                <input type="checkbox" checked={arrCompare.includes(objList.id)} onChange={() => toggleCompare(objList.id)} className="h-4 w-4 accent-[#3f5b6e]" />
                Compare
              </label>
            </div>
          ))}
        </div>

        {/* map */}
        <div className="fade-in delay-2 relative h-[520px] flex-1 overflow-hidden rounded-[22px] border border-white/60 bg-white/35 backdrop-blur-md lg:sticky lg:top-20">
          <span className="absolute left-[47%] top-[46%] rounded-full bg-[#3f5b6e] px-3 py-1.5 text-[13px] font-bold text-white">UF</span>

          {arrResults.map((objList) => (
            <Link
              key={objList.id}
              href={`/listings/${objList.id}`}
              style={{ left: `${objList.mapX}%`, top: `${objList.mapY}%` }}
              className={arrCompare.includes(objList.id) == true
                ? "absolute rounded-full bg-[#3f5b6e] px-2.5 py-1 text-[13px] font-bold text-white shadow"
                : "absolute rounded-full bg-white px-2.5 py-1 text-[13px] font-bold text-[#1c2733] shadow"}
            >
              ${objList.price.toLocaleString()}
            </Link>
          ))}

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-[14px] border border-white/90 bg-white/80 py-3 pl-[18px] pr-3">
            <span className="text-sm font-semibold">
              {arrCompare.length == 0 ? "Check a few places to compare" : `${arrCompare.length} picked to compare`}
            </span>
            {arrCompare.length >= 2 && (
              <Button type="button" onClick={() => objRouter.push(`/compare?ids=${arrCompare.join(",")}`)} className="h-10 rounded-[10px] bg-[#3f5b6e] px-[18px] text-[13px] font-bold text-white hover:bg-[#34495a]">
                Compare
              </Button>
            )}
          </div>
        </div>

      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <div className={`${objFont.className} bg-drift min-h-screen text-[#1c2733]`}>
      <style>{strPageCss}</style>

      <nav className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/50 bg-white/40 px-8 backdrop-blur-lg">
        <Link href="/" className="text-[18px] font-extrabold tracking-tight">AlgoRent</Link>
        <div className="flex items-center gap-6 text-[14px] font-medium">
          <Link href="/search" className="font-bold">Search</Link>
          <Link href="/saved">Saved</Link>
          <Link href="/messages">Messages</Link>
          <Link href="/login">Sign in</Link>
        </div>
      </nav>

      {/* useSearchParams needs Suspense around it in Next.js */}
      <Suspense fallback={<p className="px-8 pt-6 text-[#4a5866]">Loading...</p>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}