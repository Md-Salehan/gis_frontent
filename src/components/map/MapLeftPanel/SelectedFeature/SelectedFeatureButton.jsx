import { Button, Tag, Tooltip } from "antd";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  handleMinimizeGlobalComp,
  toggleDataJoinModal,
  toggleSelectedFeaturePanel,
} from "../../../../store/slices/uiSlice";
import { Link } from "lucide-react";
import { DataJoinPanel } from "../../../spatialAnalysis/dataJoin";
import Movable from "../../../common/Movable";

function SelectedFeaturePanel() {
  const multiSelectedFeatures = useSelector(
    (state) => state.map.multiSelectedFeatures,
  );
  const dispatch = useDispatch();
  return (
    <div>
      <Tooltip key="selected-feature" title="Selected Feature">
        <Button
          size="small"
          type={"default"}
          onClick={() => {
            dispatch(toggleSelectedFeaturePanel());
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "start",
            width: "fit-content",
            padding: "14px 8px",
            borderRadius: 4,
            background: "rgba(255,255,255,0.9)",
            boxShadow: "0 1px 6px rgba(0,0,0,0.15)",
            textAlign: "start",
          }}
        >
          Selected
          <Tag
            size="small"
            color={multiSelectedFeatures.length > 0 ? "blue" : "default"}
            style={{ margin: 0, cursor: "pointer", userSelect: "none" }}
          >
            {multiSelectedFeatures.length}
          </Tag>
        </Button>
      </Tooltip>
    </div>
  );
}

export default SelectedFeaturePanel;
