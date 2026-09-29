import React from "react";
import BaseMapSwitcherControl from "../BaseMapSwitcherControl";
import SelectedFeatureButton from "./SelectedFeature/SelectedFeatureButton";

function MapLeftPanel() {
  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        zIndex: 1200,
        display: "flex",
        flexDirection: "column",
        width: "150px",
        gap: 6,
        padding: 6,
        borderRadius: 6,
        // background: "rgba(255,255,255,0.9)",
        // boxShadow: "0 1px 6px rgba(0,0,0,0.15)",
        textAlign: "start",
      }}
    >
      <BaseMapSwitcherControl />
      <SelectedFeatureButton />
    </div>
  );
}

export default MapLeftPanel;
