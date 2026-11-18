"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type Props = {
  loading?: boolean;
  city?: string;
  moveIn?: string;
  moveOut?: string;
};

export default function SearchBar({ loading = false, city = "", moveIn = "", moveOut = "" }: Props) {
  const objRouter = useRouter();
  const [strCity, setStrCity] = useState(city);
  const [strMoveIn, setStrMoveIn] = useState(moveIn);
  const [strMoveOut, setStrMoveOut] = useState(moveOut);

  function handleSrch(evt: React.SyntheticEvent) {
    evt.preventDefault();

    const objParams = new URLSearchParams({ city: strCity });

    if (strMoveIn != "" && strMoveOut != "") {
      objParams.set("moveIn", strMoveIn);
      objParams.set("moveOut", strMoveOut);
    }

    objRouter.push(`/search?${objParams}`);
  }

  const strInStyle =
    "h-auto rounded-none border-none bg-transparent p-0 text-base text-[#1c2733] md:text-base placeholder:text-[#4a5866] focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2c4556]";
  const strLblStyle = "text-xs font-medium text-[#38444f]";

  return (
    <form
      onSubmit={handleSrch}
      className="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/55 p-4 text-[#1c2733] backdrop-blur-xl md:h-[72px] md:flex-row md:items-center md:gap-0 md:rounded-full md:py-2 md:pl-8 md:pr-2"
    >
      <div className="flex flex-1 flex-col gap-0.5">
        <Label htmlFor="where" className={strLblStyle}>
          Where
        </Label>
        <Input
          id="where"
          value={strCity}
          onChange={(evt) => setStrCity(evt.target.value)}
          placeholder="City"
          className={strInStyle}
          required
        />
      </div>

      <div className="hidden h-9 w-px bg-[#1c2733]/12 md:mx-6 md:block" />

      <div className="flex flex-col gap-0.5 md:w-40">
        <Label htmlFor="movein" className={strLblStyle}>
          Move in
        </Label>
        <Input
          id="movein"
          type="date"
          value={strMoveIn}
          onChange={(evt) => setStrMoveIn(evt.target.value)}
          className={strInStyle}
        />
      </div>

      <div className="hidden h-9 w-px bg-[#1c2733]/12 md:mx-6 md:block" />

      <div className="flex flex-col gap-0.5 md:w-40">
        <Label htmlFor="moveout" className={strLblStyle}>
          Move out
        </Label>
        <Input
          id="moveout"
          type="date"
          value={strMoveOut}
          onChange={(evt) => setStrMoveOut(evt.target.value)}
          className={strInStyle}
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="h-14 rounded-full bg-[#3f5b6e] px-8 text-base font-semibold text-white hover:bg-[#34495a] md:ml-6"
      >
        {loading ? "Searching..." : "Search"}
      </Button>
    </form>
  );
}