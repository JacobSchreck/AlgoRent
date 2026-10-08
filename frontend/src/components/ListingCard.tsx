import Link from "next/link";
import { Card } from "./ui/card";

type ListingCardProps = {
  id: number;
  title: string;
  price: number;
  dates: string;
  distance: string;
};

export default function ListingCard({ id, title, price, dates, distance }: ListingCardProps) {
  const strPrice = price.toLocaleString();

  return (
    <Link href={`/listings/${id}`} className="reveal">
      <Card className="gap-2.5 overflow-visible rounded-none bg-transparent py-0 text-base text-[#1c2733] shadow-none ring-0">
        <div className="relative flex h-44 items-center justify-center rounded-[18px] border border-white/60 bg-white/50 text-xs text-[#4a5866] backdrop-blur-md">
          Listing photo
          <span className="absolute left-3 top-3 rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-[#1c2733] backdrop-blur">{distance}</span>
        </div>
        <div className="flex justify-between gap-2">
          <p className="text-[15px] font-bold">{title}</p>
          <p className="whitespace-nowrap text-[15px] font-extrabold">${strPrice}/mo</p>
        </div>
        <p className="-mt-1.5 text-sm text-[#4a5866]">{dates}</p>
      </Card>
    </Link>
  );
}