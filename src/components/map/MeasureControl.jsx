// MeasureControl.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Drawer,
  Select,
  Space,
  Typography,
  Divider,
  Button,
  Tooltip,
  Alert,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { toggleMeasure } from "../../store/slices/uiSlice";
import { setMeasureType, setMeasureUnit } from "../../store/slices/mapSlice";
import CustomDrawer from "../common/CustomDrawer";
import { Ruler, Square, X } from "lucide-react";
import { useLineMeasurement } from "../../hooks";
import useAreaMeasurement from "../../hooks/useAreaMeasurement";

const { Text } = Typography;
const { Option } = Select;

const MeasureControl = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((s) => s.ui.isMeasureOpen);
  const measure = useSelector((s) => s.map.measure);

  // both hooks available; we will use based on measure.type
  const lineHook = useLineMeasurement();
  const areaHook = useAreaMeasurement();

  // pick relevant API depending on current measure.type
  const activeHook = measure?.type === "area" ? areaHook : lineHook;

  const onClose = () => {
    // ensure any active measurement stops
    lineHook.stopMeasuring();
    areaHook.stopMeasuring();
    dispatch(toggleMeasure());
  };

  const handleMeasureTypeChange = (type) => {
    // stop both before switching to avoid duplicate listeners
    lineHook.stopMeasuring();
    areaHook.stopMeasuring();
    dispatch(setMeasureType(type));
  };

  const handleStartMeasurement = () => {
    if (measure?.type === "line") {
      if (lineHook.isMeasuring) {
        lineHook.stopMeasuring();
      } else {
        lineHook.startMeasuring();
      }
    } else if (measure?.type === "area") {
      if (areaHook.isMeasuring) {
        areaHook.stopMeasuring();
      } else {
        areaHook.startMeasuring();
      }
    }
  };

  const handleClearMeasurements = () => {
    // clear both to be safe
    lineHook.clearAllMeasurements();
    areaHook.clearAllMeasurements();
  };

  // unit options depend on measurement type
  const renderUnitOptions = () => {
    if (measure?.type === "area") {
      return (
        <>
          <Option value="m2">m²</Option>
          <Option value="km2">km²</Option>
          <Option value="ha">hectares (ha)</Option>
          <Option value="ac">acres (ac)</Option>
        </>
      );
    }
    return (
      <>
        <Option value="m">meters (m)</Option>
        <Option value="km">kilometers (km)</Option>
        <Option value="mi">miles (mi)</Option>
      </>
    );
  };

  const isMeasuring = activeHook?.isMeasuring;
  const measurementResult = activeHook?.measurementResult;

  return (
    <CustomDrawer
      title="Measure"
      placement="left"
      onClose={onClose}
      open={isOpen}
      width={300}
      destroyOnClose={false}
      mask={false}
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Text strong>Mode</Text>

        <Space>
          <Tooltip title="Line (measure length)">
            <Button
              type={measure?.type === "line" ? "primary" : "default"}
              icon={<Ruler size={16} />}
              onClick={() => handleMeasureTypeChange("line")}
            >
              Line
            </Button>
          </Tooltip>

          <Tooltip title="Area (measure polygon)">
            <Button
              type={measure?.type === "area" ? "primary" : "default"}
              icon={<Square size={16} />}
              onClick={() => handleMeasureTypeChange("area")}
            >
              Area
            </Button>
          </Tooltip>
        </Space>

        <Divider />

        <Text strong>Units</Text>
        <Select
          value={measure?.unit || (measure?.type === "area" ? "m2" : "km")}
          onChange={(val) => dispatch(setMeasureUnit(val))}
          style={{ width: "100%" }}
        >
          {renderUnitOptions()}
        </Select>

        <Divider />

        {measure?.type === "line" && (
          <>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button
                type={isMeasuring ? "primary" : "default"}
                onClick={handleStartMeasurement}
                style={{ width: "100%" }}
              >
                {isMeasuring ? "Stop Measuring" : "Start Line Measurement"}
              </Button>

              {measurementResult && (
                <Alert
                  message={`Distance: ${measurementResult.full}`}
                  type="info"
                  showIcon
                />
              )}

              {(isMeasuring || measurementResult) && (
                <Button
                  icon={<X size={14} />}
                  onClick={handleClearMeasurements}
                  danger
                  style={{ width: "100%" }}
                >
                  Clear Measurements
                </Button>
              )}
            </Space>

            {isMeasuring && (
              <Alert
                message="Measurement Instructions"
                description={
                  <Space direction="vertical" size="small">
                    <Text>• Click on map to add points</Text>
                    <Text>• Double-click to finish</Text>
                    <Text>• Press ESC to cancel</Text>
                  </Space>
                }
                type="info"
                showIcon
              />
            )}
          </>
        )}

        {measure?.type === "area" && (
          <>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button
                type={isMeasuring ? "primary" : "default"}
                onClick={handleStartMeasurement}
                style={{ width: "100%" }}
              >
                {isMeasuring ? "Stop Measuring" : "Start Area Measurement"}
              </Button>

              {measurementResult && (
                <Alert
                  message={`Area: ${measurementResult.full}`}
                  type="info"
                  showIcon
                />
              )}

              {(isMeasuring || measurementResult) && (
                <Button
                  icon={<X size={14} />}
                  onClick={handleClearMeasurements}
                  danger
                  style={{ width: "100%" }}
                >
                  Clear Measurements
                </Button>
              )}
            </Space>

            {isMeasuring && (
              <Alert
                message="Measurement Instructions"
                description={
                  <Space direction="vertical" size="small">
                    <Text>• Click on map to add polygon vertices</Text>
                    <Text>
                      • Double-click to finish (needs at least 3 points)
                    </Text>
                    <Text>• Press ESC to cancel</Text>
                  </Space>
                }
                type="info"
                showIcon
              />
            )}
          </>
        )}

        <Divider />

        <Text type="secondary" style={{ fontSize: "12px" }}>
          The measurement mode and unit are stored in the Redux store. Hook your
          drawing/measurement logic to these settings (map slice: map.measure).
        </Text>
      </Space>
    </CustomDrawer>
  );
};

export default MeasureControl;
