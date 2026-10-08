export type Listing = {
  id: number;
  title: string;
  price: number;
  dates: string;
  distance: string;
  miles: number;
  city: string;
  type: string;
  tags: string[];
  about: string;
  host: string;
  mapX: number;
  mapY: number;
};

// sample data for now, will come from the backend later
export const arrListings: Listing[] = [
  {
    id: 1, title: "Private room near campus", price: 725, dates: "May 1 – Aug 15", distance: "0.4 mi to UF", miles: 0.4,
    city: "Gainesville, FL", type: "Private room", tags: ["Private room", "Furnished", "Shared kitchen"],
    about: "Bedroom in a 3BR apartment a short walk from campus. Kitchen and living room are shared with two other students.",
    host: "Sample host", mapX: 30, mapY: 30,
  },
  {
    id: 2, title: "Studio off Archer Rd", price: 1050, dates: "May 10 – Aug 10", distance: "1.8 mi to UF", miles: 1.8,
    city: "Gainesville, FL", type: "Entire place", tags: ["Entire studio", "Furnished", "Utilities included"],
    about: "Whole studio to yourself with a kitchenette and in-unit laundry. On the bus route to campus.",
    host: "Sample host", mapX: 12, mapY: 66,
  },
  {
    id: 3, title: "Room in 4BR townhouse", price: 640, dates: "Apr 28 – Aug 20", distance: "2.3 mi to UF", miles: 2.3,
    city: "Gainesville, FL", type: "Private room", tags: ["Private room", "Parking", "Washer and dryer"],
    about: "Room in a townhouse with three other students. Free parking spot included.",
    host: "Sample host", mapX: 66, mapY: 74,
  },
  {
    id: 4, title: "1BR apartment downtown", price: 1200, dates: "May 5 – Aug 31", distance: "1.1 mi to UF", miles: 1.1,
    city: "Gainesville, FL", type: "Entire place", tags: ["Entire apartment", "Furnished", "Gym"],
    about: "One bedroom apartment downtown, close to restaurants and the bus line.",
    host: "Sample host", mapX: 70, mapY: 20,
  },
];