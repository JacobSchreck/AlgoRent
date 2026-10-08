"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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

const strPhoto = "flex items-center justify-center rounded-[18px] border border-white/60 bg-white/45 text-xs text-[#4a5866]";
const strInfoBox = "flex-col gap-1 rounded-2xl border border-white/60 bg-white/50 p-4 text-base text-[#1c2733] shadow-none ring-0";
const strOutlineBtn = "h-11 flex-1 rounded-xl border border-[#1c2733]/20 bg-transparent text-sm font-bold text-[#1c2733] hover:bg-white/50";
const strInStyle = "h-auto rounded-none border-none bg-transparent p-0 text-sm text-[#1c2733] md:text-sm focus-visible:ring-0";

export default function ListingPage() {
  const objRouter = useRouter();
  const objParams = useParams();
  const numId = Number(objParams.id);
  const objList = arrListings.find((objItem) => objItem.id == numId);

  const [strMoveIn, setStrMoveIn] = useState("");
  const [strMoveOut, setStrMoveOut] = useState("");
  const [blnSaved, setBlnSaved] = useState(false);
  const [blnCompare, setBlnCompare] = useState(false);

  // work out how many months they picked
  let numMonths = 0;
  if (strMoveIn != "" && strMoveOut != "") {
    const numDays = (new Date(strMoveOut).getTime() - new Date(strMoveIn).getTime()) / 86400000;
    if (numDays > 0) {
      numMonths = Math.max(1, Math.round(numDays / 30));
    }
  }

  return (
    <div className={`${objFont.className} bg-drift min-h-screen pb-16 text-[#1c2733]`}>
      <style>{strPageCss}</style>

      <nav className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/50 bg-white/40 px-8 backdrop-blur-lg">
        <Link href="/" className="text-[18px] font-extrabold tracking-tight">AlgoRent</Link>
        <div className="flex items-center gap-6 text-[14px] font-medium">
          <Link href="/search">Search</Link>
          <Link href="/saved">Saved</Link>
          <Link href="/messages">Messages</Link>
          <Link href="/login">Sign in</Link>
        </div>
      </nav>

      {objList == undefined ? (
        <div className="mx-auto flex max-w-[1232px] flex-col gap-3 px-8 pt-16">
          <h1 className="text-[30px] font-extrabold">Listing not found</h1>
          <Link href="/search" className="text-[15px] font-bold text-[#3f5b6e]">Back to search</Link>
        </div>
      ) : (
        <div className="mx-auto flex max-w-[1232px] flex-col gap-[18px] px-8 pt-5">
          <Button type="button" onClick={() => objRouter.back()} className="fade-in h-auto w-fit bg-transparent p-0 text-sm font-bold text-[#3f5b6e] hover:bg-transparent">
            ← Back to results
          </Button>

          {/* photos */}
          <div className="fade-in grid h-[352px] grid-cols-2 gap-3 md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2">
            <div className={`${strPhoto} row-span-2 rounded-[22px]`}>Main photo</div>
            <div className={`${strPhoto} hidden md:flex`}>Photo</div>
            <div className={`${strPhoto} hidden md:flex`}>Photo</div>
            <div className={`${strPhoto} hidden md:flex`}>Photo</div>
            <div className={`${strPhoto} hidden md:flex`}>Photo</div>
          </div>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

            <div className="fade-in delay-1 flex flex-1 flex-col gap-[22px]">
              <div className="flex flex-col gap-2">
                <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-[-1.2px]">{objList.title}</h1>
                <p className="text-[15px] text-[#4a5866]">{objList.city} · {objList.distance}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {objList.tags.map((strTag) => (
                    <span key={strTag} className="rounded-full bg-white/60 px-3 py-1.5 text-[13px] font-semibold">{strTag}</span>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Card className={strInfoBox}>
                  <p className="text-xs font-semibold text-[#4a5866]">Available</p>
                  <p className="text-[15px] font-bold">{objList.dates}</p>
                </Card>
                <Card className={strInfoBox}>
                  <p className="text-xs font-semibold text-[#4a5866]">Type</p>
                  <p className="text-[15px] font-bold">{objList.type}</p>
                </Card>
                <Card className={strInfoBox}>
                  <p className="text-xs font-semibold text-[#4a5866]">Distance</p>
                  <p className="text-[15px] font-bold">{objList.distance}</p>
                </Card>
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-extrabold">About this place</h2>
                <p className="max-w-[640px] text-[15px] leading-relaxed text-[#2e3a46]">{objList.about}</p>
              </div>

              <Card className="max-w-[640px] flex-row items-center gap-3.5 rounded-2xl border border-white/60 bg-white/50 p-4 text-base text-[#1c2733] shadow-none ring-0">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3f5b6e] text-[15px] font-bold text-white">{objList.host.charAt(0)}</span>
                <div>
                  <p className="text-[15px] font-bold">{objList.host}</p>
                  <p className="text-[13px] text-[#4a5866]">UF student · Verified email</p>
                </div>
              </Card>
            </div>

            {/* price card */}
            <Card className="fade-in delay-2 w-full gap-4 rounded-[22px] border border-white/80 bg-white/70 p-[22px] text-base text-[#1c2733] shadow-[0_10px_30px_rgba(63,91,110,0.15)] ring-0 backdrop-blur-xl lg:sticky lg:top-20 lg:w-[360px]">
              <p className="flex items-baseline gap-1">
                <span className="text-[28px] font-extrabold">${objList.price.toLocaleString()}</span>
                <span className="text-[15px] text-[#4a5866]">/mo</span>
              </p>

              <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[#1c2733]/15">
                <div className="flex flex-col gap-1 border-r border-[#1c2733]/15 px-3 py-2.5">
                  <Label htmlFor="movein" className="text-[11px] font-semibold">Move in</Label>
                  <Input id="movein" type="date" value={strMoveIn} onChange={(evt) => setStrMoveIn(evt.target.value)} className={strInStyle} />
                </div>
                <div className="flex flex-col gap-1 px-3 py-2.5">
                  <Label htmlFor="moveout" className="text-[11px] font-semibold">Move out</Label>
                  <Input id="moveout" type="date" value={strMoveOut} onChange={(evt) => setStrMoveOut(evt.target.value)} className={strInStyle} />
                </div>
              </div>

              <Button type="button" onClick={() => objRouter.push("/messages")} className="h-12 rounded-xl bg-[#3f5b6e] text-[15px] font-bold text-white hover:bg-[#34495a]">
                Message host
              </Button>

              <div className="flex gap-2.5">
                <Button type="button" onClick={() => setBlnSaved(!blnSaved)} className={strOutlineBtn}>{blnSaved == true ? "Saved" : "Save"}</Button>
                <Button type="button" onClick={() => setBlnCompare(!blnCompare)} className={strOutlineBtn}>{blnCompare == true ? "Added" : "Add to compare"}</Button>
              </div>

              {numMonths > 0 && (
                <div className="flex flex-col gap-2 border-t border-[#1c2733]/10 pt-3.5 text-sm">
                  <p className="flex justify-between">
                    <span className="text-[#4a5866]">${objList.price.toLocaleString()} × {numMonths} {numMonths == 1 ? "month" : "months"}</span>
                    <span className="font-semibold">${(objList.price * numMonths).toLocaleString()}</span>
                  </p>
                  <p className="flex justify-between font-extrabold">
                    <span>Total rent</span>
                    <span>${(objList.price * numMonths).toLocaleString()}</span>
                  </p>
                </div>
              )}
            </Card>

          </div>
        </div>
      )}
    </div>
  );
}