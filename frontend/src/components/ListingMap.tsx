"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { useRouter } from "next/navigation";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MapPin = {
  id: number;
  price: number;
  lat: number;
  lng: number;
};

type Props = {
  arrPins: MapPin[];
  arrPicked: number[];
};
const arrUf: [number, number] = [29.6436, -82.3549];

function makePin(strText: string, blnDark: boolean) {
  let strColors = "background:#ffffff;color:#1c2733;";
  if (blnDark == true) {
    strColors = "background:#3f5b6e;color:#ffffff;";
  }
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<div style="${strColors}display:inline-block;transform:translate(-50%,-50%);padding:4px 10px;border-radius:999px;font:600 13px 'Plus Jakarta Sans',sans-serif;white-space:nowrap;box-shadow:0 4px 12px rgba(28,39,51,0.18)">${strText}</div>`,
  });
}

export default function ListingMap({ arrPins, arrPicked }: Props) {
  const objRouter = useRouter();

  return (
    <>

      <style>{`.soft-map { filter: grayscale(0.7) brightness(1.05) contrast(0.9); }`}</style>

      <MapContainer center={arrUf} zoom={13} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          className="soft-map"
        />

        <Marker position={arrUf} icon={makePin("UF", true)} />

        {arrPins.map((objPin) => (
          <Marker
            key={objPin.id}
            position={[objPin.lat, objPin.lng]}
            icon={makePin(`$${objPin.price.toLocaleString()}`, arrPicked.includes(objPin.id))}
            eventHandlers={{ click: () => objRouter.push(`/listings/${objPin.id}`) }}
          />
        ))}
      </MapContainer>
    </>
  );
}