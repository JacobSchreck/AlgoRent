"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import AuthAccountLinks from "@/components/AuthAccountLinks";
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
  const [blnAuthorized, setBlnAuthorized] = useState<boolean | null>(null);
  const [strError, setStrError] = useState("");
  const [objExpandedNotes, setObjExpandedNotes] = useState<Record<string, boolean>>({});
  const [objLongNotes, setObjLongNotes] = useState<Record<string, boolean>>({});

  // Saved places are private to a signed-in browser session. A note query opens the
  // requested listing in the Messaged host column after authentication succeeds.
  useEffect(() => {
    async function loadSaved() {
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

      let arrHave = getSaved();
      const strNoteId = new URLSearchParams(window.location.search).get("note");
      const numNoteId = Number(strNoteId);
      if (Number.isInteger(numNoteId) && numNoteId > 0) {
        const objExisting = arrHave.find((objItem) => objItem.id == numNoteId);
        if (objExisting == undefined) {
          arrHave = [...arrHave, { id: numNoteId, status: "Messaged host", notes: [] }];
        } else {
          arrHave = arrHave.map((objItem) => objItem.id == numNoteId ? { ...objItem, status: "Messaged host" } : objItem);
        }
      }

      // Re-save normalized data so empty note rows do not return on the next visit.
      setSaved(arrHave);
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
      setBlnLoading(false);
    }
    loadSaved();
  }, [objRouter]);

  function changeStatus(numId: number, strStatus: string) {
    const arrNew = arrSaved.map((objItem) => {
      if (objItem.id == numId) {
        return { ...objItem, status: strStatus };
      } else {
        return objItem;
      }
    });
    setArrSaved(arrNew);
    setSaved(arrNew);
  }

  function changeNote(numId: number, numNoteIndex: number, strNote: string) {
    const arrNew = arrSaved.map((objItem) => {
      if (objItem.id != numId) return objItem;
      const arrNotes = objItem.notes != null && objItem.notes.length > 0 ? [...objItem.notes] : [""];
      arrNotes[numNoteIndex] = strNote;
      return { ...objItem, notes: arrNotes };
    });
    setArrSaved(arrNew);
    setSaved(arrNew);
  }

  function addNote(numId: number) {
    const arrNew = arrSaved.map((objItem) => {
      if (objItem.id != numId) return objItem;
      const arrNotes = objItem.notes != null && objItem.notes.length > 0 ? objItem.notes : [""];
      return { ...objItem, notes: [...arrNotes, ""] };
    });
    setArrSaved(arrNew);
    setSaved(arrNew);
  }

  function deleteNote(numId: number, numNoteIndex: number) {
    const arrNew = arrSaved.map((objItem) => objItem.id == numId
      ? { ...objItem, notes: (objItem.notes ?? []).filter((_, numIndex) => numIndex != numNoteIndex) }
      : objItem);
    setArrSaved(arrNew);
    setSaved(arrNew);
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
    setSaved(arrNew);
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
            <Link href="/login?next=/saved" className="text-sm font-semibold text-[#3f5b6e]">Go to sign in</Link>
          </div>
        )}
      </div>
    );
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
            <AuthAccountLinks />
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
        {strError != "" && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{strError}</p>}

        {blnLoading == false && strError == "" && arrRows.length == 0 && (
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
                  {strCol} <span className="font-normal text-[#4a5866]">· {arrRows.filter((objRow) => objRow.objItem.status == strCol).length}</span>
                </p>

                {arrRows.filter((objRow) => objRow.objItem.status == strCol).map((objRow) => (
                  <Card key={objRow.objList.id} className="gap-2 overflow-hidden rounded-2xl border border-white/70 bg-white/70 p-0 text-base text-[#1c2733] shadow-none ring-0">
                    {objRow.objList.imageUrls != null && objRow.objList.imageUrls.length > 0 && (
                      <img src={objRow.objList.imageUrls[0]} alt={objRow.objList.title} className="h-28 w-full object-cover" />
                    )}
                    <div className="flex flex-col gap-2 px-3.5 pb-3.5 pt-1.5">
                      <Link href={`/listings/${objRow.objList.id}`} className="line-clamp-2 text-[15px] font-semibold">{objRow.objList.title}</Link>
                      <p className="text-[13px] text-[#4a5866]">
                        {objRow.objList.monthlyRent == null ? "Price not listed" : `${showMoney(objRow.objList.monthlyRent)}/mo`} · {showDates(objRow.objList.availableFrom, objRow.objList.availableUntil)}
                      </p>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <select value={objRow.objItem.status} onChange={(evt) => changeStatus(objRow.objList.id, evt.target.value)} aria-label="Move to" className="h-9 rounded-full border border-[#1c2733]/15 bg-white px-3 text-[13px]">
                          {arrStatuses.map((strOpt) => (
                            <option key={strOpt} value={strOpt}>{strOpt}</option>
                          ))}
                        </select>
                        <Button type="button" onClick={() => removeOne(objRow.objList.id)} className="h-9 bg-transparent px-2 text-[13px] font-medium text-[#4a5866] hover:bg-transparent hover:text-[#1c2733]">
                          Remove
                        </Button>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs font-semibold text-[#4a5866]">Notes</p>
                        <Button type="button" onClick={() => addNote(objRow.objList.id)} aria-label={`Add another note for ${objRow.objList.title}`} title="Add another note" className="h-7 w-7 rounded-full border border-[#1c2733]/15 bg-white/70 p-0 text-[#3f5b6e] hover:bg-white">
                          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {(objRow.objItem.notes != null && objRow.objItem.notes.length > 0 ? objRow.objItem.notes : [""]).map((strNote, numNoteIndex) => {
                          const strKey = noteKey(objRow.objList.id, numNoteIndex);
                          const blnExpanded = objExpandedNotes[strKey] == true;
                          return (
                            <div key={strKey} className="relative">
                              <textarea
                                ref={(objField) => {
                                  if (objField != null) fitNoteField(objField, strKey, blnExpanded);
                                }}
                                value={strNote}
                                onChange={(evt) => changeNote(objRow.objList.id, numNoteIndex, evt.target.value)}
                                onFocus={(evt) => {
                                  setNoteExpanded(strKey, true);
                                  fitNoteField(evt.currentTarget, strKey, true);
                                }}
                                onInput={(evt) => {
                                  setNoteExpanded(strKey, true);
                                  fitNoteField(evt.currentTarget, strKey, true);
                                }}
                                rows={1}
                                maxLength={2000}
                                aria-label={`Note ${numNoteIndex + 1} for ${objRow.objList.title}`}
                                placeholder="Add a note"
                                className="h-11 w-full resize-none overflow-hidden rounded-xl border border-[#1c2733]/15 bg-white py-3 pl-3 pr-20 text-sm font-normal leading-5 text-[#1c2733] outline-none focus:border-[#3f5b6e]"
                              />
                              <div className="absolute right-1.5 top-1.5 flex items-center">
                                {objLongNotes[strKey] && (
                                  <Button
                                    type="button"
                                    onMouseDown={(evt) => evt.preventDefault()}
                                    onClick={() => setNoteExpanded(strKey, !blnExpanded)}
                                    aria-label={blnExpanded ? "Collapse note to one line" : "Expand full note"}
                                    title={blnExpanded ? "Collapse note" : "Expand note"}
                                    className="h-8 w-8 rounded-full bg-transparent p-0 text-[#4a5866] hover:bg-slate-100">
                                    {blnExpanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                                  </Button>
                                )}
                                {numNoteIndex < (objRow.objItem.notes?.length ?? 0) && (
                                  <Button
                                    type="button"
                                    onMouseDown={(evt) => evt.preventDefault()}
                                    onClick={() => deleteNote(objRow.objList.id, numNoteIndex)}
                                    aria-label={`Delete note ${numNoteIndex + 1}`}
                                    title="Delete note"
                                    className="h-8 w-8 rounded-full bg-transparent p-0 text-red-700 hover:bg-red-50">
                                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-[#4a5866]">Saved automatically</p>
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
