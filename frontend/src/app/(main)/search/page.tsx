"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import SearchBar from "@/components/SearchBar";
import ListingCard from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { strApiUrl, ListingSummary, showDates, showPlace } from "@/lib/listings";
const ListingMap = dynamic(() => import("@/components/ListingMap"), { ssr: false });

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

const strSelOn = "h-9 cursor-pointer rounded-full border border-[#3f5b6e] bg-[#3f5b6e] px-3.5 text-[13px] font-semibold text-white outline-none";
const strSelOff = "h-9 cursor-pointer rounded-full border border-white/70 bg-white/50 px-3.5 text-[13px] font-semibold text-[#1c2733] outline-none hover:bg-white/70";

function SearchResults() {
  const objRouter = useRouter();
  const objParams = useSearchParams();
  const strCity = objParams.get("city") || "Gainesville";
  const strStart = objParams.get("start") || "";
  const strEnd = objParams.get("end") || "";

  const [strMaxRent, setStrMaxRent] = useState("");
  const [strBeds, setStrBeds] = useState("");
  const [strRoomType, setStrRoomType] = useState("");
  const [strProperty, setStrProperty] = useState("");
  const [strSort, setStrSort] = useState("price_asc");
  const [arrCompare, setArrCompare] = useState<number[]>([]);

  const [arrResults, setArrResults] = useState<ListingSummary[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strErr, setStrErr] = useState("");

  // ask the backend for listings every time the search or a filter changes
  useEffect(() => {
    async function loadResults() {
      setBlnLoading(true);
      setStrErr("");

      const objQuery = new URLSearchParams({ city: strCity, size: "50", sort: strSort });
      if (strStart != "" && strEnd != "") {
        objQuery.set("moveIn", strStart);
        objQuery.set("moveOut", strEnd);
      }
      if (strMaxRent != "") {
        objQuery.set("maxRent", strMaxRent);
      }
      if (strBeds == "studio") {
        objQuery.set("propertyType", "studio");
      } else if (strBeds != "") {
        objQuery.set("minBedrooms", strBeds);
      }
      if (strRoomType != "") {
        objQuery.set("listingType", strRoomType);
      }
      if (strProperty != "" && strBeds != "studio") {
        objQuery.set("propertyType", strProperty);
      }

      try {
        const objRes = await fetch(`${strApiUrl}/api/listings/search?${objQuery}`);
        const objData = await objRes.json();
        if (objRes.ok == false) {
          setStrErr(objData.detail || "Search failed.");
          setArrResults([]);
        } else {
          setArrResults(objData.results);
        }
      } catch (objErr) {
        console.log("couldnt reach backend", objErr);
        setStrErr("Unable to connect to the server.");
        setArrResults([]);
      } finally {
        setBlnLoading(false);
      }
    }
    loadResults();
  }, [strCity, strStart, strEnd, strMaxRent, strBeds, strRoomType, strProperty, strSort]);

  function toggleCompare(numId: number) {
    if (arrCompare.includes(numId) == true) {
      setArrCompare(arrCompare.filter((numItem) => numItem != numId));
    } else {
      setArrCompare([...arrCompare, numId]);
    }
  }

  function clearFilters() {
    setStrMaxRent("");
    setStrBeds("");
    setStrRoomType("");
    setStrProperty("");
    setStrSort("price_asc");
  }

  let blnAnyFilter = false;
  if (strMaxRent != "" || strBeds != "" || strRoomType != "" || strProperty != "") {
    blnAnyFilter = true;
  }

  // only listings that have a location can go on the map
  const arrPins: { id: number; price: number; lat: number; lng: number }[] = [];
  for (const objList of arrResults) {
    if (objList.latitude != null && objList.longitude != null) {
      arrPins.push({ id: objList.id, price: Number(objList.monthlyRent ?? 0), lat: objList.latitude, lng: objList.longitude });
    }
  }

  let strTitle = `Places in ${strCity}`;

  let strDates = "";
  if (strStart != "" && strEnd != "") {
    strDates = ` · ${strStart} to ${strEnd}`;
  }

  return (
    <>
      <div className="fade-in flex flex-col gap-4 pt-6">
        <SearchBar />

        <div className="flex flex-wrap items-center gap-2.5">
          <select value={strMaxRent} onChange={(evt) => setStrMaxRent(evt.target.value)} aria-label="Price" className={strMaxRent != "" ? strSelOn : strSelOff}>
            <option value="">Any price</option>
            <option value="749">Under $750</option>
            <option value="999">Under $1,000</option>
            <option value="1499">Under $1,500</option>
          </select>

          <select value={strBeds} onChange={(evt) => setStrBeds(evt.target.value)} aria-label="Bedrooms" className={strBeds != "" ? strSelOn : strSelOff}>
            <option value="">Any bedrooms</option>
            <option value="studio">Studio</option>
            <option value="1">1+ bed</option>
            <option value="2">2+ beds</option>
            <option value="3">3+ beds</option>
          </select>

          <select value={strRoomType} onChange={(evt) => setStrRoomType(evt.target.value)} aria-label="Room type" className={strRoomType != "" ? strSelOn : strSelOff}>
            <option value="">Any room type</option>
            <option value="entire_unit">Entire place</option>
            <option value="private_room">Private room</option>
            <option value="shared_room">Shared room</option>
          </select>

          <select value={strProperty} onChange={(evt) => setStrProperty(evt.target.value)} aria-label="Property" className={strProperty != "" ? strSelOn : strSelOff}>
            <option value="">Any property</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="studio">Studio</option>
          </select>

          {blnAnyFilter == true && (
            <Button type="button" onClick={clearFilters} className="h-9 bg-transparent px-2 text-[13px] font-semibold text-[#3f5b6e] hover:bg-transparent">Clear</Button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-[#4a5866]">
            {blnLoading == true ? "Searching..." : `${arrResults.length} places · ${strTitle}${strDates}`}
          </span>
          <label className="flex items-center gap-2 text-[13px] text-[#4a5866]">
            Sort by
            <select value={strSort} onChange={(evt) => setStrSort(evt.target.value)} className={strSelOff}>
              <option value="price_asc">Lowest price</option>
              <option value="price_desc">Highest price</option>
              <option value="newest">Newest</option>
              <option value="available_soonest">Available soonest</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-6 pb-10 pt-5 lg:flex-row">

        {/* results */}
        <div className="fade-in delay-1 grid flex-1 content-start gap-5 sm:grid-cols-2 lg:max-w-[640px]">
          {strErr != "" && <p className="text-[15px] text-red-600">{strErr}</p>}

          {blnLoading == false && strErr == "" && arrResults.length == 0 && (
            <p className="text-[15px] text-[#4a5866]">No places match that. Try a different city or turn off a filter.</p>
          )}

          {arrResults.map((objList) => (
            <div key={objList.id} className="flex flex-col gap-2">
              <ListingCard
                id={objList.id}
                title={objList.title}
                price={objList.monthlyRent == null ? null : Number(objList.monthlyRent)}
                dates={showDates(objList.availableFrom, objList.availableUntil)}
                distance={objList.distanceMiles != null ? `${objList.distanceMiles.toFixed(1)} mi away` : showPlace(objList.city, objList.state)}
                photo={objList.thumbnailUrl}
              />
              <label className="flex items-center gap-2 text-[13px] font-semibold">
                <input type="checkbox" checked={arrCompare.includes(objList.id)} onChange={() => toggleCompare(objList.id)} className="h-4 w-4 accent-[#3f5b6e]" />
                Compare
              </label>
            </div>
          ))}
        </div>

        {/* map */}
        <div className="fade-in delay-2 relative h-[520px] flex-1 overflow-hidden rounded-[22px] border border-white/60 bg-white/35 lg:sticky lg:top-24">
          <div className="absolute inset-0">
            <ListingMap arrPins={arrPins} arrPicked={arrCompare} />
          </div>

          {arrResults.length > 0 && arrPins.length == 0 && (
            <p className="absolute left-14 top-4 z-[1000] rounded-full bg-white/90 px-3.5 py-1.5 text-[13px] font-medium text-[#4a5866]">
              Map spots aren&apos;t in the listing data yet
            </p>
          )}

          {/* z-[1000] keeps the bar on top of the map */}
          <div className="absolute bottom-4 left-4 right-4 z-[1000] flex items-center justify-between rounded-[14px] border border-white/90 bg-white/85 py-3 pl-[18px] pr-3">
            <span className="text-sm font-semibold">
              {arrCompare.length == 0 ? "Check a few places to compare" : `${arrCompare.length} picked to compare`}
            </span>
            {arrCompare.length >= 2 && (
              <Button type="button" onClick={() => objRouter.push(`/compare?ids=${arrCompare.join(",")}&start=${strStart}&end=${strEnd}`)} className="h-10 rounded-full bg-[#3f5b6e] px-[18px] text-[13px] font-bold text-white hover:bg-[#34495a]">
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
      <nav className="sticky top-0 z-[1100] border-b border-white/35 bg-white/25 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-[1232px] items-center justify-between px-8">
          <Link href="/" className="text-[18px] font-bold tracking-tight">AlgoRent</Link>
          <div className="flex items-center gap-6 text-[14px] font-medium">
            <Link href="/search" className="font-semibold">Search</Link>
            <Link href="/saved">Saved</Link>
            <Link href="/messages">Messages</Link>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-[1232px] px-8">
        {/* useSearchParams needs Suspense around it in Next.js */}
        <Suspense fallback={<p className="pt-6 text-[#4a5866]">Loading...</p>}>
          <SearchResults />
        </Suspense>
      </div>
    </div>
  );
}