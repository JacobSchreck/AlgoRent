"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import AuthAccountLinks from "@/components/AuthAccountLinks";
import { strApiUrl, ListingDetail, showDates, showMoney, showPlace, showRooms } from "@/lib/listings";
import { loadSaved, saveItem, removeItem, SavedItem } from "@/lib/saved";

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

type SavedMerge = { id: number; firstListingId: number; secondListingId: number; moveIn: string; moveOut: string };

const arrStatuses = ["Interested", "Messaged host", "Toured", "Applied"];

export default function SavedPage() {
  const objRouter = useRouter();
  const [arrSaved, setArrSaved] = useState<SavedItem[]>([]);
  const [arrDetails, setArrDetails] = useState<ListingDetail[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strStatusFilter, setStrStatusFilter] = useState("All");
  const [arrCompare, setArrCompare] = useState<number[]>([]);
  const [arrMerges, setArrMerges] = useState<SavedMerge[]>([]);
  const [objMergeDetails, setObjMergeDetails] = useState<Record<number, ListingDetail>>({});
  const [strView, setStrView] = useState<"listings" | "merges">("listings");
  const [strMergeError, setStrMergeError] = useState("");
  const [blnAuthorized, setBlnAuthorized] = useState<boolean | null>(null);
  const [strError, setStrError] = useState("");
  const [objExpandedNotes, setObjExpandedNotes] = useState<Record<string, boolean>>({});
  const [objLongNotes, setObjLongNotes] = useState<Record<string, boolean>>({});
  const objNoteTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  // latest list so a delayed note save doesn't send an old status
  const objLatest = useRef<SavedItem[]>([]);
  useEffect(() => {
    objLatest.current = arrSaved;
  }, [arrSaved]);

  // Saved places are private to a signed-in browser session. A note query opens the
  // requested listing in the Messaged host column after authentication succeeds.
  useEffect(() => {
    async function loadPage() {
      try {
        const objAuthRes = await fetch(`${strApiUrl}/api/auth/me`, { credentials: "include" });
        if (!objAuthRes.ok) {
          const strReturnTo = `${window.location.pathname}${window.location.search}`;
          objRouter.replace(`/login?next=${encodeURIComponent(strReturnTo)}`);
          return;
        }
        setBlnAuthorized(true);
      } catch {
        setBlnAuthorized(false);
        setStrError("Unable to verify your sign-in. Please try again.");
        setBlnLoading(false);
        return;
      }

      let arrHave: SavedItem[] = [];
      try {
        const arrLoaded = await loadSaved();
        if (arrLoaded == null) {
          const strReturnTo = `${window.location.pathname}${window.location.search}`;
          objRouter.replace(`/login?next=${encodeURIComponent(strReturnTo)}`);
          return;
        }
        arrHave = arrLoaded;
      } catch {
        setStrError("Unable to load your saved listings. Please try again.");
        setBlnLoading(false);
        return;
      }
      const strNoteId = new URLSearchParams(window.location.search).get("note");
      const numNoteId = Number(strNoteId);
      if (Number.isInteger(numNoteId) && numNoteId > 0) {
        const objExisting = arrHave.find((objItem) => objItem.id == numNoteId);
        const objMessaged: SavedItem = objExisting == undefined
          ? { id: numNoteId, status: "Messaged host", notes: [] }
          : { ...objExisting, status: "Messaged host" };
        arrHave = objExisting == undefined
          ? [...arrHave, objMessaged]
          : arrHave.map((objItem) => objItem.id == numNoteId ? objMessaged : objItem);
        if (!(await saveItem(objMessaged))) {
          setStrError("Couldn't save your change. Check your connection and try again.");
        }
      }

      setArrSaved(arrHave);

      const arrFound: ListingDetail[] = [];
      for (const objItem of arrHave) {
        try {
          const objRes = await fetch(`${strApiUrl}/api/listings/${objItem.id}`);
          if (objRes.ok == true) {
            const objListing: ListingDetail = await objRes.json();
            arrFound.push(objListing);
          }
        } catch (objErr) {
          console.log("couldnt reach backend", objErr);
        }
      }
      setArrDetails(arrFound);
      try {
        const objMergeRes = await fetch(`${strApiUrl}/api/saved/merges`, { credentials: "include" });
        if (objMergeRes.ok) {
          const arrFoundMerges: SavedMerge[] = await objMergeRes.json();
          setArrMerges(arrFoundMerges);
          const objDetails: Record<number, ListingDetail> = {};
          const arrIds = [...new Set(arrFoundMerges.flatMap((objMerge) => [objMerge.firstListingId, objMerge.secondListingId]))];
          await Promise.all(arrIds.map(async (numId) => {
            const objExisting = arrFound.find((objList) => objList.id === numId);
            if (objExisting) { objDetails[numId] = objExisting; return; }
            try {
              const objRes = await fetch(`${strApiUrl}/api/listings/${numId}`);
              if (objRes.ok) objDetails[numId] = await objRes.json();
            } catch { /* Keep other pairs visible. */ }
          }));
          setObjMergeDetails(objDetails);
        }
      } catch { setStrMergeError("Couldn't load Merge Stays."); }
      setBlnLoading(false);
    }
    loadPage();
  }, [objRouter]);

  async function saveOne(objItem: SavedItem | undefined) {
    if (objItem != undefined && !(await saveItem(objItem))) {
      setStrError("Couldn't save your change. Check your connection and try again.");
    }
  }

  function saveNotesSoon(numId: number) {
    clearTimeout(objNoteTimers.current[numId]);
    objNoteTimers.current[numId] = setTimeout(
      () => saveOne(objLatest.current.find((objItem) => objItem.id == numId)),
      700,
    );
  }

  function changeStatus(numId: number, strStatus: string) {
    const arrNew = arrSaved.map((objItem) => {
      if (objItem.id == numId) {
        return { ...objItem, status: strStatus };
      } else {
        return objItem;
      }
    });
    setArrSaved(arrNew);
    clearTimeout(objNoteTimers.current[numId]);
    saveOne(arrNew.find((objItem) => objItem.id == numId));
  }

  function changeNote(numId: number, numNoteIndex: number, strNote: string) {
    const arrNew = arrSaved.map((objItem) => {
      if (objItem.id != numId) return objItem;
      const arrNotes = objItem.notes != null && objItem.notes.length > 0 ? [...objItem.notes] : [""];
      arrNotes[numNoteIndex] = strNote;
      return { ...objItem, notes: arrNotes };
    });
    setArrSaved(arrNew);
    saveNotesSoon(numId);
  }

  function addNote(numId: number) {
    const arrNew = arrSaved.map((objItem) => {
      if (objItem.id != numId) return objItem;
      const arrNotes = objItem.notes != null && objItem.notes.length > 0 ? objItem.notes : [""];
      return { ...objItem, notes: [...arrNotes, ""] };
    });
    setArrSaved(arrNew);
  }

  function deleteNote(numId: number, numNoteIndex: number) {
    const arrNew = arrSaved.map((objItem) => objItem.id == numId
      ? { ...objItem, notes: (objItem.notes ?? []).filter((_, numIndex) => numIndex != numNoteIndex) }
      : objItem);
    setArrSaved(arrNew);
    clearTimeout(objNoteTimers.current[numId]);
    saveOne(arrNew.find((objItem) => objItem.id == numId));
    const strPrefix = `${numId}-`;
    setObjExpandedNotes((objCurrent) => Object.fromEntries(Object.entries(objCurrent).filter(([strKey]) => !strKey.startsWith(strPrefix))));
    setObjLongNotes((objCurrent) => Object.fromEntries(Object.entries(objCurrent).filter(([strKey]) => !strKey.startsWith(strPrefix))));
  }

  function noteKey(numId: number, numNoteIndex: number) {
    return `${numId}-${numNoteIndex}`;
  }

  function fitNoteField(objField: HTMLTextAreaElement, strKey: string, blnExpanded: boolean) {
    objField.style.height = "44px";
    const blnLong = objField.value != "" && objField.scrollHeight > 44;
    setObjLongNotes((objCurrent) => objCurrent[strKey] == blnLong ? objCurrent : { ...objCurrent, [strKey]: blnLong });
    if (blnExpanded) {
      objField.style.height = `${objField.scrollHeight}px`;
    }
  }

  function setNoteExpanded(strKey: string, blnExpanded: boolean) {
    setObjExpandedNotes((objCurrent) => ({ ...objCurrent, [strKey]: blnExpanded }));
  }

  function removeOne(numId: number) {
    const arrNew = arrSaved.filter((objItem) => objItem.id != numId);
    setArrSaved(arrNew);
    clearTimeout(objNoteTimers.current[numId]);
    removeItem(numId).then((blnOk) => {
      if (!blnOk) setStrError("Couldn't remove that listing. Check your connection and try again.");
    });
    setArrDetails(arrDetails.filter((objList) => objList.id != numId));
  }

  // match each saved place to its listing info
  const arrRows: { objItem: SavedItem; objList: ListingDetail }[] = [];
  for (const objItem of arrSaved) {
    const objList = arrDetails.find((objFind) => objFind.id == objItem.id);
    if (objList != undefined) {
      arrRows.push({ objItem: objItem, objList: objList });
    }
  }

  if (blnAuthorized !== true) {
    return (
      <div className={`${objFont.className} bg-drift min-h-screen text-[#1c2733]`}>
        <style>{strPageCss}</style>
        {blnAuthorized == false && (
          <div className="mx-auto flex max-w-[640px] flex-col gap-3 px-8 pt-16">
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{strError}</p>
            <Link href="/login?next=/saved" className="text-sm font-semibold text-[#2c4556]">Go to sign in</Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${objFont.className} bg-drift min-h-screen pb-20 text-[#1c2733]`}>
      <style>{strPageCss}</style>

      <nav className="sticky top-0 z-[1100] border-b border-white/35 bg-white/25 backdrop-blur-lg">
        <div className="mx-auto flex min-h-16 max-w-[1232px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-8">
          <Link href="/" className="text-[18px] font-bold tracking-tight">AlgoRent</Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] font-medium sm:gap-x-6">
            <Link href="/search">Search</Link>
            <Link href="/saved" className="font-semibold">Saved</Link>
            <AuthAccountLinks />
          </div>
        </div>
      </nav>

      <main>

      <div className="mx-auto max-w-[1232px] px-8 pt-10">
        <div className="fade-in mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-[36px] font-semibold tracking-[-1px] text-[#24313d]">Saved places</h1>
            <p className="mt-1 text-[15px] text-[#38444f]">Keep track of where you are with each place.</p>
          </div>
          {strView === "listings" && <Button type="button" disabled={arrCompare.length < 2} onClick={() => objRouter.push(`/compare?ids=${arrCompare.join(",")}`)} className="h-11 rounded-full bg-[#3f5b6e] px-6 text-sm font-semibold text-white hover:bg-[#34495a] disabled:cursor-not-allowed disabled:opacity-45">
            Compare ({arrCompare.length}/3)
          </Button>}
        </div>

        <div className="mb-5 flex gap-2">
          {(["listings", "merges"] as const).map((strTab) => (
            <Button key={strTab} type="button" onClick={() => setStrView(strTab)}
              className={`h-9 rounded-full border px-4 text-[13px] font-semibold ${strView === strTab ? "border-[#3f5b6e] bg-[#3f5b6e] text-white" : "border-white/70 bg-white/55 text-[#1c2733]"}`}>
              {strTab === "listings" ? "Listings" : `Merge Stays (${arrMerges.length})`}
            </Button>
          ))}
        </div>
        {strView === "merges" && strMergeError && <p role="alert" className="mb-3 text-sm text-red-700">{strMergeError}</p>}
        {strView === "merges" && !blnLoading && (
          <div className="grid gap-4 lg:grid-cols-2">
            {arrMerges.length === 0 && <p className="text-sm text-[#38444f]">No Merge Stays saved.</p>}
            {arrMerges.map((objMerge) => (
              <Card key={objMerge.id} className="gap-3 rounded-2xl border border-white/70 bg-white/75 p-4 shadow-none">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold">Merge Stay</h2>
                  <Button type="button" onClick={async () => {
                    try {
                      const objRes = await fetch(`${strApiUrl}/api/saved/merges/${objMerge.id}`, { method: "DELETE", credentials: "include" });
                      if (!objRes.ok) throw new Error();
                      setArrMerges((arrCurrent) => arrCurrent.filter((objItem) => objItem.id !== objMerge.id));
                    } catch { setStrMergeError("Couldn't remove Merge Stay."); }
                  }} className="h-9 rounded-full bg-transparent px-3 text-[13px] text-red-700 hover:bg-red-50">Remove</Button>
                </div>
                <p className="text-xs text-[#38444f]">{objMerge.moveIn} – {objMerge.moveOut}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[objMerge.firstListingId, objMerge.secondListingId].map((numId, numIndex) => (
                    <div key={numId} className="rounded-xl border border-[#1c2733]/10 p-3">
                      <p className="text-xs text-[#38444f]">Stay {numIndex + 1}</p>
                      <Link href={`/listings/${numId}`} className="mt-1 block text-sm font-semibold hover:underline">
                        {objMergeDetails[numId]?.title ?? `Listing ${numId}`}
                      </Link>
                      {objMergeDetails[numId] && <p className="mt-1 text-xs text-[#38444f]">{showDates(objMergeDetails[numId].availableFrom, objMergeDetails[numId].availableUntil)}</p>}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#38444f]">Apply to each listing separately.</p>
              </Card>
            ))}
          </div>
        )}
        {strView === "listings" && <>
        {blnLoading == true && <p className="text-[#38444f]">Loading...</p>}
        {strError != "" && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{strError}</p>}

        {blnLoading == false && strError == "" && arrRows.length == 0 && (
          <div className="fade-in flex flex-col gap-2 pt-6">
            <p className="text-[15px] text-[#38444f]">Nothing saved yet. Press Save on any listing and it shows up here.</p>
            <Link href="/search" className="text-[15px] font-semibold text-[#2c4556]">Find places</Link>
          </div>
        )}

        {arrRows.length > 0 && (
          <>
            <div className="fade-in mb-5 flex flex-wrap gap-2" aria-label="Filter saved listings">
              {["All", ...arrStatuses].map((strStatus) => (
                <Button
                  key={strStatus}
                  type="button"
                  onClick={() => setStrStatusFilter(strStatus)}
                  aria-pressed={strStatusFilter === strStatus}
                  className={`h-9 rounded-full border px-4 text-[13px] font-semibold ${strStatusFilter === strStatus ? "border-[#3f5b6e] bg-[#3f5b6e] text-white hover:bg-[#34495a]" : "border-white/70 bg-white/55 text-[#1c2733] hover:bg-white/85"}`}
                >
                  {strStatus} ({strStatus === "All" ? arrRows.length : arrRows.filter((objRow) => objRow.objItem.status === strStatus).length})
                </Button>
              ))}
            </div>
            <div className="fade-in grid gap-4 lg:grid-cols-2">
              {arrRows.filter((objRow) => strStatusFilter === "All" || objRow.objItem.status === strStatusFilter).map((objRow) => {
                const blnSelected = arrCompare.includes(objRow.objList.id);
                return (
                  <Card key={objRow.objList.id} className="gap-0 overflow-hidden rounded-2xl border border-white/70 bg-white/75 p-4 text-[#1c2733] shadow-none ring-0">
                    <div className="flex gap-3">
                      {objRow.objList.imageUrls?.[0] ? (
                        <img src={objRow.objList.imageUrls[0]} alt={objRow.objList.title} className="h-28 w-28 shrink-0 rounded-xl object-cover sm:h-32 sm:w-32" />
                      ) : (
                        <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl bg-[#e5e9ee] text-xs text-[#64707c] sm:h-32 sm:w-32">No photo</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <Link href={`/listings/${objRow.objList.id}`} className="line-clamp-2 text-[15px] font-semibold leading-snug hover:underline">{objRow.objList.title}</Link>
                        <p className="mt-1 text-[15px] font-bold">{objRow.objList.monthlyRent == null ? "Price not listed" : `${showMoney(objRow.objList.monthlyRent)}/mo`}</p>
                        <p className="mt-1 text-[12px] text-[#38444f]">{showPlace(objRow.objList.city, objRow.objList.state)}</p>
                        <p className="mt-0.5 text-[12px] text-[#38444f]">{showRooms(objRow.objList.bedrooms, objRow.objList.bathrooms)}</p>
                        <p className="mt-0.5 text-[12px] text-[#38444f]">{showDates(objRow.objList.availableFrom, objRow.objList.availableUntil)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select value={objRow.objItem.status} onChange={(evt) => changeStatus(objRow.objList.id, evt.target.value)} aria-label="Move to" className="h-9 rounded-full border border-[#1c2733]/15 bg-white px-3 text-[13px]">
                        {arrStatuses.map((strOpt) => <option key={strOpt} value={strOpt}>{strOpt}</option>)}
                      </select>
                      <Button type="button" aria-pressed={blnSelected} disabled={!blnSelected && arrCompare.length >= 3} onClick={() => setArrCompare((arrCurrent) => arrCurrent.includes(objRow.objList.id) ? arrCurrent.filter((numId) => numId !== objRow.objList.id) : arrCurrent.length < 3 ? [...arrCurrent, objRow.objList.id] : arrCurrent)} className={`h-9 rounded-full border px-3 text-[13px] font-medium disabled:opacity-40 ${blnSelected ? "border-[#3f5b6e] bg-[#3f5b6e] text-white hover:bg-[#34495a]" : "border-[#1c2733]/15 bg-white text-[#1c2733] hover:bg-slate-50"}`}>
                        {blnSelected ? "Selected" : "Compare"}
                      </Button>
                      <Button type="button" onClick={() => objRouter.push(`/listings/${objRow.objList.id}`)} className="h-9 rounded-full border border-[#1c2733]/15 bg-white px-3 text-[13px] font-medium text-[#1c2733] hover:bg-slate-50">View listing</Button>
                      <Button type="button" onClick={() => { setArrCompare((arrCurrent) => arrCurrent.filter((numId) => numId !== objRow.objList.id)); removeOne(objRow.objList.id); }} className="h-9 rounded-full bg-transparent px-3 text-[13px] font-medium text-[#38444f] hover:bg-red-50 hover:text-red-700">Remove</Button>
                    </div>
                    <div className="mt-3 border-t border-[#1c2733]/10 pt-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[#38444f]">Notes</p>
                        <Button type="button" onClick={() => addNote(objRow.objList.id)} aria-label={`Add another note for ${objRow.objList.title}`} title="Add another note" className="h-7 w-7 rounded-full border border-[#1c2733]/15 bg-white/70 p-0 text-[#2c4556] hover:bg-white">
                          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-col gap-2">
                        {(objRow.objItem.notes != null && objRow.objItem.notes.length > 0 ? objRow.objItem.notes : [""]).map((strNote, numNoteIndex) => {
                          const strKey = noteKey(objRow.objList.id, numNoteIndex);
                          const blnExpanded = objExpandedNotes[strKey] == true;
                          return (
                            <div key={strKey} className="relative">
                              <textarea
                                ref={(objField) => { if (objField != null) fitNoteField(objField, strKey, blnExpanded); }}
                                value={strNote}
                                onChange={(evt) => changeNote(objRow.objList.id, numNoteIndex, evt.target.value)}
                                onFocus={(evt) => { setNoteExpanded(strKey, true); fitNoteField(evt.currentTarget, strKey, true); }}
                                onInput={(evt) => { setNoteExpanded(strKey, true); fitNoteField(evt.currentTarget, strKey, true); }}
                                rows={1}
                                maxLength={2000}
                                aria-label={`Note ${numNoteIndex + 1} for ${objRow.objList.title}`}
                                placeholder="Add a note"
                                className="h-11 w-full resize-none overflow-hidden rounded-xl border border-[#1c2733]/15 bg-white py-3 pl-3 pr-20 text-sm font-normal leading-5 text-[#1c2733] outline-none focus:border-[#3f5b6e]"
                              />
                              <div className="absolute right-1.5 top-1.5 flex items-center">
                                {objLongNotes[strKey] && (
                                  <Button type="button" onMouseDown={(evt) => evt.preventDefault()} onClick={() => setNoteExpanded(strKey, !blnExpanded)} aria-label={blnExpanded ? "Collapse note to one line" : "Expand full note"} title={blnExpanded ? "Collapse note" : "Expand note"} className="h-8 w-8 rounded-full bg-transparent p-0 text-[#38444f] hover:bg-slate-100">
                                    {blnExpanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                                  </Button>
                                )}
                                {numNoteIndex < (objRow.objItem.notes?.length ?? 0) && (
                                  <Button type="button" onMouseDown={(evt) => evt.preventDefault()} onClick={() => deleteNote(objRow.objList.id, numNoteIndex)} aria-label={`Delete note ${numNoteIndex + 1}`} title="Delete note" className="h-8 w-8 rounded-full bg-transparent p-0 text-red-700 hover:bg-red-50">
                                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-[11px] text-[#38444f]">Saved automatically</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
        </>}
      </div>
      </main>
    </div>
  );
}
