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
  return (
    <Link href={`/listings/${id}`}>
      <Card className="gap-2.5 overflow-visible rounded-none bg-transparent py-0 text-base text-[#111418] shadow-none ring-0">
        <div className="relative flex h-44 items-center justify-center rounded-[18px] bg-[#d6e4e2] text-xs text-[#5d6d6b]">
          Listing photo
          <span className="absolute left-3 top-3 rounded-full bg-white/75 px-2.5 py-1 text-xs font-bold text-[#111418] backdrop-blur">
            {distance}
          </span>
        </div>

        <div className="flex justify-between gap-2">
          <p className="text-[15px] font-bold">{title}</p>
          <p className="whitespace-nowrap text-[15px] font-extrabold">${price.toLocaleString()}/mo</p>
        </div>

        <p className="-mt-1.5 text-sm text-[#5b616c]">{dates}</p>
      </Card>
    </Link>
  );
}