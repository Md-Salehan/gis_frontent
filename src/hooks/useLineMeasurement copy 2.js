// MeasureControl.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";

import { useSelector } from "react-redux";
import { useMap } from "react-leaflet";
import L from "leaflet";

// Custom hook for measurement functionality
export const useLineMeasurement = () => {
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
  const mouseMoveHandlerRef = useRef(null);

  // Temporary helper refs for dynamic drawing / markers
  const tempLineRef = useRef(null); // line from last vertex to cursor
  const vertexMarkersRef = useRef([]); // circle markers for vertices

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

  // Helpers to manage vertex markers
  const createVertexMarker = useCallback(
    (latlng) => {
      try {
        const marker = L.circleMarker(latlng, {
          radius: 5,
          color: "#3388ff",
          weight: 2,
          fillColor: "#fff",
          fillOpacity: 1,
          className: "measure-vertex-marker",
          pane: "markerPane",
        });
        marker.addTo(map);
        return marker;
      } catch (err) {
        return null;
      }
    },
    [map]
  );

  const addVertexMarker = useCallback(
    (latlng) => {
      const m = createVertexMarker(latlng);
      if (m) vertexMarkersRef.current.push(m);
    },
    [createVertexMarker]
  );

  const removeAllVertexMarkers = useCallback(() => {
    try {
      (vertexMarkersRef.current || []).forEach((m) => {
        if (m && map.hasLayer(m)) {
          map.removeLayer(m);
        }
      });
    } catch (err) {}
    vertexMarkersRef.current = [];
  }, [map]);

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

  const makeLinePermanent = useCallback(() => {
    if (currentLayerRef.current) {
      currentLayerRef.current.setStyle({
        dashArray: null,
        color: "#1890ff",
      });
    }
  }, []);

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
      if (mouseMoveHandlerRef.current) {
        map.off("mousemove", mouseMoveHandlerRef.current);
        mouseMoveHandlerRef.current = null;
      }
      if (keydownHandlerRef.current) {
        document.removeEventListener("keydown", keydownHandlerRef.current);
        keydownHandlerRef.current = null;
      }

      // Remove temporary dynamic line
      if (tempLineRef.current && map.hasLayer(tempLineRef.current)) {
        try {
          map.removeLayer(tempLineRef.current);
        } catch (err) {}
        tempLineRef.current = null;
      }

      // Remove current measurement layer and vertex markers if requested
      if (
        removeCurrentLayer &&
        currentLayerRef.current &&
        map.hasLayer(currentLayerRef.current)
      ) {
        try {
          map.removeLayer(currentLayerRef.current);
        } catch (err) {}
        currentLayerRef.current = null;
        removeAllVertexMarkers();
      } else {
        // Keep the line visible and make it permanent
        makeLinePermanent();
      }

      // Reset cursor
      try {
        map.getContainer().style.cursor = "";
      } catch (err) {
        // ignore if map container not available
      }
    },
    [map, makeLinePermanent, removeAllVertexMarkers]
  );

  // Keydown handler
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        // Cancel measurement: remove current layer and markers
        if (currentLayerRef.current && map.hasLayer(currentLayerRef.current)) {
          try {
            map.removeLayer(currentLayerRef.current);
          } catch (err) {}
          currentLayerRef.current = null;
        }

        // Clean up event listeners and temp graphics and markers
        cleanupMeasurement(true);

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
    // Keep the current line but remove dynamic helpers
    cleanupMeasurement(false);
    if (isMountedRef.current) {
      setIsMeasuring(false);
    }
  }, [cleanupMeasurement]);

  const clearAllMeasurements = useCallback(() => {
    // Clean up any active measurement first
    cleanupMeasurement(true);

    if (isMountedRef.current) {
      setMeasurementResult(null);
      setIsMeasuring(false);
    }
  }, [cleanupMeasurement]);

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
    if (mouseMoveHandlerRef.current) {
      map.off("mousemove", mouseMoveHandlerRef.current);
      mouseMoveHandlerRef.current = null;
    }
    if (keydownHandlerRef.current) {
      document.removeEventListener("keydown", keydownHandlerRef.current);
      keydownHandlerRef.current = null;
    }

    // Remove current measurement layer if exists
    if (currentLayerRef.current && map.hasLayer(currentLayerRef.current)) {
      try {
        map.removeLayer(currentLayerRef.current);
      } catch (err) {}
      currentLayerRef.current = null;
    }
    // remove existing markers too
    removeAllVertexMarkers();

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
        // add vertex to polyline
        currentLayerRef.current.addLatLng(latlng);

        // add a visible marker for the vertex
        addVertexMarker(latlng);

        const updatedLatLngs = currentLayerRef.current.getLatLngs();
        updateMeasurementDisplay(currentLayerRef.current, updatedLatLngs);

        // remove any temporary line (cursor line) after placing a point
        if (tempLineRef.current && map.hasLayer(tempLineRef.current)) {
          try {
            map.removeLayer(tempLineRef.current);
          } catch (err) {}
          tempLineRef.current = null;
        }
      } catch (error) {
        console.warn("Error handling click during measurement:", error);
      }
    };

    const handleMouseMove = (e) => {
      if (
        !currentLayerRef.current ||
        !map.hasLayer(currentLayerRef.current) ||
        !isMountedRef.current
      ) {
        return;
      }

      try {
        const latlng = e.latlng;
        const vertices = currentLayerRef.current.getLatLngs() || [];

        // if there is at least one placed vertex, draw a temporary segment
        if (vertices.length > 0) {
          const last = vertices[vertices.length - 1];

          // Create or update temporary line between last vertex and cursor
          const tempCoords = [last, latlng];
          if (!tempLineRef.current) {
            tempLineRef.current = L.polyline(tempCoords, {
              color: "#3388ff",
              weight: 3,
              dashArray: "5,10",
              interactive: false,
              pane: currentLayerRef.current.options.pane,
            }).addTo(map);
          } else {
            tempLineRef.current.setLatLngs(tempCoords);
          }
        }
      } catch (err) {
        // ignore transient errors
      }
    };

    const handleDoubleClick = (e) => {
      if (
        !currentLayerRef.current ||
        !map.hasLayer(currentLayerRef.current) ||
        !isMountedRef.current
      ) {
        // Prevent default dblclick zoom still
        e.originalEvent?.stopPropagation();
        return false;
      }

      try {
        const finalLatLngs = currentLayerRef.current.getLatLngs();

        if (finalLatLngs.length > 0) {
          // Ensure final vertex marker exists (if user double-clicked without adding last click)
          const lastPoint = finalLatLngs[finalLatLngs.length - 1];
          addVertexMarker(lastPoint);

          if (finalLatLngs.length > 1) {
            // Use existing updateMeasurementDisplay (reads current measure.unit)
            updateMeasurementDisplay(currentLayerRef.current, finalLatLngs);

            // Make the line permanent (style change)
            makeLinePermanent();

            // Remove dynamic handlers (but keep the created line & vertex markers)
            if (clickHandlerRef.current) {
              map.off("click", clickHandlerRef.current);
              clickHandlerRef.current = null;
            }
            if (dblClickHandlerRef.current) {
              map.off("dblclick", dblClickHandlerRef.current);
              dblClickHandlerRef.current = null;
            }
            if (mouseMoveHandlerRef.current) {
              map.off("mousemove", mouseMoveHandlerRef.current);
              mouseMoveHandlerRef.current = null;
            }
            if (keydownHandlerRef.current) {
              document.removeEventListener(
                "keydown",
                keydownHandlerRef.current
              );
              keydownHandlerRef.current = null;
            }

            // remove temp line if present
            if (tempLineRef.current && map.hasLayer(tempLineRef.current)) {
              try {
                map.removeLayer(tempLineRef.current);
              } catch (err) {}
              tempLineRef.current = null;
            }

            try {
              map.getContainer().style.cursor = "";
            } catch (err) {}

            if (isMountedRef.current) {
              setIsMeasuring(false);
            }
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
    mouseMoveHandlerRef.current = handleMouseMove;
    keydownHandlerRef.current = handleKeyDown;

    // Add event listeners
    map.on("click", handleClick);
    map.on("dblclick", handleDoubleClick);
    map.on("mousemove", handleMouseMove);
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
      if (mouseMoveHandlerRef.current) {
        map.off("mousemove", mouseMoveHandlerRef.current);
        mouseMoveHandlerRef.current = null;
      }
      if (keydownHandlerRef.current) {
        document.removeEventListener("keydown", keydownHandlerRef.current);
        keydownHandlerRef.current = null;
      }
      // remove temporary line
      if (tempLineRef.current && map.hasLayer(tempLineRef.current)) {
        try {
          map.removeLayer(tempLineRef.current);
        } catch (err) {}
        tempLineRef.current = null;
      }
      try {
        map.getContainer().style.cursor = "";
      } catch (err) {}
    };

    return cleanupSession;
  }, [
    map,
    /* remove measure?.unit and other unit-capturing deps so this callback stays stable */
    formatMeasurement,
    updateMeasurementDisplay,
    handleKeyDown,
    addVertexMarker,
    makeLinePermanent,
    removeAllVertexMarkers,
    createVertexMarker,
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

  // Whenever the measurement unit changes, recompute and update the displayed
  // measurement (tooltip + measurementResult) for the current line — this
  // ensures unit changes take effect before, during, or after a measurement.
  useEffect(() => {
    try {
      const layer = currentLayerRef.current;
      if (!layer || !map?.hasLayer(layer)) return;

      const latLngs = layer.getLatLngs ? layer.getLatLngs() : [];
      if (latLngs && latLngs.length > 1) {
        // updateMeasurementDisplay will recalculate distance using the current
        // measure.unit (it's in its dependency list) and update tooltip + state
        updateMeasurementDisplay(layer, latLngs);
      } else if (latLngs && latLngs.length === 1) {
        // single vertex -> clear any previous result (no length yet)
        if (isMountedRef.current) {
          setMeasurementResult(null);
        }
        if (layer.getTooltip && layer.getTooltip()) {
          layer.unbindTooltip();
        }
      }
    } catch (err) {
      // non-fatal; ignore
    }
  }, [measure?.unit, map, updateMeasurementDisplay]);

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
