import React from "react";
import { DEFAULT_STYLES } from "../../constants";

function LeyerIcon({ iconInfo }) {
  let geom_typ = iconInfo?.geom_typ;
  let iconType = "unknown-layer-icon";

  let style = {
    backgroundColor: iconInfo?.fill_color || DEFAULT_STYLES.fillColor,
    borderColor: iconInfo?.stroke_color || DEFAULT_STYLES.color,
  };

  // If an image URL is provided, render that
  const imgUrl = iconInfo?.marker_img_url;
  if (imgUrl) {
    
    const markerSize = 16;
    return (
      <div className="layer-icon" style={{}}>
        <img
          src={imgUrl}
          alt="marker"
          style={{
            width: `${markerSize}px`,
            height: `${markerSize}px`,
            objectFit: "contain",
          }}
        />
      </div>
    );
  }

  // If a Font Awesome icon name is provided, render that instead
  const faName = iconInfo?.marker_fa_icon_name;
  if (faName) {
    const markerSize = 16; // default size
    const markerColor = iconInfo?.fill_color || DEFAULT_STYLES.color;

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
    style = {
      ...style,
      backgroundColor: iconInfo?.stroke_color || DEFAULT_STYLES.markerFillColor,
    };
  } else if (geom_typ === "L") {
    iconType = "line-icon";
    style = {
      backgroundColor: iconInfo?.stroke_color || DEFAULT_STYLES.color,
      borderColor: "transparent",
    };
  }



  return <div className={iconType} style={style}></div>;
}

export default LeyerIcon;
