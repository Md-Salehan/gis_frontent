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

const { Text } = Typography;
const { Option } = Select;

// Custom hook for measurement functionality
const useLineMeasurement = () => {
  const map = useMap();
  const measure = useSelector((s) => s.map.measure);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementResult, setMeasurementResult] = useState(null);

  // Use refs for all mutable values
  // const measuredLinesRef = useRef([]);
  const currentLayerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Keep references to handlers so we can remove only those
  const clickHandlerRef = useRef(null);
  const dblClickHandlerRef = useRef(null);
  const keydownHandlerRef = useRef(null);

  // Set mounted flag
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Calculate distance between points
  const calculateDistance = useCallback(
    (latLngs) => {
      if (latLngs.length < 2) return 0;
      return latLngs.reduce((total, latLng, index, array) => {
        return index > 0
          ? total + map.distance(array[index - 1], latLng)
          : total;
      }, 0);
    },
    [map]
  );

  // Convert distance to selected unit
  const convertToUnit = useCallback((distanceInMeters, unit) => {
    switch (unit) {
      case "km":
        return distanceInMeters / 1000;
      case "mi":
        return distanceInMeters / 1609.34;
      default: // meters
        return distanceInMeters;
    }
  }, []);

  // Format measurement results
  const formatMeasurement = useCallback((value, unit) => {
    const roundedValue = Math.round(value * 100) / 100;

    switch (unit) {
      case "km":
        return {
          value: roundedValue,
          unit: "km",
          full: `${roundedValue} km`,
          rawValue: value,
        };
      case "mi":
        return {
          value: roundedValue,
          unit: "mi",
          full: `${roundedValue} miles`,
          rawValue: value,
        };
      default: // meters
        return {
          value: roundedValue,
          unit: "m",
          full: `${roundedValue} meters`,
          rawValue: value,
        };
    }
  }, []);

  // Update measurement display
  const updateMeasurementDisplay = useCallback(
    (layer, latLngs) => {
      if (latLngs.length > 1) {
        const distanceInMeters = calculateDistance(latLngs);
        const convertedDistance = convertToUnit(
          distanceInMeters,
          measure?.unit || "km"
        );
        const formatted = formatMeasurement(
          convertedDistance,
          measure?.unit || "km"
        );
        const lastPoint = latLngs[latLngs.length - 1];

        if (layer.getTooltip()) {
          layer.setTooltipContent(formatted.full);
        } else {
          layer.bindTooltip(formatted.full, {
            permanent: true,
            direction: "center",
            className: "measure-tooltip",
          });
        }
        layer.openTooltip(lastPoint);

        if (isMountedRef.current) {
          setMeasurementResult(formatted);
        }
      }
    },
    [calculateDistance, formatMeasurement, convertToUnit, measure?.unit]
  );

  // Clean up measurement resources (only remove handlers added by this hook)
  const cleanupMeasurement = useCallback(
    (removeCurrentLayer = false) => {
      // Remove only handlers we added
      if (clickHandlerRef.current) {
        map.off("click", clickHandlerRef.current);
        clickHandlerRef.current = null;
      }
      if (dblClickHandlerRef.current) {
        map.off("dblclick", dblClickHandlerRef.current);
        dblClickHandlerRef.current = null;
      }
      if (keydownHandlerRef.current) {
        document.removeEventListener("keydown", keydownHandlerRef.current);
        keydownHandlerRef.current = null;
      }

      // Remove current measurement layer if specified
      if (
        removeCurrentLayer &&
        currentLayerRef.current &&
        map.hasLayer(currentLayerRef.current)
      ) {
        map.removeLayer(currentLayerRef.current);
        currentLayerRef.current = null;
      }

      // Reset cursor
      try {
        map.getContainer().style.cursor = "";
      } catch (err) {
        // ignore if map container not available
      }
    },
    [map]
  );

  // Keydown handler
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        // Remove current layer
        if (currentLayerRef.current && map.hasLayer(currentLayerRef.current)) {
          map.removeLayer(currentLayerRef.current);
          currentLayerRef.current = null;
        }

        // Clean up event listeners we added
        cleanupMeasurement(false);

        // Update state
        if (isMountedRef.current) {
          setIsMeasuring(false);
          setMeasurementResult(null);
        }
      }
    },
    [map, cleanupMeasurement]
  );

  const stopMeasuring = useCallback(() => {
    cleanupMeasurement(false);
    if (isMountedRef.current) {
      setIsMeasuring(false);
    }
  }, [cleanupMeasurement]);

  const clearAllMeasurements = useCallback(() => {
    // Clean up any active measurement first
    cleanupMeasurement(true);

    // Remove all measured lines from map
    // measuredLinesRef.current.forEach((line) => {
    //   if (line && map.hasLayer(line)) {
    //     map.removeLayer(line);
    //   }
    // });
    // measuredLinesRef.current = [];

    if (isMountedRef.current) {
      setMeasurementResult(null);
      setIsMeasuring(false);
    }
  }, [map, cleanupMeasurement]);

  const startLineMeasurement = useCallback(() => {
    if (!isMountedRef.current) return;

    setIsMeasuring(true);
    setMeasurementResult(null);

    // Clean up any existing handlers added by this hook
    if (clickHandlerRef.current) {
      map.off("click", clickHandlerRef.current);
      clickHandlerRef.current = null;
    }
    if (dblClickHandlerRef.current) {
      map.off("dblclick", dblClickHandlerRef.current);
      dblClickHandlerRef.current = null;
    }
    if (keydownHandlerRef.current) {
      document.removeEventListener("keydown", keydownHandlerRef.current);
      keydownHandlerRef.current = null;
    }

    // Remove current measurement layer if exists
    if (currentLayerRef.current && map.hasLayer(currentLayerRef.current)) {
      map.removeLayer(currentLayerRef.current);
      currentLayerRef.current = null;
    }

    // Create line layer for measurement
    const layerOptions = {
      color: "#3388ff",
      weight: 3,
      dashArray: "5, 10",
    };

    const layer = new L.Polyline([], layerOptions);
    layer.addTo(map);
    currentLayerRef.current = layer;

    // Define event handlers
    const handleClick = (e) => {
      if (
        !currentLayerRef.current ||
        !map.hasLayer(currentLayerRef.current) ||
        !isMountedRef.current
      ) {
        return;
      }

      try {
        const latlng = e.latlng;
        currentLayerRef.current.addLatLng(latlng);
        const updatedLatLngs = currentLayerRef.current.getLatLngs();
        updateMeasurementDisplay(currentLayerRef.current, updatedLatLngs);
      } catch (error) {
        console.warn("Error handling click during measurement:", error);
      }
    };

    const handleDoubleClick = (e) => {
      if (
        !currentLayerRef.current ||
        !map.hasLayer(currentLayerRef.current) ||
        !isMountedRef.current
      ) {
        return;
      }

      try {
        const finalLatLngs = currentLayerRef.current.getLatLngs();

        if (finalLatLngs.length > 1) {
          const distanceInMeters = calculateDistance(finalLatLngs);
          const convertedDistance = convertToUnit(
            distanceInMeters,
            measure?.unit || "km"
          );
          const formatted = formatMeasurement(
            convertedDistance,
            measure?.unit || "km"
          );
          const lastPoint = finalLatLngs[finalLatLngs.length - 1];

          // Make the line permanent
          currentLayerRef.current.setStyle({
            dashArray: null,
            color: "#1890ff",
          });

          // currentLayerRef.current
          //   .bindTooltip(formatted.full, {
          //     permanent: true,
          //     direction: "center",
          //     className: "measure-tooltip",
          //   })
          //   .openTooltip(lastPoint);

          if (isMountedRef.current) {
            setMeasurementResult(formatted);
          }

          // // Store the measured line to keep it visible
          // measuredLinesRef.current.push(currentLayerRef.current);

          // Stop measuring but keep the line visible
          if (clickHandlerRef.current) {
            map.off("click", clickHandlerRef.current);
            clickHandlerRef.current = null;
          }
          if (dblClickHandlerRef.current) {
            map.off("dblclick", dblClickHandlerRef.current);
            dblClickHandlerRef.current = null;
          }
          if (keydownHandlerRef.current) {
            document.removeEventListener("keydown", keydownHandlerRef.current);
            keydownHandlerRef.current = null;
          }

          try {
            map.getContainer().style.cursor = "";
          } catch (err) {}

          if (isMountedRef.current) {
            setIsMeasuring(false);
          }
        }

        // Prevent map zoom on double click
        e.originalEvent?.stopPropagation();
        return false;
      } catch (error) {
        console.warn("Error handling double click during measurement:", error);
      }
    };

    // Store handlers in refs so they can be removed specifically later
    clickHandlerRef.current = handleClick;
    dblClickHandlerRef.current = handleDoubleClick;
    keydownHandlerRef.current = handleKeyDown;

    // Add event listeners
    map.on("click", handleClick);
    map.on("dblclick", handleDoubleClick);
    document.addEventListener("keydown", handleKeyDown);

    // Update cursor
    try {
      map.getContainer().style.cursor = "crosshair";
    } catch (err) {}

    // Store cleanup functions for this session
    const cleanupSession = () => {
      if (clickHandlerRef.current) {
        map.off("click", clickHandlerRef.current);
        clickHandlerRef.current = null;
      }
      if (dblClickHandlerRef.current) {
        map.off("dblclick", dblClickHandlerRef.current);
        dblClickHandlerRef.current = null;
      }
      if (keydownHandlerRef.current) {
        document.removeEventListener("keydown", keydownHandlerRef.current);
        keydownHandlerRef.current = null;
      }
      try {
        map.getContainer().style.cursor = "";
      } catch (err) {}
    };

    return cleanupSession;
  }, [
    map,
    calculateDistance,
    formatMeasurement,
    updateMeasurementDisplay,
    handleKeyDown,
    convertToUnit,
    measure?.unit,
  ]);

  // Effect to manage measurement lifecycle
  useEffect(() => {
    let cleanupFunction;

    if (isMeasuring && measure?.type === "line") {
      cleanupFunction = startLineMeasurement();
    }

    return () => {
      cleanupFunction?.();
    };
  }, [isMeasuring, measure?.type, startLineMeasurement]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanupMeasurement(true);
    };
  }, [cleanupMeasurement]);

  return {
    startMeasuring: () => setIsMeasuring(true),
    stopMeasuring,
    clearAllMeasurements,
    isMeasuring,
    measurementResult,
  };
};

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
          disabled={isMeasuring}
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
