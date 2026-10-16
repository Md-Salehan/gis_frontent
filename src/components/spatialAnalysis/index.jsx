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
  toggleSpatialQueryModal,
} from "../../store/slices/uiSlice";
import CountPointsInPolygon from "./CountPointsInPolygon";
import { Calculator, CircleDot, Dice5, Link, TextSearch } from "lucide-react";
import DistanceMatrix from "./DistanceMatrix";
import SpatialJoin from "./spatialJoin";
import { DataJoinPanel } from "./dataJoin";
import SelectedFeaturePanel from "../map/MapLeftPanel/SelectedFeature/SelectedFeatureButton";
import { SelectedFeaturesPanel } from "..";
import SpatialQuery from "./spatialQuery";
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
    isSpatialQueryModalOpen,
  } = useSelector((state) => state.ui);

  return (
    <>
      {isCentroidModalOpen ? (
        <Movable
          id="centroid"
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
            width: "300px",
            height: "auto",
          }}
          onClose={(e) => {

            dispatch(toggleCentroidModal({ state: false }));
          }}
          isMinimizable={true}
        >
          <Centroid  />
        </Movable>
      ) : (
        ""

      )}

      {isCountPointsModalOpen ? (
        <Movable
        id="countPoints"
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

            dispatch(toggleCountPointsModal({ state: false }));
          }}
          isMinimizable={true}
        >
          <CountPointsInPolygon />
        </Movable>
      ) : (
        ""
      )}

      {isDistanceMatrixModalOpen ? (
        <Movable
          id="distanceMatrix"
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

            dispatch(toggleDistanceMatrixModal({ state: false }));
          }}
          isMinimizable={true}

        >
          <DistanceMatrix />
        </Movable>
      ) : (
        ""
      )}

      {isSpatialJoinModalOpen ? (
        <Movable
          id="spatialJoin"
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
            dispatch(toggleSpatialJoinModal({ state: false }));
          }}
          isMinimizable={true}
          
        >
          <SpatialJoin />
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

      { isSpatialQueryModalOpen ? (
        <Movable
          id="spatialQuery"
          isMovable={true}
          title="Spatial Query"
          icon={<TextSearch />}
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

            dispatch(toggleSpatialQueryModal({ state: false }));
          }}
          isMinimizable={true}
        >
          <SpatialQuery  />
        </Movable>
      ) : (
        ""
      )}
    </>
  );
}

export default MovableModals;
