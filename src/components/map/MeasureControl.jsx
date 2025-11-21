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

const { Text } = Typography;
const { Option } = Select;



const MeasureControl = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((s) => s.ui.isMeasureOpen);
  const measure = useSelector((s) => s.map.measure);

  const {
    startMeasuring,
    stopMeasuring,
    clearAllMeasurements,
    isMeasuring,
    measurementResult,
  } = useLineMeasurement();

  const onClose = () => {
    stopMeasuring();
    dispatch(toggleMeasure());
  };

  const handleMeasureTypeChange = (type) => {
    if (isMeasuring) {
      stopMeasuring();
    }
    dispatch(setMeasureType(type));
  };

  const handleStartMeasurement = () => {
    if (measure?.type === "line") {
      if (isMeasuring) {
        stopMeasuring();
      } else {
        startMeasuring();
      }
    }
    // Area measurement will be implemented later
  };

  const handleClearMeasurements = () => {
    clearAllMeasurements();
  };

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

          <Tooltip title="Area (measure polygon) - Coming Soon">
            <Button
              type={measure?.type === "area" ? "primary" : "default"}
              icon={<Square size={16} />}
              onClick={() => handleMeasureTypeChange("area")}
              disabled
            >
              Area
            </Button>
          </Tooltip>
        </Space>

        <Divider />

        <Text strong>Units</Text>
        <Select
          value={measure?.unit || "km"}
          onChange={(val) => dispatch(setMeasureUnit(val))}
          style={{ width: "100%" }}
        >
          <Option value="m">meters (m)</Option>
          <Option value="km">kilometers (km)</Option>
          <Option value="mi">miles (mi)</Option>
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
          <Alert
            message="Area Measurement"
            description="Area measurement functionality will be implemented in the next phase."
            type="warning"
            showIcon
          />
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
