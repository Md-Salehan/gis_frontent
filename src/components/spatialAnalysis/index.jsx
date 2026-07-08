import React, { useState } from "react";
import Movable from "../common/Movable";
import Centroid from "./Centroid";
import { Button, Flex, Space, Tag, Typography } from "antd";
import { AimOutlined, CloseOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import {
  handleMinimizeGlobalComp,
  toggleCentroidModal,
  toggleCountPointsModal,
  toggleDistanceMatrixModal,
} from "../../store/slices/uiSlice";
import CountPointsInPolygon from "./CountPointsInPolygon";
import { Calculator, CircleDot, Dice5 } from "lucide-react";
import DistanceMatrix from "./DistanceMatrix";
const { Text, Title, Paragraph } = Typography;

function SpatialAnalysis() {
  const [position, setPosition] = useState({ x: null, y: null });
  const dispatch = useDispatch();
  const {
    isCentroidModalOpen,
    isCountPointsModalOpen,
    isDistanceMatrixModalOpen,
  } = useSelector((state) => state.ui);
  const handlePositionChange = (newPosition) => {
    setPosition(newPosition);
  };

  return (
    <>
      {isCentroidModalOpen ? (
        <Movable
          isMovable={true}
          title="Polygon Centroids"
          icon={<CircleDot />}
          titleFontSize={14}
          // onPositionChange={handlePositionChange}
          // initialPosition={position}
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            width: "auto",
            height: "auto",
          }}
          onClose={(e) => {
            dispatch(handleMinimizeGlobalComp({ id: "centroid", status: false }));
            dispatch(toggleCentroidModal({ state: false }));
          }}
          onMinimize={(e) => {
            dispatch(handleMinimizeGlobalComp({ id: "centroid" }));
          }}
        >
          <Centroid id="centroid" />
        </Movable>
      ) : (
        ""
      )}

      {isCountPointsModalOpen ? (
        <Movable
          isMovable={true}
          title="Count Points"
          icon={<Dice5 />}
          titleFontSize={14}
          // onPositionChange={handlePositionChange}
          // initialPosition={position}
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            height: "auto",
            width: "450px",
          }}
          onClose={(e) => {
            dispatch(handleMinimizeGlobalComp({ id: "countPoints", status: false }));
            dispatch(toggleCountPointsModal({ state: false }));
          }}
          onMinimize={(e) => {
            dispatch(handleMinimizeGlobalComp({ id: "countPoints" }));
          }}
        >
          <CountPointsInPolygon id="countPoints" />
        </Movable>
      ) : (
        ""
      )}

      {isDistanceMatrixModalOpen ? (
        <Movable
          isMovable={true}
          title="Distance Matrix"
          icon={<Calculator  />}
          titleFontSize={14}
          // onPositionChange={handlePositionChange}
          // initialPosition={position}
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            height: "auto",
            width: "auto",
          }}
          onClose={(e) => {
            dispatch(handleMinimizeGlobalComp({ id: "distanceMatrix", status: false }));
            dispatch(toggleDistanceMatrixModal({ state: false }));
          }}
          onMinimize={(e) => {
            dispatch(handleMinimizeGlobalComp({ id: "distanceMatrix"}));
          }}
        >
          <DistanceMatrix id="distanceMatrix" />
        </Movable>
      ) : (
        ""
      )}
    </>
  );
}

export default SpatialAnalysis;
