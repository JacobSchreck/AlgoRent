import Link from "next/link";
import { Card } from "./ui/card";

type ListingCardProps = {
  id: number;
  title: string;
  price: number;
  dates: string;
  distance: string;
  thumbnailUrl?: string | null;
};

export default function ListingCard({
  id,
  title,
  price,
  dates,
  distance,
  thumbnailUrl,
}: ListingCardProps) {
  return (
    <Link href={`/listings/${id}`}>
      <Card className="gap-2.5 overflow-visible rounded-none bg-transparent py-0 text-base text-[#111418] shadow-none ring-0">
        <div className="relative h-44 overflow-hidden rounded-[18px] bg-[#d6e4e2]">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-[#5d6d6b]">
              No photo
            </div>
          )}

          <span className="absolute left-3 top-3 rounded-full bg-white/75 px-2.5 py-1 text-xs font-bold text-[#111418] backdrop-blur">
            {distance}
          </span>
        </div>

        <div className="flex justify-between gap-2">
          <p className="text-[15px] font-bold">{title}</p>
          <p className="whitespace-nowrap text-[15px] font-extrabold">
            ${price.toLocaleString()}/mo
          </p>
        </div>

        <p className="-mt-1.5 text-sm text-[#5b616c]">{dates}</p>
      </Card>
    </Link>
  );
}