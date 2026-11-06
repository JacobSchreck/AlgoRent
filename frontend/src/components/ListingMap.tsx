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

type MySpot = {
  address: string;
  lat: number;
  lng: number;
};

// center of UF campus, used until we know where to look
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

// the dark pin for the spot they saved on their profile
function makeSpotPin() {
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<div style="background:#1c2733;color:#ffffff;display:inline-block;transform:translate(-50%,-50%);padding:5px 12px;border-radius:999px;font:700 13px 'Plus Jakarta Sans',sans-serif;white-space:nowrap;box-shadow:0 4px 12px rgba(28,39,51,0.25)">&#9679; Your spot</div>`,
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
  const [arrFetchedCenter, setArrFetchedCenter] = useState<[number, number]>(arrUf);
  const [objSpot, setObjSpot] = useState<MySpot | null>(null);
  const strCityKey = strCity?.trim().toLowerCase() ?? "";
  const arrKnownCenter = objCities[strCityKey];

  // get the spot they saved on their profile page
  useEffect(() => {
    const idTimer = window.setTimeout(() => {
      try {
        const strSaved = localStorage.getItem("algorentMySpot");
        if (strSaved != null) {
          setObjSpot(JSON.parse(strSaved));
        }
      } catch (objErr) {
        console.log("couldnt load your spot", objErr);
      }
    }, 0);

    return () => {
      window.clearTimeout(idTimer);
    };
  }, []);

  // find where the searched city is
  useEffect(() => {
    if (strCity == undefined || strCity.trim() == "") {
      return;
    }
    if (arrKnownCenter != undefined) {
      return;
    }

    // not one we know, so look it up
    async function findCity() {
      try {
        const objRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(strCityKey)}`);
        const arrData = await objRes.json();
        if (arrData.length > 0) {
          setArrFetchedCenter([Number(arrData[0].lat), Number(arrData[0].lon)]);
        }
      } catch (objErr) {
        console.log("couldnt find that city on the map", objErr);
      }
    }
    findCity();
  }, [arrKnownCenter, strCity, strCityKey]);

  // if listings have spots, center on the first one, otherwise the city
  let arrCenter = arrKnownCenter ?? arrFetchedCenter;
  if (arrPins.length > 0) {
    arrCenter = [arrPins[0].lat, arrPins[0].lng];
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

        {objSpot != null && <Marker position={[objSpot.lat, objSpot.lng]} icon={makeSpotPin()} zIndexOffset={1000} />}

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