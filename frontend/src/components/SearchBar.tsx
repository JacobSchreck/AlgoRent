"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type Props = {
  onSearch?: (city: string, moveIn: string, moveOut: string) => void;
  loading?: boolean;
};

export default function SearchBar({ onSearch, loading = false }: Props) {
  const objRouter = useRouter();
  const [strCity, setStrCity] = useState("");
  const [strMoveIn, setStrMoveIn] = useState("");
  const [strMoveOut, setStrMoveOut] = useState("");

  function handleSrch(evt: React.SyntheticEvent) {
    evt.preventDefault();
    // if the page gave us onSearch use that, otherwise go to the search page
    if (onSearch != undefined) {
      onSearch(strCity, strMoveIn, strMoveOut);
    } else {
      objRouter.push(`/search?city=${strCity}&start=${strMoveIn}&end=${strMoveOut}`);
    }
  }

  const strInStyle = "h-auto rounded-none border-none bg-transparent p-0 text-base text-[#1c2733] md:text-base placeholder:text-[#6b7885] focus-visible:ring-0";
  const strLblStyle = "text-xs font-medium text-[#4a5866]";

  return (
    <form onSubmit={handleSrch} className="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/55 p-4 text-[#1c2733] backdrop-blur-xl md:h-[72px] md:flex-row md:items-center md:gap-0 md:rounded-full md:py-2 md:pl-8 md:pr-2">

      <div className="flex flex-1 flex-col gap-0.5">
        <Label htmlFor="where" className={strLblStyle}>Where</Label>
        <Input id="where" value={strCity} onChange={(evt) => setStrCity(evt.target.value)} placeholder="City or campus" className={strInStyle} required />
      </div>
      <div className="hidden h-9 w-px bg-[#1c2733]/12 md:mx-6 md:block"></div>

      <div className="flex flex-col gap-0.5 md:w-40">
        <Label htmlFor="movein" className={strLblStyle}>Move in</Label>
        <Input id="movein" type="date" value={strMoveIn} onChange={(evt) => setStrMoveIn(evt.target.value)} className={strInStyle} />
      </div>

      <div className="hidden h-9 w-px bg-[#1c2733]/12 md:mx-6 md:block"></div>
      {/* move out */}
      <div className="flex flex-col gap-0.5 md:w-40">
        <Label htmlFor="moveout" className={strLblStyle}>Move out</Label>
        <Input id="moveout" type="date" value={strMoveOut} onChange={(evt) => setStrMoveOut(evt.target.value)} className={strInStyle} />
      </div>

      <Button type="submit" disabled={loading} className="h-14 rounded-full bg-[#3f5b6e] px-8 text-base font-semibold text-white hover:bg-[#34495a] md:ml-6">
        {loading == true ? "Searching..." : "Search"}
      </Button>
    </form>
  );
}