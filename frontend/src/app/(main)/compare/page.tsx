"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { strApiUrl, ListingDetail, showDates, showMoney, showRooms, showType, showYesNo } from "@/lib/listings";

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
  @keyframes rise {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const strRowLbl = "py-3.5 pr-4 text-sm font-medium text-[#4a5866]";
const strCell = "py-3.5 pr-4 text-[15px]";
const strBest = "ml-2 rounded-full bg-[#3f5b6e] px-2 py-0.5 text-xs font-semibold text-white";

function CompareTable() {
  const objRouter = useRouter();
  const objParams = useSearchParams();
  const strIds = objParams.get("ids") || "";
  const strStart = objParams.get("start") || "";
  const strEnd = objParams.get("end") || "";

  const [arrPicked, setArrPicked] = useState<ListingDetail[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);

  // get each picked listing from the backend (max 3)
  useEffect(() => {
    async function loadPicked() {
      setBlnLoading(true);
      const arrIds = strIds.split(",").filter((strId) => strId != "").slice(0, 3);
      const arrFound: ListingDetail[] = [];
      for (const strId of arrIds) {
        try {
          const objRes = await fetch(`${strApiUrl}/api/listings/${strId}`);
          if (objRes.ok == true) {
            arrFound.push(await objRes.json());
          }
        } catch (objErr) {
          console.log("couldnt reach backend", objErr);
        }
      }
      setArrPicked(arrFound);
      setBlnLoading(false);
    }
    loadPicked();
  }, [strIds]);

  function removeOne(numId: number) {
    const arrLeft = arrPicked.filter((objList) => objList.id != numId).map((objList) => objList.id);
    if (arrLeft.length == 0) {
      objRouter.push("/search");
    } else {
      objRouter.push(`/compare?ids=${arrLeft.join(",")}&start=${strStart}&end=${strEnd}`);
    }
  }

  if (blnLoading == true) {
    return <p className="pt-10 text-[#4a5866]">Loading...</p>;
  }

  if (arrPicked.length == 0) {
    return (
      <div className="flex flex-col gap-3 pt-16">
        <h1 className="text-[30px] font-semibold">Nothing to compare yet</h1>
        <p className="text-[15px] text-[#4a5866]">Check a few places on the search page, then press Compare.</p>
        <Link href="/search" className="text-[15px] font-semibold text-[#3f5b6e]">Go to search</Link>
      </div>
    );
  }

  // find the cheapest one so we can tag it
  let numCheapest = -1;
  for (const objList of arrPicked) {
    if (objList.monthlyRent != null) {
      const numRent = Number(objList.monthlyRent);
      if (numCheapest == -1 || numRent < numCheapest) {
        numCheapest = numRent;
      }
    }
  }

  let strForDates = "";
  if (strStart != "" && strEnd != "") {
    strForDates = `For your dates: ${strStart} to ${strEnd}`;
  }

  return (
    <div className="flex flex-col gap-6 pt-10">
      <div className="fade-in flex items-end justify-between">
        <div className="flex flex-col gap-1.5">
          <Button type="button" onClick={() => objRouter.back()} className="h-auto w-fit bg-transparent p-0 text-sm font-semibold text-[#3f5b6e] hover:bg-transparent">
            ← Back to results
          </Button>
          <h1 className="text-[36px] font-semibold tracking-[-1px] text-[#24313d]">Compare side by side</h1>
        </div>
        {strForDates != "" && <p className="text-sm text-[#4a5866]">{strForDates}</p>}
      </div>

      <Card className="fade-in overflow-x-auto rounded-[22px] border border-white/70 bg-white/55 p-6 text-base text-[#1c2733] shadow-none ring-0 backdrop-blur-xl">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr>
              <th className="w-[170px]"></th>
              {arrPicked.map((objList) => (
                <th key={objList.id} className="pb-4 pr-4 align-top">
                  <div className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded-2xl border border-white/60 bg-white/50 text-xs font-normal text-[#4a5866]">
                    {objList.imageUrls != null && objList.imageUrls.length > 0 ? (
                      <img src={objList.imageUrls[0]} alt={objList.title} className="h-full w-full object-cover" />
                    ) : (
                      "No photo yet"
                    )}
                  </div>
                  <Link href={`/listings/${objList.id}`} className="text-[16px] font-semibold">{objList.title}</Link>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#1c2733]/10">
            <tr>
              <td className={strRowLbl}>Monthly rent</td>
              {arrPicked.map((objList) => (
                <td key={objList.id} className={strCell}>
                  <span className="font-semibold">{showMoney(objList.monthlyRent)}</span>
                  {objList.monthlyRent != null && Number(objList.monthlyRent) == numCheapest && arrPicked.length > 1 && <span className={strBest}>Best</span>}
                </td>
              ))}
            </tr>
            <tr>
              <td className={strRowLbl}>Available</td>
              {arrPicked.map((objList) => <td key={objList.id} className={strCell}>{showDates(objList.availableFrom, objList.availableUntil)}</td>)}
            </tr>
            <tr>
              <td className={strRowLbl}>Rooms</td>
              {arrPicked.map((objList) => <td key={objList.id} className={strCell}>{showRooms(objList.bedrooms, objList.bathrooms)}</td>)}
            </tr>
            <tr>
              <td className={strRowLbl}>Room type</td>
              {arrPicked.map((objList) => <td key={objList.id} className={strCell}>{showType(objList.listingType)}</td>)}
            </tr>
            <tr>
              <td className={strRowLbl}>Furnished</td>
              {arrPicked.map((objList) => <td key={objList.id} className={strCell}>{showYesNo(objList.furnished)}</td>)}
            </tr>
            <tr>
              <td className={strRowLbl}>Utilities included</td>
              {arrPicked.map((objList) => <td key={objList.id} className={strCell}>{showYesNo(objList.utilitiesIncluded)}</td>)}
            </tr>
            <tr>
              <td className={strRowLbl}>Pets allowed</td>
              {arrPicked.map((objList) => <td key={objList.id} className={strCell}>{showYesNo(objList.petsAllowed)}</td>)}
            </tr>
            <tr>
              <td className={strRowLbl}>Deposit</td>
              {arrPicked.map((objList) => <td key={objList.id} className={strCell}>{showMoney(objList.securityDeposit)}</td>)}
            </tr>
            <tr>
              <td></td>
              {arrPicked.map((objList) => (
                <td key={objList.id} className="py-4 pr-4">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => objRouter.push(`/listings/${objList.id}`)} className="h-10 rounded-full border border-[#1c2733]/20 bg-transparent px-4 text-sm font-semibold text-[#1c2733] hover:bg-white/60">
                      View
                    </Button>
                    <Button type="button" onClick={() => objRouter.push("/messages")} className="h-10 rounded-full bg-[#3f5b6e] px-4 text-sm font-semibold text-white hover:bg-[#34495a]">
                      Message
                    </Button>
                    <Button type="button" onClick={() => removeOne(objList.id)} className="h-10 rounded-full bg-transparent px-2 text-sm font-semibold text-[#4a5866] hover:bg-transparent hover:text-[#1c2733]">
                      Remove
                    </Button>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export default function ComparePage() {
  return (
    <div className={`${objFont.className} bg-drift min-h-screen pb-20 text-[#1c2733]`}>
      <style>{strPageCss}</style>

      <nav className="sticky top-0 z-[1100] border-b border-white/35 bg-white/25 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-[1232px] items-center justify-between px-8">
          <Link href="/" className="text-[18px] font-bold tracking-tight">AlgoRent</Link>
          <div className="flex items-center gap-6 text-[14px] font-medium">
            <Link href="/search">Search</Link>
            <Link href="/saved">Saved</Link>
            <Link href="/messages">Messages</Link>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-[1232px] px-8">
        {/* useSearchParams needs Suspense around it in Next.js */}
        <Suspense fallback={<p className="pt-10 text-[#4a5866]">Loading...</p>}>
          <CompareTable />
        </Suspense>
      </div>
    </div>
  );
}