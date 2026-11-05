"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, ExternalLink, X } from "lucide-react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { strApiUrl } from "@/lib/listings";

type QueueItem = {
  id: number;
  listingId: number;
  listingTitle: string;
  sourceUrl: string;
  sourceName: string;
  reason: string;
  details: string | null;
  status: string;
  reporterEmail: string | null;
  createdAt: string;
};

const objFont = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700", "800"] });

function showReason(strReason: string) {
  return strReason.toLowerCase().replaceAll("_", " ").replace(/^./, (strFirst) => strFirst.toUpperCase());
}

export default function ModerationPage() {
  const [arrItems, setArrItems] = useState<QueueItem[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [numUpdating, setNumUpdating] = useState<number | null>(null);

  const loadQueue = useCallback(async () => {
    setBlnLoading(true);
    setStrError("");
    try {
      const objRes = await fetch(`${strApiUrl}/api/moderation/flags`, { credentials: "include" });
      const objData = await objRes.json().catch(() => null);
      if (objRes.ok) {
        setArrItems(objData);
      } else if (objRes.status == 401) {
        setStrError("Sign in with an admin account to view this page.");
      } else if (objRes.status == 403) {
        setStrError("Your account does not have admin access.");
      } else {
        setStrError(objData?.detail || "Could not load the moderation queue.");
      }
    } catch {
      setStrError("Unable to connect to the server.");
    } finally {
      setBlnLoading(false);
    }
  }, []);

  useEffect(() => {
    const numTimer = window.setTimeout(() => {
      loadQueue();
    }, 0);
    return () => window.clearTimeout(numTimer);
  }, [loadQueue]);

  async function reviewFlag(numId: number, strStatus: "APPROVED" | "DISMISSED") {
    setNumUpdating(numId);
    setStrError("");
    try {
      const objRes = await fetch(`${strApiUrl}/api/moderation/flags/${numId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: strStatus }),
      });
      const objData = await objRes.json().catch(() => null);
      if (objRes.ok) {
        setArrItems((arrCurrent) => arrCurrent.filter((objItem) => objItem.id != numId));
      } else {
        setStrError(objData?.detail || "Could not update the moderation item.");
      }
    } catch {
      setStrError("Unable to connect to the server.");
    } finally {
      setNumUpdating(null);
    }
  }

  return (
    <div className={`${objFont.className} min-h-screen bg-[linear-gradient(125deg,#b9cbe0,#c3c9e3,#a8c0d6)] pb-20 text-[#1c2733]`}>
      <nav className="sticky top-0 z-10 border-b border-white/35 bg-white/35 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-8">
          <Link href="/" className="text-[18px] font-bold">AlgoRent</Link>
          <div className="flex items-center gap-5 text-sm font-medium">
            <Link href="/search">Search</Link>
            <Link href="/moderation" className="font-bold">Moderation</Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto flex max-w-[1100px] flex-col gap-6 px-8 pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[2px] text-[#3f5b6e]">Trust and safety</p>
            <h1 className="mt-1 text-[36px] font-semibold tracking-tight">Moderation queue</h1>
            <p className="mt-1 text-sm text-[#4a5866]">Review pending listing reports from oldest to newest.</p>
          </div>
          <Button type="button" onClick={loadQueue} disabled={blnLoading} className="h-10 rounded-full border border-[#1c2733]/20 bg-white/50 px-5 text-[#1c2733] hover:bg-white/75">Refresh</Button>
        </div>

        {strError != "" && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-800">{strError}</p>}
        {blnLoading && <p className="text-sm text-[#4a5866]">Loading reports...</p>}

        {!blnLoading && strError == "" && arrItems.length == 0 && (
          <Card className="items-center gap-3 rounded-[22px] border border-white/70 bg-white/55 p-10 text-center shadow-none ring-0">
            <Check className="h-9 w-9 text-emerald-700" aria-hidden="true" />
            <h2 className="text-xl font-semibold">Queue cleared</h2>
            <p className="text-sm text-[#4a5866]">There are no pending listing reports.</p>
          </Card>
        )}

        <div className="grid gap-4">
          {arrItems.map((objItem) => (
            <Card key={objItem.id} className="gap-4 rounded-[22px] border border-white/75 bg-white/65 p-5 text-base shadow-none ring-0 backdrop-blur-xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700"><AlertTriangle aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-red-700">{showReason(objItem.reason)}</p>
                    <Link href={`/listings/${objItem.listingId}`} className="mt-1 block text-lg font-semibold hover:underline">{objItem.listingTitle}</Link>
                    <p className="mt-1 text-xs text-[#4a5866]">Reported by {objItem.reporterEmail || "deleted account"} · {new Date(objItem.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <a href={objItem.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-semibold text-[#3f5b6e]">View on {objItem.sourceName}<ExternalLink aria-hidden="true" className="h-4 w-4" /></a>
              </div>

              <p className="rounded-xl bg-white/65 p-4 text-sm leading-relaxed text-[#2e3a46]">{objItem.details || "No additional details were provided."}</p>

              <div className="flex flex-wrap justify-end gap-3">
                <Button type="button" onClick={() => reviewFlag(objItem.id, "DISMISSED")} disabled={numUpdating == objItem.id} className="h-10 gap-2 rounded-full border border-[#1c2733]/20 bg-transparent px-4 text-[#1c2733] hover:bg-white/60"><X aria-hidden="true" />Dismiss</Button>
                <Button type="button" onClick={() => reviewFlag(objItem.id, "APPROVED")} disabled={numUpdating == objItem.id} className="h-10 gap-2 rounded-full bg-[#3f5b6e] px-4 text-white hover:bg-[#34495a]"><Check aria-hidden="true" />Approve &amp; hide</Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
