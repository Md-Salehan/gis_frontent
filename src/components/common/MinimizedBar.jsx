import React from "react";
import CustomDrawer from "./CustomDrawer";
import { useDispatch, useSelector } from "react-redux";
import { Tag } from "antd";
import { pad } from "lodash";

function MinimizedBar() {
  const minimizedComponents = useSelector(
    (state) => state.ui.minimizedGlobalCompList,
  );
  const dispatch = useDispatch();
  return (
    <CustomDrawer
      title=""
      placement="right"
      onClose={() => {}}
      open={minimizedComponents.length > 0}
      width={60}
      destroyOnClose={false}
      mask={false}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: "100%",
          width: "100%",
          gap: "8px",
        }}
      >
        {minimizedComponents.map((comp, index) => (
          <Tag
            key={comp.id+index}
            onClick={comp?.click || (() => {})}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "44px",
              width: "50px",
              margin: "0",
            }}
            color="blue"
            className="movable-close-button"
          >
            {comp?.icon || "X"}
          </Tag>
        ))}
      </div>
    </CustomDrawer>
  );
}

export default MinimizedBar;
