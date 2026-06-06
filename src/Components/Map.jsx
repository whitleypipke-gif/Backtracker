import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const MapComponent = ({ lat, lng,   defaultPosition = [51.5030, 0.0032] }) => {
  const position =
    typeof lat === "number" && typeof lng === "number"
      ? [lat, lng]
      : defaultPosition;
  return (
    <div className="h-[400px] w-full rounded-xl">
      <MapContainer
        center={position}
        zoom={13}
        style={{ height: "100%", width: "100%", borderRadius: "20px", border: "1.6px solid #ccc" }}
      >
        {/* OpenStreetMap Tile Layer */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Marker */}
        <Marker position={position}></Marker>
      </MapContainer>
    </div>
  );
};

export default MapComponent;
