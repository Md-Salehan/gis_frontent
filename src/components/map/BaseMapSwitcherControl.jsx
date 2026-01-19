import { useDispatch, useSelector } from "react-redux";
import { Button, Tooltip } from "antd";
import { setActiveBasemap } from "../../store/slices/mapSlice";
import BaseMapTileLayer from "./BaseMapTileLayer";

/**
 * Small clickable control that shows several basemap buttons.
 * - Updates redux with the chosen basemap
 * - Renders the selected TileLayer (so MapContainer shows it)
 *
 * Usage: put <BaseMapSwitcherControl/> inside your MapContainer
 */
const OPTIONS = [
  { key: "openstreetmap", label: "OSM", title: "OpenStreetMap" },
  { key: "google_satellite", label: "Google", title: "Google Satellite" },
  { key: "esri_satellite", label: "ESRI Satellite", title: "ESRI Satellite" },
  { key: "carto", label: "Carto", title: "Carto Voyager" },
  { key: "open_topo_map", label: "Topo", title: "Open Topo Map" },
  { key: "carto_dark", label: "Dark", title: "Carto Dark" },
];

export default function BaseMapSwitcherControl() {
  const dispatch = useDispatch();
  const active = useSelector((s) => s.map?.activeBasemap) || "openstreetmap";

  return (
    <>
      {/* ensure the selected TileLayer is drawn */}
      <BaseMapTileLayer />

      {/* floating control buttons (top-right) */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 1200,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: 6,
          borderRadius: 6,
          background: "rgba(255,255,255,0.9)",
          boxShadow: "0 1px 6px rgba(0,0,0,0.15)",
          textAlign: "start",
        }}
      >
        {OPTIONS.map((o) => (
          <Tooltip key={o.key} title={o.title}>
            <Button
              size="small"
              type={o.key === active ? "primary" : "default"}
              onClick={() => dispatch(setActiveBasemap(o.key))}
              style={{display: 'flex', alignItems: 'center', justifyContent: 'start'}}
            >
              {o.label}
            </Button>
          </Tooltip>
        ))}
      </div>
    </>
  );
}