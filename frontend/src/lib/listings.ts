export const strApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export type ListingSummary = {
  id: number;
  title: string;
  address: string | null;
  city: string;
  state: string | null;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  monthlyRent: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string | null;
  listingType: string | null;
  furnished: boolean | null;
  utilitiesIncluded: boolean | null;
  availableFrom: string | null;
  availableUntil: string | null;
  sourceUrl: string;
  sourceName: string | null;
  thumbnailUrl: string | null;
  distanceMiles: number | null;
};

// one listing from GET /api/listings/{id}
export type ListingDetail = Omit<ListingSummary, "thumbnailUrl" | "distanceMiles"> & {
  description: string | null;
  securityDeposit: number | null;
  squareFeet: number | null;
  parkingAvailable: boolean | null;
  laundryAvailable: boolean | null;
  petsAllowed: boolean | null;
  contactName: string | null;
  status: string | null;
  imageUrls: string[];
};

// "2026-08-15" -> "Aug 15, 2026"
export function showDate(strDate: string | null) {
  if (strDate == null) {
    return "";
  }
  const objDate = new Date(strDate + "T00:00:00");
  return objDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function showDates(strFrom: string | null, strUntil: string | null) {
  if (strFrom == null && strUntil == null) {
    return "Flexible dates";
  } else if (strFrom == null) {
    return `Until ${showDate(strUntil)}`;
  } else if (strUntil == null) {
    return `From ${showDate(strFrom)}`;
  }
  return `${showDate(strFrom)} – ${showDate(strUntil)}`;
}

export function showMoney(numAmount: number | null) {
  if (numAmount == null) {
    return "Not listed";
  }
  return `$${Number(numAmount).toLocaleString()}`;
}

export function showYesNo(blnValue: boolean | null) {
  if (blnValue == null) {
    return "Not listed";
  } else if (blnValue == true) {
    return "Yes";
  }
  return "No";
}

// "entire_unit" -> "Entire place"
export function showType(strType: string | null) {
  if (strType == "entire_unit") {
    return "Entire place";
  } else if (strType == "private_room") {
    return "Private room";
  } else if (strType == "shared_room") {
    return "Shared room";
  } else if (strType == null) {
    return "Not listed";
  }
  return "Other";
}

// 4 beds 4 baths -> "4 bed · 4 bath", 0 beds -> "Studio"
export function showRooms(numBeds: number | null, numBaths: number | null) {
  let strRooms = "";
  if (numBeds == 0) {
    strRooms = "Studio";
  } else if (numBeds != null) {
    strRooms = `${Number(numBeds)} bed`;
  }
  if (numBaths != null) {
    if (strRooms != "") {
      strRooms = strRooms + " · ";
    }
    strRooms = strRooms + `${Number(numBaths)} bath`;
  }
  if (strRooms == "") {
    return "Not listed";
  }
  return strRooms;
}

export function showPlace(strCity: string, strState: string | null) {
  if (strState == null) {
    return strCity;
  }
  return `${strCity}, ${strState}`;
}