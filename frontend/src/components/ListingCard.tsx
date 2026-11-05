import Link from "next/link";
import { Card } from "./ui/card";

type ListingCardProps = {
  id: number;
  title: string;
  price: number | null;
  dates: string;
  distance: string;
  thumbnailUrl?: string | null;
  sourceName: string | null;
  sourceType: string;
};

export default function ListingCard({ id, title, price, dates, distance, thumbnailUrl, sourceName, sourceType }: ListingCardProps) {
  if (sourceType == "LINK_ONLY") {
    return (
      <Link href={`/listings/${id}`} className="reveal">
        <Card className="gap-2.5 overflow-visible rounded-none bg-transparent py-0 text-base text-[#1c2733] shadow-none ring-0">
          <div className="relative flex h-44 flex-col items-center justify-center gap-2 overflow-hidden rounded-[18px] border border-white/60 bg-gradient-to-br from-[#dfe7f0] to-[#c9d6e4] text-[#3f5b6e]">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 11l9-7 9 7" />
              <path d="M5 10v10h14V10" />
              <path d="M10 20v-5h4v5" />
            </svg>
            <span className="text-xs font-semibold">Photo on {sourceName || "the original site"}</span>
          </div>
          <p className="line-clamp-2 text-[15px] font-bold">{title}</p>
          <p className="-mt-1.5 text-sm text-[#4a5866]">Listed on {sourceName || "an external source"}</p>
          <p className="-mt-1 text-sm font-semibold text-[#3f5b6e]">View listing →</p>
        </Card>
      </Link>
    );
  }

  let strPrice = "Price not listed";
  if (price != null && price > 0) {
    strPrice = `$${price.toLocaleString()}/mo`;
  }

  return (
    <Link href={`/listings/${id}`} className="reveal">
      <Card className="gap-2.5 overflow-visible rounded-none bg-transparent py-0 text-base text-[#1c2733] shadow-none ring-0">
        <div className="relative h-44 overflow-hidden rounded-[18px] border border-white/60 bg-white/50 backdrop-blur-md">
          {thumbnailUrl != null && thumbnailUrl != "" ? (
            <img src={thumbnailUrl} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-[#4a5866]">No photo</div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-[#1c2733] backdrop-blur">{distance}</span>
        </div>
        <div className="flex justify-between gap-2">
          <p className="line-clamp-2 text-[15px] font-bold">{title}</p>
          <p className="whitespace-nowrap text-[15px] font-extrabold">{strPrice}</p>
        </div>
        <p className="-mt-1.5 text-sm text-[#4a5866]">{dates}</p>
      </Card>
    </Link>
  );
}