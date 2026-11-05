"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import AuthAccountLinks from "@/components/AuthAccountLinks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { strApiUrl } from "@/lib/listings";

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

type CurrentUser = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
};

type MySpot = {
  address: string;
  lat: number;
  lng: number;
};

// the map reads the spot from here too
const strSpotKey = "algorentMySpot";

export default function ProfilePage() {
  const objRouter = useRouter();
  const [objUser, setObjUser] = useState<CurrentUser | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strAddress, setStrAddress] = useState("");
  const [objSpot, setObjSpot] = useState<MySpot | null>(null);
  const [strSpotMsg, setStrSpotMsg] = useState("");
  const [blnFinding, setBlnFinding] = useState(false);

  // get who is signed in and the spot they saved before
  useEffect(() => {
    async function loadProfile() {
      try {
        const objRes = await fetch(`${strApiUrl}/api/auth/me`, { credentials: "include" });
        if (objRes.ok == true) {
          setObjUser(await objRes.json());
        }
      } catch (objErr) {
        console.log("couldnt load profile", objErr);
      } finally {
        setBlnLoading(false);
      }
    }
    loadProfile();

    try {
      const strSaved = localStorage.getItem(strSpotKey);
      if (strSaved != null) {
        const objSaved: MySpot = JSON.parse(strSaved);
        setObjSpot(objSaved);
        setStrAddress(objSaved.address);
      }
    } catch (objErr) {
      console.log("couldnt load your spot", objErr);
    }
  }, []);

  // look up the address they typed and save where it is
  async function saveSpot(evt: FormEvent) {
    evt.preventDefault();
    const strTyped = strAddress.trim();
    if (strTyped == "") {
      setStrSpotMsg("Type an address first.");
      return;
    }

    setBlnFinding(true);
    setStrSpotMsg("");
    try {
      const objRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(strTyped)}`);
      const arrData = await objRes.json();
      if (arrData.length == 0) {
        setStrSpotMsg("We couldn't find that address. Try adding the city and state.");
      } else {
        const objNew: MySpot = { address: strTyped, lat: Number(arrData[0].lat), lng: Number(arrData[0].lon) };
        localStorage.setItem(strSpotKey, JSON.stringify(objNew));
        setObjSpot(objNew);
        setStrSpotMsg("Saved. Your spot will show on the map.");
      }
    } catch (objErr) {
      console.log("couldnt look up that address", objErr);
      setStrSpotMsg("Couldn't look up that address right now. Try again.");
    } finally {
      setBlnFinding(false);
    }
  }

  function removeSpot() {
    try {
      localStorage.removeItem(strSpotKey);
    } catch (objErr) {
      console.log("couldnt remove your spot", objErr);
    }
    setObjSpot(null);
    setStrAddress("");
    setStrSpotMsg("");
  }

  async function signOut() {
    try {
      await fetch(`${strApiUrl}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch (objErr) {
      console.log("couldnt sign out", objErr);
    }
    objRouter.push("/");
    objRouter.refresh();
  }

  let strName = "";
  let strInitials = "";
  if (objUser != null) {
    strName = `${objUser.firstName ?? ""} ${objUser.lastName ?? ""}`.trim();
    if (strName == "") {
      strName = objUser.email;
    }
    if (objUser.firstName != null && objUser.firstName != "") {
      strInitials = objUser.firstName.charAt(0);
      if (objUser.lastName != null && objUser.lastName != "") {
        strInitials = strInitials + objUser.lastName.charAt(0);
      }
    } else {
      strInitials = objUser.email.charAt(0);
    }
    strInitials = strInitials.toUpperCase();
  }

  let strShowMsg = strSpotMsg;
  if (strShowMsg == "" && objSpot != null) {
    strShowMsg = "Your spot is saved.";
  }

  return (
    <div className={`${objFont.className} bg-drift min-h-screen text-[#1c2733]`}>
      <style>{strPageCss}</style>

      <nav className="sticky top-0 z-[1100] border-b border-white/35 bg-white/25 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-[1232px] items-center justify-between px-8">
          <Link href="/" className="text-[18px] font-bold tracking-tight">AlgoRent</Link>
          <div className="flex items-center gap-6 text-[14px] font-medium">
            <Link href="/search">Search</Link>
            <Link href="/saved">Saved</Link>
            <AuthAccountLinks />
          </div>
        </div>
      </nav>

      <div className="mx-auto flex max-w-[1232px] justify-center px-8 py-14">
        {blnLoading == true && <p className="text-[#4a5866]">Loading...</p>}

        {blnLoading == false && objUser == null && (
          <Card className="fade-in w-full max-w-[520px] rounded-[22px] border border-white/60 bg-white/45 p-8 text-center shadow-none backdrop-blur-lg">
            <h1 className="text-[24px] font-bold">You&apos;re not signed in</h1>
            <p className="mt-2 text-[15px] text-[#4a5866]">Sign in to see your profile.</p>
            <Button type="button" onClick={() => objRouter.push("/login")} className="mx-auto mt-6 h-11 rounded-full bg-[#3f5b6e] px-6 text-[14px] font-bold text-white hover:bg-[#34495a]">
              Sign in
            </Button>
          </Card>
        )}

        {blnLoading == false && objUser != null && (
          <Card className="fade-in w-full max-w-[520px] rounded-[22px] border border-white/60 bg-white/45 p-8 shadow-none backdrop-blur-lg">

            {/* name and email */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3f5b6e] text-[22px] font-bold text-white">{strInitials}</div>
              <div>
                <h1 className="text-[24px] font-bold leading-tight">{strName}</h1>
                <p className="text-[14px] text-[#4a5866]">{objUser.email}</p>
              </div>
            </div>

            <div className="my-6 h-px bg-white/80" />

            {/* your spot */}
            <form onSubmit={saveSpot}>
              <Label htmlFor="spot" className="text-[16px] font-bold text-[#1c2733]">Your spot</Label>
              <p className="mb-3 mt-1 text-[13px] text-[#4a5866]">Where you&apos;ll work or study. It shows up as a pin on the map.</p>
              <div className="flex flex-wrap gap-2">
                <Input id="spot" value={strAddress} onChange={(evt) => setStrAddress(evt.target.value)} placeholder="1600 SW Archer Rd, Gainesville, FL" className="h-11 min-w-[200px] flex-1 rounded-full border-white/90 bg-white/80 px-4 text-[14px]" />
                <Button type="submit" disabled={blnFinding} className="h-11 rounded-full bg-[#3f5b6e] px-6 text-[14px] font-bold text-white hover:bg-[#34495a]">
                  {blnFinding == true ? "Finding..." : "Save"}
                </Button>
              </div>
              {strShowMsg != "" && (
                <p className="mt-3 text-[13px] font-medium text-[#3f5b6e]">
                  {strShowMsg}
                  {objSpot != null && (
                    <button type="button" onClick={removeSpot} className="ml-2 cursor-pointer underline">Remove</button>
                  )}
                </p>
              )}
            </form>

            <div className="my-6 h-px bg-white/80" />

            {/* buttons */}
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => objRouter.push("/search")} className="h-11 rounded-full bg-[#3f5b6e] px-6 text-[14px] font-bold text-white hover:bg-[#34495a]">
                Find places
              </Button>
              <Button type="button" onClick={() => objRouter.push("/saved")} className="h-11 rounded-full border border-white/80 bg-white/60 px-6 text-[14px] font-bold text-[#1c2733] hover:bg-white/80">
                View saved
              </Button>
              <Button type="button" onClick={signOut} className="h-11 rounded-full bg-transparent px-4 text-[14px] font-semibold text-[#3f5b6e] hover:bg-transparent hover:underline">
                Sign out
              </Button>
            </div>

          </Card>
        )}
      </div>
    </div>
  );
}
