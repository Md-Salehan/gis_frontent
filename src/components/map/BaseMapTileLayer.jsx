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
  stadia_alidade_satellite: {
    url: "https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.jpg",
    attribution:
      '&copy; CNES, Distribution Airbus DS, © Airbus DS, © PlanetObserver (Contains Copernicus Data) | &copy; <a href="https://www.stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 20,
  },
  stadia_alidade_dark: {
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
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
