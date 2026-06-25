import React, { useState } from "react";
import Movable from "../common/Movable";
import Centroid from "./Centroid";
import { Button, Flex, Space, Tag, Typography } from "antd";
import { AimOutlined, CloseOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { toggleCentroidModal } from "../../store/slices/uiSlice";
const { Text, Title, Paragraph } = Typography;

function SpatialAnalysis() {
  const [position, setPosition] = useState({ x: null, y: null });
  const dispatch = useDispatch();
  const { isCentroidModalOpen } = useSelector((state) => state.ui);
  const handlePositionChange = (newPosition) => {
    setPosition(newPosition);
    // Optionally persist position to localStorage or parent
  };

  return (
    <>
      {isCentroidModalOpen ? (
        <Movable
          isMovable={true}
          title="Polygon Centroids"
          icon={<AimOutlined style={{ color: "#1890ff", fontSize: 18 }} />}
          titleFontSize={14}
          onPositionChange={handlePositionChange}
          initialPosition={position}
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            width: "auto",
            height: "auto",
          }}
          onClose={(e) => {
            console.log("log calling onClose");

            e.preventDefault();
            e.stopPropagation();
            dispatch(toggleCentroidModal({ state: false }));
          }}
        >
          <Centroid />
        </Movable>
      ) : (
        ""
      )}
    </>
  );
}

export default SpatialAnalysis;
