import Link from "next/link";
import { Card } from "./ui/card";

type ListingCardProps = {
  id: number;
  title: string;
  price: number | null;
  dates: string;
  distance: string;
  thumbnailUrl?: string | null;
};

export default function ListingCard({ id, title, price, dates, distance, thumbnailUrl }: ListingCardProps) {
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