"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { strApiUrl, ListingDetail, showDates, showMoney, showPlace, showRooms, showType } from "@/lib/listings";
import { getSaved, setSaved } from "@/lib/saved";

// the map can only load in the browser, not on the server
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

const strPhoto = "flex items-center justify-center overflow-hidden rounded-[18px] border border-white/60 bg-white/45 text-xs text-[#4a5866]";
const strInfoBox = "flex-col gap-1 rounded-2xl border border-white/60 bg-white/50 p-4 text-base text-[#1c2733] shadow-none ring-0";
const strOutlineBtn = "h-11 flex-1 rounded-full border border-[#1c2733]/20 bg-transparent text-sm font-semibold text-[#1c2733] hover:bg-white/50";
const strInStyle = "h-auto rounded-none border-none bg-transparent p-0 text-sm text-[#1c2733] md:text-sm focus-visible:ring-0";
const strTag = "rounded-full bg-white/60 px-3 py-1.5 text-[13px] font-medium";

export default function ListingPage() {
  const objRouter = useRouter();
  const objParams = useParams();
  const strId = String(objParams.id);

  const [objList, setObjList] = useState<ListingDetail | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strErr, setStrErr] = useState("");

  const [strMoveIn, setStrMoveIn] = useState("");
  const [strMoveOut, setStrMoveOut] = useState("");
  const [blnSaved, setBlnSaved] = useState(false);
  const [blnCompare, setBlnCompare] = useState(false);

  // get this listing from the backend
  useEffect(() => {
    async function loadListing() {
      setBlnLoading(true);
      try {
        const objRes = await fetch(`${strApiUrl}/api/listings/${strId}`);
        if (objRes.ok == true) {
          setObjList(await objRes.json());
        } else if (objRes.status == 404) {
          setStrErr("Listing not found");
        } else {
          setStrErr("Couldn't load this listing.");
        }
      } catch (objErr) {
        console.log("couldnt reach backend", objErr);
        setStrErr("Unable to connect to the server.");
      } finally {
        setBlnLoading(false);
      }
    }
    loadListing();
  }, [strId]);

  // check if this place was saved before
  useEffect(() => {
    const arrHave = getSaved();
    if (arrHave.find((objItem) => objItem.id == Number(strId)) != undefined) {
      setBlnSaved(true);
    }
  }, [strId]);

  function toggleSave() {
    const arrHave = getSaved();
    if (blnSaved == true) {
      setSaved(arrHave.filter((objItem) => objItem.id != Number(strId)));
      setBlnSaved(false);
    } else {
      setSaved([...arrHave, { id: Number(strId), status: "Interested" }]);
      setBlnSaved(true);
    }
  }

  let numRent = 0;
  if (objList != null && objList.monthlyRent != null) {
    numRent = Number(objList.monthlyRent);
  }

  // work out how many months they picked
  let numMonths = 0;
  if (strMoveIn != "" && strMoveOut != "") {
    const numDays = (new Date(strMoveOut).getTime() - new Date(strMoveIn).getTime()) / 86400000;
    if (numDays > 0) {
      numMonths = Math.max(1, Math.round(numDays / 30));
    }
  }

  // only show the things the listing actually says
  const arrIncluded: string[] = [];
  if (objList != null) {
    if (objList.furnished == true) {
      arrIncluded.push("Furnished");
    } else if (objList.furnished == false) {
      arrIncluded.push("Not furnished");
    }
    if (objList.utilitiesIncluded == true) {
      arrIncluded.push("Utilities included");
    } else if (objList.utilitiesIncluded == false) {
      arrIncluded.push("Utilities not included");
    }
    if (objList.parkingAvailable == true) {
      arrIncluded.push("Parking");
    } else if (objList.parkingAvailable == false) {
      arrIncluded.push("No parking");
    }
    if (objList.laundryAvailable == true) {
      arrIncluded.push("Laundry");
    } else if (objList.laundryAvailable == false) {
      arrIncluded.push("No laundry");
    }
    if (objList.petsAllowed == true) {
      arrIncluded.push("Pets allowed");
    } else if (objList.petsAllowed == false) {
      arrIncluded.push("No pets");
    }
  }

  let arrPhotos: string[] = [];
  if (objList != null && objList.imageUrls != null) {
    arrPhotos = objList.imageUrls;
  }

  let strWhere = "";
  if (objList != null) {
    strWhere = `${showPlace(objList.city, objList.state)} ${objList.zipCode ?? ""}`;
    if (objList.address != null && objList.address != "") {
      strWhere = `${objList.address}, ${strWhere}`;
    }
  }

  return (
    <div className={`${objFont.className} bg-drift min-h-screen pb-16 text-[#1c2733]`}>
      <style>{strPageCss}</style>

      {/* z-[1100] keeps the nav above the map when you scroll */}
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

      {blnLoading == true && (
        <p className="mx-auto max-w-[1232px] px-8 pt-16 text-[#4a5866]">Loading...</p>
      )}

      {blnLoading == false && objList == null && (
        <div className="mx-auto flex max-w-[1232px] flex-col gap-3 px-8 pt-16">
          <h1 className="text-[30px] font-semibold">{strErr}</h1>
          <Link href="/search" className="text-[15px] font-semibold text-[#3f5b6e]">Back to search</Link>
        </div>
      )}

      {objList != null && (
        <div className="mx-auto flex max-w-[1232px] flex-col gap-[18px] px-8 pt-5">
          <Button type="button" onClick={() => objRouter.back()} className="fade-in h-auto w-fit bg-transparent p-0 text-sm font-semibold text-[#3f5b6e] hover:bg-transparent">
            ← Back to results
          </Button>

          {/* photos */}
          <div className="fade-in grid h-[352px] grid-cols-2 gap-3 md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2">
            <div className={`${strPhoto} row-span-2 rounded-[22px]`}>
              {arrPhotos.length > 0 ? <img src={arrPhotos[0]} alt={objList.title} className="h-full w-full object-cover" /> : "No photos yet"}
            </div>
            {[1, 2, 3, 4].map((numSpot) => (
              <div key={numSpot} className={`${strPhoto} hidden md:flex`}>
                {arrPhotos.length > numSpot ? <img src={arrPhotos[numSpot]} alt="" className="h-full w-full object-cover" /> : "Photo"}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

            <div className="fade-in delay-1 flex flex-1 flex-col gap-[22px]">
              <div className="flex flex-col gap-2">
                <h1 className="text-[40px] font-semibold leading-[1.08] tracking-[-1px] text-[#24313d]">{objList.title}</h1>
                <p className="text-[15px] text-[#4a5866]">{strWhere}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Card className={strInfoBox}>
                  <p className="text-xs font-medium text-[#4a5866]">Available</p>
                  <p className="text-[15px] font-semibold">{showDates(objList.availableFrom, objList.availableUntil)}</p>
                </Card>
                <Card className={strInfoBox}>
                  <p className="text-xs font-medium text-[#4a5866]">Rooms</p>
                  <p className="text-[15px] font-semibold">{showRooms(objList.bedrooms, objList.bathrooms)}</p>
                </Card>
                <Card className={strInfoBox}>
                  <p className="text-xs font-medium text-[#4a5866]">Type</p>
                  <p className="text-[15px] font-semibold">{showType(objList.listingType)}</p>
                </Card>
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">About this place</h2>
                <p className="max-w-[640px] whitespace-pre-line text-[15px] leading-relaxed text-[#2e3a46]">
                  {objList.description != null && objList.description != "" ? objList.description : "No description from the host yet."}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">What&apos;s included</h2>
                {arrIncluded.length == 0 ? (
                  <p className="text-[15px] text-[#4a5866]">The host didn&apos;t list this yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {arrIncluded.map((strItem) => (
                      <span key={strItem} className={strTag}>{strItem}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">Where it is</h2>
                {objList.latitude != null && objList.longitude != null ? (
                  <div className="h-[280px] max-w-[640px] overflow-hidden rounded-[22px] border border-white/60">
                    <ListingMap arrPins={[{ id: objList.id, price: numRent, lat: objList.latitude, lng: objList.longitude }]} arrPicked={[objList.id]} />
                  </div>
                ) : (
                  <p className="text-[15px] text-[#4a5866]">{strWhere}. The exact spot isn&apos;t listed yet.</p>
                )}
              </div>

              <Card className="max-w-[640px] flex-row items-center gap-3.5 rounded-2xl border border-white/60 bg-white/50 p-4 text-base text-[#1c2733] shadow-none ring-0">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3f5b6e] text-[15px] font-semibold text-white">
                  {(objList.contactName || "H").charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-[15px] font-semibold">{objList.contactName || "Host"}</p>
                  <p className="text-[13px] text-[#4a5866]">Listed on {objList.sourceName || "ReletMe"}</p>
                </div>
              </Card>
            </div>

            {/* price card */}
            <Card className="fade-in delay-2 w-full gap-4 rounded-[22px] border border-white/80 bg-white/70 p-[22px] text-base text-[#1c2733] shadow-[0_10px_30px_rgba(63,91,110,0.15)] ring-0 backdrop-blur-xl lg:sticky lg:top-24 lg:w-[360px]">
              {objList.monthlyRent != null ? (
                <p className="flex items-baseline gap-1">
                  <span className="text-[28px] font-semibold">${numRent.toLocaleString()}</span>
                  <span className="text-[15px] text-[#4a5866]">/mo</span>
                </p>
              ) : (
                <p className="text-[22px] font-semibold">Price not listed</p>
              )}

              {objList.securityDeposit != null && (
                <p className="-mt-2 text-sm text-[#4a5866]">Deposit {showMoney(objList.securityDeposit)}</p>
              )}

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

              <Button type="button" onClick={() => objRouter.push("/messages")} className="h-12 rounded-full bg-[#3f5b6e] text-[15px] font-semibold text-white hover:bg-[#34495a]">
                Message host
              </Button>

              <a href={objList.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center rounded-full border border-[#1c2733]/20 text-sm font-semibold text-[#1c2733] hover:bg-white/50">
                View on {objList.sourceName || "ReletMe"}
              </a>

              <div className="flex gap-2.5">
                <Button type="button" onClick={toggleSave} className={strOutlineBtn}>{blnSaved == true ? "Saved" : "Save"}</Button>
                <Button type="button" onClick={() => setBlnCompare(!blnCompare)} className={strOutlineBtn}>{blnCompare == true ? "Added" : "Add to compare"}</Button>
              </div>

              {numMonths > 0 && objList.monthlyRent != null && (
                <div className="flex flex-col gap-2 border-t border-[#1c2733]/10 pt-3.5 text-sm">
                  <p className="flex justify-between">
                    <span className="text-[#4a5866]">${numRent.toLocaleString()} × {numMonths} {numMonths == 1 ? "month" : "months"}</span>
                    <span className="font-semibold">${(numRent * numMonths).toLocaleString()}</span>
                  </p>
                  <p className="flex justify-between font-semibold">
                    <span>Total rent</span>
                    <span>${(numRent * numMonths).toLocaleString()}</span>
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