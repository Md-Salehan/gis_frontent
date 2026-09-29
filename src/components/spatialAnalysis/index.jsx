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
  toggleDataJoinModal,
  toggleDistanceMatrixModal,
  toggleSelectedFeaturePanel,
  toggleSpatialJoinModal,
} from "../../store/slices/uiSlice";
import CountPointsInPolygon from "./CountPointsInPolygon";
import { Calculator, CircleDot, Dice5, Link } from "lucide-react";
import DistanceMatrix from "./DistanceMatrix";
import SpatialJoin from "./spatialJoin";
import { DataJoinPanel } from "./dataJoin";
import SelectedFeaturePanel from "../map/MapLeftPanel/SelectedFeature/SelectedFeatureButton";
import { SelectedFeaturesPanel } from "..";
const { Text, Title, Paragraph } = Typography;

function MovableModals() {
  const dispatch = useDispatch();
  const {
    isCentroidModalOpen,
    isCountPointsModalOpen,
    isDistanceMatrixModalOpen,
    isSpatialJoinModalOpen,
    isDataJoinModalOpen,
    isSelectedFeaturePanelOpen,
  } = useSelector((state) => state.ui);

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
            dispatch(
              handleMinimizeGlobalComp({ id: "centroid", status: false }),
            );
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
            dispatch(
              handleMinimizeGlobalComp({ id: "countPoints", status: false }),
            );
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
          icon={<Calculator />}
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
            dispatch(
              handleMinimizeGlobalComp({ id: "distanceMatrix", status: false }),
            );
            dispatch(toggleDistanceMatrixModal({ state: false }));
          }}
          onMinimize={(e) => {
            dispatch(handleMinimizeGlobalComp({ id: "distanceMatrix" }));
          }}
        >
          <DistanceMatrix id="distanceMatrix" />
        </Movable>
      ) : (
        ""
      )}

      {isSpatialJoinModalOpen ? (
        <Movable
          isMovable={true}
          title="Spatial Join"
          icon={<Calculator />}
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
            dispatch(
              handleMinimizeGlobalComp({ id: "spatialJoin", status: false }),
            );
            dispatch(toggleSpatialJoinModal({ state: false }));
          }}
          onMinimize={(e) => {
            dispatch(handleMinimizeGlobalComp({ id: "spatialJoin" }));
          }}
        >
          <SpatialJoin id="spatialJoin" />
        </Movable>
      ) : (
        ""
      )}

      {isDataJoinModalOpen ? (
        <Movable
          id="dataJoin"
          isMovable={true}
          title="Data Join"
          icon={<Link />}
          titleFontSize={14}
          // onPositionChange={handlePositionChange}
          // initialPosition={position}
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            height: "auto",
            width: "550px",
          }}
          onClose={(e) => {
            dispatch(
              handleMinimizeGlobalComp({ id: "dataJoin", status: false }),
            );
            dispatch(toggleDataJoinModal({ state: false }));
          }}
          isMinimizable={true}
        >
          <DataJoinPanel />
        </Movable>
      ) : (
        ""
      )}

      {/* {isSelectedFeaturePanelOpen ? (
        <Movable
          id="selectedFeature"
          isMovable={true}
          title="Selected Feature"
          icon={<Link />}
          titleFontSize={14}
          // onPositionChange={handlePositionChange}
          // initialPosition={position}
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            height: "auto",
            width: "550px",
          }}
          onClose={(e) => {
            dispatch(
              handleMinimizeGlobalComp({
                id: "selectedFeature",
                status: false,
              }),
            );
            dispatch(toggleSelectedFeaturePanel({ state: false }));
          }}
          isMinimizable={true}
        >
          <SelectedFeaturesPanel />
        </Movable>
      ) : (
        ""
      )} */}
    </>
  );
}

export default MovableModals;
