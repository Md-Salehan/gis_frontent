import React from "react";

function LeyerIcon({ iconInfo }) {
  let geom_typ = iconInfo?.geom_typ;
  let iconType = "unknown-layer-icon";
  let style = {
    backgroundColor: iconInfo?.fill_color || "transparent",
    borderColor: iconInfo?.stroke_color || "black",
  };

  if (geom_typ === "G") {
    iconType = "polygon-icon";
  } else if (geom_typ === "P") iconType = "point-icon";
  else if (geom_typ === "L") iconType = "line-icon";

  return <div className={iconType} style={style}></div>;
}

export default LeyerIcon;
