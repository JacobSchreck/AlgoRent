"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import SearchBar from "@/components/SearchBar";
import ListingCard from "@/components/ListingCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const objFont = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700", "800"] });

const strApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type User = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

const arrListings = [
  { id: 1, title: "Private room near campus", price: 725, dates: "May 1 – Aug 15", distance: "0.4 mi to UF" },
  { id: 2, title: "Studio off Archer Rd", price: 1050, dates: "May 10 – Aug 10", distance: "1.8 mi to UF" },
  { id: 3, title: "Room in 4BR townhouse", price: 640, dates: "Apr 28 – Aug 20", distance: "2.3 mi to UF" },
  { id: 4, title: "1BR apartment downtown", price: 1200, dates: "May 5 – Aug 31", distance: "1.1 mi to UF" },
];

const strCardStyle = "reveal flex-row items-start gap-3 rounded-none border-none bg-transparent p-0 text-base text-[#1c2733] shadow-none ring-0";
const strIconStyle = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/60 text-[#3f5b6e]";

// gradient + fade animations for this page
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
  .fade-in { animation: rise 1.1s ease-out both; }
  .delay-1 { animation-delay: 0.15s; }
  .delay-2 { animation-delay: 0.3s; }
  .reveal {
    animation: rise linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 30%;
  }
  @keyframes rise {
    from { opacity: 0; transform: translateY(28px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export default function Home() {
  const [objUser, setObjUser] = useState<User | null>(null);
  const [blnChecked, setBlnChecked] = useState(false);

  useEffect(() => {
    async function checkUsr() {
      try {
        const objRes = await fetch(`${strApiUrl}/api/auth/me`, { credentials: "include" });
        if (objRes.ok == true) {
          const objData = await objRes.json();
          setObjUser(objData);
        }
      } catch (objErr) {
        console.log("couldnt reach backend", objErr);
      } finally {
        setBlnChecked(true);
      }
    }
    checkUsr();
  }, []);

  async function handleLogOut() {
    try {
      await fetch(`${strApiUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (objErr) {
      console.log("couldnt reach backend", objErr);
    }
    setObjUser(null);
  }

  return (
    <div className={`${objFont.className} bg-drift min-h-screen pb-20 text-[#1c2733]`}>
      <style>{strPageCss}</style>

      <nav className="sticky top-0 z-10 border-b border-white/35 bg-white/25 backdrop-blur-lg">
        {/* same width as the page so the logo lines up with the content */}
        <div className="mx-auto flex h-16 max-w-[1232px] items-center justify-between px-8">
          <Link href="/" className="text-[18px] font-bold tracking-tight">AlgoRent</Link>

          <div className="flex items-center gap-6 text-[14px] font-medium">
            <Link href="/search">Search</Link>
            <Link href="/saved">Saved</Link>
            <Link href="/messages">Messages</Link>

            {blnChecked == true && (
              objUser != null ? (
                <>
                  <span>{objUser.firstName || objUser.email}</span>
                  <Button type="button" onClick={handleLogOut} className="h-auto bg-transparent p-0 text-[14px] font-medium text-[#1c2733] hover:bg-transparent">
                    Sign out
                  </Button>
                </>
              ) : (
                <Link href="/login">Sign in</Link>
              )
            )}
          </div>
        </div>
      </nav>

      <section className="mx-auto flex max-w-[1232px] flex-col gap-5 px-8 pb-16 pt-28">
        <p className="fade-in text-[13px] font-medium uppercase tracking-[2px] text-[#3f5b6e]">Summer sublets</p>
        <h1 className="fade-in delay-1 text-[60px] font-semibold leading-[1.08] tracking-[-1.5px] text-[#24313d]">
          Find a place to stay for<br />your summer internship.
        </h1>
        <p className="fade-in delay-1 max-w-[480px] text-[18px] leading-relaxed text-[#4a5866]">
        </p>

        {/* full width so it lines up with the row below */}
        <div className="fade-in delay-2 mt-6 w-full"><SearchBar /></div>
      </section>

      {/* feature row */}
      <section className="mx-auto grid max-w-[1232px] gap-8 px-8 md:grid-cols-3">
        <Card className={strCardStyle}>
          <span className={strIconStyle}>✓</span>
          <div>
            <p className="text-[15px] font-semibold">Matches your dates</p>
            <p className="text-sm text-[#4a5866]">Only places open when you are</p>
          </div>
        </Card>

        <Card className={strCardStyle}>
          <span className={strIconStyle}>◎</span>
          <div>
            <p className="text-[15px] font-semibold">Pinned to your office</p>
            <p className="text-sm text-[#4a5866]">See distance on a map</p>
          </div>
        </Card>
        <Card className={strCardStyle}>
          <span className={strIconStyle}>⇄</span>
          <div>
            <p className="text-[15px] font-semibold">Compare side by side</p>
            <p className="text-sm text-[#4a5866]">Line up your favorites</p>
          </div>
        </Card>
      </section>

      <section className="mx-auto mt-20 max-w-[1232px] px-8">
        <div className="reveal mb-5 flex items-baseline justify-between">
          <h2 className="text-[28px] font-semibold tracking-tight">Available near UF this summer</h2>
          <Link href="/search" className="text-[15px] font-semibold text-[#3f5b6e]">See all listings</Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {arrListings.map((objList) => (
            <ListingCard key={objList.id} id={objList.id} title={objList.title} price={objList.price} dates={objList.dates} distance={objList.distance} />
          ))}
        </div>
      </section>

    </div>
  );
}