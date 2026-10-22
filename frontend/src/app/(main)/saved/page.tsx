"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { strApiUrl, ListingDetail, showDates, showMoney } from "@/lib/listings";
import { getSaved, setSaved, SavedItem } from "@/lib/saved";

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

const arrStatuses = ["Interested", "Messaged host", "Toured", "Applied"];

export default function SavedPage() {
  const objRouter = useRouter();
  const [arrSaved, setArrSaved] = useState<SavedItem[]>([]);
  const [arrDetails, setArrDetails] = useState<ListingDetail[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);

  // load what was saved, then get each listing from the backend
  useEffect(() => {
    async function loadSaved() {
      const arrHave = getSaved();
      setArrSaved(arrHave);

      const arrFound: ListingDetail[] = [];
      for (const objItem of arrHave) {
        try {
          const objRes = await fetch(`${strApiUrl}/api/listings/${objItem.id}`);
          if (objRes.ok == true) {
            arrFound.push(await objRes.json());
          }
        } catch (objErr) {
          console.log("couldnt reach backend", objErr);
        }
      }
      setArrDetails(arrFound);
      setBlnLoading(false);
    }
    loadSaved();
  }, []);

  function changeStatus(numId: number, strStatus: string) {
    const arrNew = arrSaved.map((objItem) => {
      if (objItem.id == numId) {
        return { id: objItem.id, status: strStatus };
      } else {
        return objItem;
      }
    });
    setArrSaved(arrNew);
    setSaved(arrNew);
  }

  function removeOne(numId: number) {
    const arrNew = arrSaved.filter((objItem) => objItem.id != numId);
    setArrSaved(arrNew);
    setSaved(arrNew);
    setArrDetails(arrDetails.filter((objList) => objList.id != numId));
  }

  // match each saved place to its listing info
  const arrRows: { status: string; objList: ListingDetail }[] = [];
  for (const objItem of arrSaved) {
    const objList = arrDetails.find((objFind) => objFind.id == objItem.id);
    if (objList != undefined) {
      arrRows.push({ status: objItem.status, objList: objList });
    }
  }

  return (
    <div className={`${objFont.className} bg-drift min-h-screen pb-20 text-[#1c2733]`}>
      <style>{strPageCss}</style>

      <nav className="sticky top-0 z-[1100] border-b border-white/35 bg-white/25 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-[1232px] items-center justify-between px-8">
          <Link href="/" className="text-[18px] font-bold tracking-tight">AlgoRent</Link>
          <div className="flex items-center gap-6 text-[14px] font-medium">
            <Link href="/search">Search</Link>
            <Link href="/saved" className="font-semibold">Saved</Link>
            <Link href="/messages">Messages</Link>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-[1232px] px-8 pt-10">
        <div className="fade-in mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-[36px] font-semibold tracking-[-1px] text-[#24313d]">Saved places</h1>
            <p className="mt-1 text-[15px] text-[#4a5866]">Keep track of where you are with each place.</p>
          </div>
          {arrRows.length >= 2 && (
            <Button type="button" onClick={() => objRouter.push(`/compare?ids=${arrRows.map((objRow) => objRow.objList.id).join(",")}`)} className="h-11 rounded-full bg-[#3f5b6e] px-6 text-sm font-semibold text-white hover:bg-[#34495a]">
              Compare saved
            </Button>
          )}
        </div>

        {blnLoading == true && <p className="text-[#4a5866]">Loading...</p>}

        {blnLoading == false && arrRows.length == 0 && (
          <div className="fade-in flex flex-col gap-2 pt-6">
            <p className="text-[15px] text-[#4a5866]">Nothing saved yet. Press Save on any listing and it shows up here.</p>
            <Link href="/search" className="text-[15px] font-semibold text-[#3f5b6e]">Find places</Link>
          </div>
        )}

        {arrRows.length > 0 && (
          <div className="fade-in grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {arrStatuses.map((strCol) => (
              <div key={strCol} className="flex flex-col gap-3 rounded-[22px] border border-white/60 bg-white/30 p-4">
                <p className="text-sm font-semibold">
                  {strCol} <span className="font-normal text-[#4a5866]">· {arrRows.filter((objRow) => objRow.status == strCol).length}</span>
                </p>

                {arrRows.filter((objRow) => objRow.status == strCol).map((objRow) => (
                  <Card key={objRow.objList.id} className="gap-2 overflow-hidden rounded-2xl border border-white/70 bg-white/70 p-0 text-base text-[#1c2733] shadow-none ring-0">
                    {objRow.objList.imageUrls != null && objRow.objList.imageUrls.length > 0 && (
                      <img src={objRow.objList.imageUrls[0]} alt={objRow.objList.title} className="h-28 w-full object-cover" />
                    )}
                    <div className="flex flex-col gap-2 px-3.5 pb-3.5 pt-1.5">
                      <Link href={`/listings/${objRow.objList.id}`} className="line-clamp-2 text-[15px] font-semibold">{objRow.objList.title}</Link>
                      <p className="text-[13px] text-[#4a5866]">
                        {showMoney(objRow.objList.monthlyRent)}/mo · {showDates(objRow.objList.availableFrom, objRow.objList.availableUntil)}
                      </p>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <select value={objRow.status} onChange={(evt) => changeStatus(objRow.objList.id, evt.target.value)} aria-label="Move to" className="h-9 rounded-full border border-[#1c2733]/15 bg-white px-3 text-[13px]">
                          {arrStatuses.map((strOpt) => (
                            <option key={strOpt} value={strOpt}>{strOpt}</option>
                          ))}
                        </select>
                        <Button type="button" onClick={() => removeOne(objRow.objList.id)} className="h-9 bg-transparent px-2 text-[13px] font-medium text-[#4a5866] hover:bg-transparent hover:text-[#1c2733]">
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}