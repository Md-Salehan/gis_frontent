import React from "react";

function LeyerIcon({ iconInfo }) {
  let geom_typ = iconInfo?.geom_typ;
  let iconType = "unknown-layer-icon";
  let style = {
    backgroundColor: iconInfo?.fill_color || "transparent",
    borderColor: iconInfo?.stroke_color || "black",
  };
  console.log(iconInfo, "iconinfo");

  // If a Font Awesome icon name is provided, render that instead
  const faName = iconInfo?.marker_fa_icon_name;
  if (faName) {
    const markerSize = 16; // default size
    const markerColor = iconInfo?.marker_color || "#2c3e50";

    const iStyle = {
      fontSize: `${markerSize}px`,
      color: markerColor,
      lineHeight: 1,
    };

    return (
      <div className="layer-icon" style={{}}>
        <i className={faName} style={iStyle} aria-hidden="true" />
      </div>
    );
  }

  if (geom_typ === "G") {
    iconType = "polygon-icon";
  } else if (geom_typ === "P") {
    iconType = "point-icon";
  } else if (geom_typ === "L") {
    iconType = "line-icon";
    style = {
      backgroundColor: iconInfo?.stroke_color || "black",
      borderColor: "transparent",
    };
  }

  return <div className={iconType} style={style}></div>;
}

export default LeyerIcon;
