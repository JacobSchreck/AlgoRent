"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
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
  strCity?: string;
};

// center of UF campus
const arrUf: [number, number] = [29.6436, -82.3549];

// cities we already know so the map can jump there right away
const objCities: { [strName: string]: [number, number] } = {
  gainesville: [29.6516, -82.3248],
  orlando: [28.5384, -81.3789],
  tampa: [27.9506, -82.4572],
  miami: [25.7617, -80.1918],
  jacksonville: [30.3322, -81.6557],
  tallahassee: [30.4383, -84.2807],
  "st. petersburg": [27.7676, -82.6403],
  "fort lauderdale": [26.1224, -80.1373],
  atlanta: [33.749, -84.388],
};

// makes the little rounded price bubble
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

// moves the map when the center changes
function MoveMap({ numLat, numLng }: { numLat: number; numLng: number }) {
  const objMap = useMap();
  useEffect(() => {
    objMap.setView([numLat, numLng], objMap.getZoom());
  }, [objMap, numLat, numLng]);
  return null;
}

export default function ListingMap({ arrPins, arrPicked, strCity }: Props) {
  const objRouter = useRouter();
  const [arrCityCenter, setArrCityCenter] = useState<[number, number]>(arrUf);

  // find where the searched city is
  useEffect(() => {
    if (strCity == undefined || strCity.trim() == "") {
      return;
    }
    const strKey = strCity.trim().toLowerCase();
    if (objCities[strKey] != undefined) {
      setArrCityCenter(objCities[strKey]);
      return;
    }

    // not one we know, so look it up
    async function findCity() {
      try {
        const objRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(strKey)}`);
        const arrData = await objRes.json();
        if (arrData.length > 0) {
          setArrCityCenter([Number(arrData[0].lat), Number(arrData[0].lon)]);
        }
      } catch (objErr) {
        console.log("couldnt find that city on the map", objErr);
      }
    }
    findCity();
  }, [strCity]);

  // if listings have spots, center on the first one, otherwise the city
  let arrCenter = arrCityCenter;
  if (arrPins.length > 0) {
    arrCenter = [arrPins[0].lat, arrPins[0].lng];
  }

  let blnShowUf = false;
  if (strCity == undefined || strCity.trim().toLowerCase() == "gainesville") {
    blnShowUf = true;
  }

  return (
    <>
      {/* makes the map softer so it matches the blue design */}
      <style>{`.soft-map { filter: grayscale(0.7) brightness(1.05) contrast(0.9); }`}</style>

      <MapContainer center={arrCenter} zoom={13} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          className="soft-map"
        />

        <MoveMap numLat={arrCenter[0]} numLng={arrCenter[1]} />

        {blnShowUf == true && <Marker position={arrUf} icon={makePin("UF", true)} />}

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