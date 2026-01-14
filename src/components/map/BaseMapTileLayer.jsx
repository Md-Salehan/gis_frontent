import React from "react";
import { TileLayer } from "react-leaflet";
import { useSelector } from "react-redux";

/**
 * Maps a basemap key -> TileLayer props
 */
const BASEMAPS = {
  openstreetmap: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
  google_satellite: {
    url: "http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    maxZoom: 20,
  },
  esri_satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 20,
  },
  carto: {
    url: "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
    attribution: "&copy; CARTO &copy; OpenStreetMap contributors",
    maxZoom: 20,
  },
  open_topo_map: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenTopoMap contributors",
    maxZoom: 17,
  },
  carto_dark: {
    url: "https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png",
    attribution: "&copy; CARTO &copy; OpenStreetMap contributors",
    maxZoom: 20,
  },
};

export default function BaseMapTileLayer(props) {
  // read the selected basemap from redux
  const active = useSelector((s) => s.map?.activeBasemap) || "openstreetmap";
  // support older alias 'streets' if still present in state
  const key = active === "streets" ? "openstreetmap" : active;
  const cfg = {
    ...(BASEMAPS[key] || BASEMAPS.openstreetmap),
    // detectRetina: true,
    // tileSize: 512, // Force larger tile size
    // zoomOffset: -1, // Compensate for larger tiles
  };

  // Pass common performance props (can be overridden by props)
  return (
    <TileLayer
      key={key}
      {...cfg}
      updateWhenIdle={false}
      updateWhenZooming={false}
      {...props}
    />
  );
}
