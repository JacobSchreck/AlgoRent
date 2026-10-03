"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type Props = {
    onSearch: (city: string, moveIn: string, moveOut: string) => void;
    loading?: boolean;
};

export default function SearchBar({
  onSearch,
  loading = false,
}: Props) {
  const [city, setCity] = useState("");
  const [moveIn, setMoveIn] = useState("");
  const [moveOut, setMoveOut] = useState("");

  function handleSearch(e: React.SyntheticEvent) {
    e.preventDefault();
    onSearch(city, moveIn, moveOut);
  }

  const inputStyle =
    "h-auto rounded-none border-none bg-transparent p-0 text-base text-white md:text-base placeholder:text-white/85 focus-visible:ring-0 [color-scheme:dark]";

  return (
    <form
      onSubmit={handleSearch}
      className="flex flex-col gap-4 rounded-[22px] border border-white/45 bg-white/20 p-4 text-white backdrop-blur-xl md:h-[88px] md:flex-row md:items-center md:gap-0 md:py-3 md:pl-8 md:pr-3"
    >
      <div className="flex flex-1 flex-col gap-1">
        <Label htmlFor="where" className="text-[13px] font-bold">
          Where
        </Label>

        <Input
          id="where"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City, campus, or company"
          className={inputStyle}
          required
        />
      </div>

      <div className="hidden h-10 w-px bg-white/45 md:mx-6 md:block" />

      <div className="flex flex-col gap-1 md:w-44">
        <Label htmlFor="movein" className="text-[13px] font-bold">
          Move in
        </Label>

        <Input
          id="movein"
          type="date"
          value={moveIn}
          onChange={(e) => setMoveIn(e.target.value)}
          className={inputStyle}
        />
      </div>

      <div className="hidden h-10 w-px bg-white/45 md:mx-6 md:block" />

      <div className="flex flex-col gap-1 md:w-44">
        <Label htmlFor="moveout" className="text-[13px] font-bold">
          Move out
        </Label>

        <Input
          id="moveout"
          type="date"
          value={moveOut}
          onChange={(e) => setMoveOut(e.target.value)}
          className={inputStyle}
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="h-16 gap-2.5 rounded-2xl bg-[#5eead4] px-8 text-base font-extrabold text-[#06302e] hover:bg-[#8ff3e3] md:ml-6"
      >
        {!loading && (
          <svg
            className="size-[18px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        )}

        {loading ? "Searching..." : "Search"}
      </Button>
    </form>
  );
}