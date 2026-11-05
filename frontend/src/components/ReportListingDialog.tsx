"use client";

import { FormEvent, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { strApiUrl } from "@/lib/listings";
import { Button } from "@/components/ui/button";

type ReportListingDialogProps = {
  listingId: number;
  listingTitle: string;
};

const arrReasons = [
  ["SCAM", "Possible scam or fraud"],
  ["INACCURATE", "Information is inaccurate"],
  ["UNAVAILABLE", "Listing is no longer available"],
  ["DUPLICATE", "Duplicate listing"],
  ["INAPPROPRIATE", "Inappropriate content"],
  ["OTHER", "Other"],
] as const;

export default function ReportListingDialog({ listingId, listingTitle }: ReportListingDialogProps) {
  const [blnOpen, setBlnOpen] = useState(false);
  const [strReason, setStrReason] = useState("");
  const [strDetails, setStrDetails] = useState("");
  const [strMessage, setStrMessage] = useState("");
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [blnSubmitted, setBlnSubmitted] = useState(false);

  function openDialog() {
    setStrReason("");
    setStrDetails("");
    setStrMessage("");
    setBlnSubmitted(false);
    setBlnOpen(true);
  }

  async function submitReport(evt: FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    if (strReason == "") {
      setStrMessage("Choose a reason for the report.");
      return;
    }

    setBlnSubmitting(true);
    setStrMessage("");
    try {
      const objRes = await fetch(`${strApiUrl}/api/listings/${listingId}/flags`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: strReason, details: strDetails }),
      });
      const objData = await objRes.json().catch(() => ({}));
      if (objRes.ok) {
        setBlnSubmitted(true);
        setStrMessage(objData.message || "Report submitted for review.");
      } else if (objRes.status == 401) {
        setStrMessage("Sign in before reporting a listing.");
      } else {
        setStrMessage(objData.detail || objData.message || "Could not submit the report.");
      }
    } catch {
      setStrMessage("Unable to connect to the server.");
    } finally {
      setBlnSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={openDialog}
        className="h-10 gap-2 rounded-full border border-red-700/25 bg-transparent px-4 text-sm font-semibold text-red-800 hover:bg-red-50/50">
        <AlertTriangle aria-hidden="true" />
        Report listing
      </Button>

      {blnOpen && createPortal(
        <div className="fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-[#1c2733]/45 px-4 py-4 backdrop-blur-sm sm:items-center" role="presentation" onMouseDown={(evt) => {
          if (evt.target == evt.currentTarget) setBlnOpen(false);
        }}>
          <div role="dialog" aria-modal="true" aria-labelledby="report-listing-title" onKeyDown={(evt) => {
            if (evt.key == "Escape") setBlnOpen(false);
          }} className="max-h-[calc(100vh-2rem)] w-full max-w-[520px] overflow-y-auto rounded-[22px] border border-white/70 bg-white p-6 text-[#1c2733] shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="report-listing-title" className="text-xl font-semibold">Report this listing</h2>
                <p className="mt-1 line-clamp-2 text-sm text-[#4a5866]">{listingTitle}</p>
              </div>
              <Button type="button" onClick={() => setBlnOpen(false)} aria-label="Close report dialog" className="h-9 w-9 rounded-full bg-transparent p-0 text-[#4a5866] hover:bg-slate-100">
                <X aria-hidden="true" />
              </Button>
            </div>

            {blnSubmitted ? (
              <div className="mt-6 flex flex-col gap-4">
                <p className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{strMessage}</p>
                <Button type="button" onClick={() => setBlnOpen(false)} className="h-11 rounded-full bg-[#3f5b6e] text-white hover:bg-[#34495a]">Done</Button>
              </div>
            ) : (
              <form onSubmit={submitReport} className="mt-6 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 text-sm font-semibold">
                  Reason
                  <select autoFocus value={strReason} onChange={(evt) => setStrReason(evt.target.value)} className="h-11 rounded-xl border border-[#1c2733]/20 bg-white px-3 text-sm font-normal outline-none focus:border-[#3f5b6e]">
                    <option value="">Select a reason</option>
                    {arrReasons.map(([strValue, strLabel]) => <option key={strValue} value={strValue}>{strLabel}</option>)}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5 text-sm font-semibold">
                  Details <span className="font-normal text-[#4a5866]">(optional)</span>
                  <textarea value={strDetails} onChange={(evt) => setStrDetails(evt.target.value)} maxLength={1000} rows={5} placeholder="Tell the moderation team what you noticed." className="resize-none rounded-xl border border-[#1c2733]/20 bg-white p-3 text-sm font-normal outline-none focus:border-[#3f5b6e]" />
                  <span className="text-right text-xs font-normal text-[#4a5866]">{strDetails.length}/1000</span>
                </label>

                {strMessage != "" && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{strMessage}</p>}

                <div className="flex justify-end gap-3">
                  <Button type="button" onClick={() => setBlnOpen(false)} className="h-11 rounded-full border border-[#1c2733]/20 bg-transparent px-5 text-[#1c2733] hover:bg-slate-50">Cancel</Button>
                  <Button type="submit" disabled={blnSubmitting} className="h-11 rounded-full bg-red-700 px-5 text-white hover:bg-red-800">{blnSubmitting ? "Submitting..." : "Submit report"}</Button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
