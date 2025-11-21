// ...existing code...
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useMap } from "react-leaflet";
import L from "leaflet";

/**
 * Spherical polygon area approximation (returns area in square meters)
 * Algorithm adapted from common geodesic polygon area implementations.
 */
const R = 6378137; // Earth's radius in meters
const toRad = (deg) => (deg * Math.PI) / 180;

const calculatePolygonAreaMeters = (latLngs) => {
  if (!latLngs || latLngs.length < 3) return 0;
  // Ensure closed ring
  const pts = latLngs.map((p) => ({ lat: p.lat, lng: p.lng }));
  let area = 0;
  for (let i = 0, len = pts.length; i < len; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % len];
    area += toRad(p2.lng - p1.lng) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
  }
  area = (area * R * R) / 2.0;
  return Math.abs(area);
};

const convertAreaUnit = (areaM2, unit) => {
  switch (unit) {
    case "km2":
      return areaM2 / 1e6;
    case "ha":
      return areaM2 / 10000;
    case "ac":
      return areaM2 / 4046.8564224;
    default:
      return areaM2;
  }
};

const formatArea = (areaM2, unit) => {
  const converted = convertAreaUnit(areaM2, unit);
  const rounded = Math.round(converted * 100) / 100;
  switch (unit) {
    case "km2":
      return { value: rounded, unit: "km²", full: `${rounded} km²`, rawValue: converted };
    case "ha":
      return { value: rounded, unit: "ha", full: `${rounded} ha`, rawValue: converted };
    case "ac":
      return { value: rounded, unit: "ac", full: `${rounded} acres`, rawValue: converted };
    default:
      return { value: Math.round(areaM2 * 100) / 100, unit: "m²", full: `${Math.round(areaM2 * 100) / 100} m²`, rawValue: areaM2 };
  }
};

export const useAreaMeasurement = () => {
  const map = useMap();
  const measure = useSelector((s) => s.map.measure);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementResult, setMeasurementResult] = useState(null);

  const currentLayerRef = useRef(null);
  const tempLineRef = useRef(null);
  const vertexMarkersRef = useRef([]);
  const isMountedRef = useRef(true);

  const clickHandlerRef = useRef(null);
  const dblClickHandlerRef = useRef(null);
  const mouseMoveHandlerRef = useRef(null);
  const keydownHandlerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
      } catch {
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
    } catch {}
    vertexMarkersRef.current = [];
  }, [map]);

  const updateDisplay = useCallback(
    (layer, latLngs) => {
      if (!latLngs || latLngs.length < 3) {
        // not enough vertices for area
        if (isMountedRef.current) {
          setMeasurementResult(null);
        }
        if (layer.getTooltip && layer.getTooltip()) {
          layer.unbindTooltip();
        }
        return;
      }

      const areaMeters = calculatePolygonAreaMeters(latLngs);
      const formatted = formatArea(areaMeters, measure?.unit || "m2");
      const centroid = L.polygon(latLngs).getBounds().getCenter();

      if (layer.getTooltip()) {
        layer.setTooltipContent(formatted.full);
      } else {
        layer.bindTooltip(formatted.full, {
          permanent: true,
          direction: "center",
          className: "measure-tooltip",
        });
      }
      layer.openTooltip(centroid);

      if (isMountedRef.current) setMeasurementResult(formatted);
    },
    [measure?.unit]
  );

  const makePolygonPermanent = useCallback(() => {
    if (currentLayerRef.current) {
      currentLayerRef.current.setStyle({
        dashArray: null,
        color: "#1890ff",
        fillOpacity: 0.2,
      });
    }
  }, []);

  const cleanupMeasurement = useCallback(
    (removeCurrentLayer = false) => {
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

      if (tempLineRef.current && map.hasLayer(tempLineRef.current)) {
        try {
          map.removeLayer(tempLineRef.current);
        } catch {}
        tempLineRef.current = null;
      }

      if (removeCurrentLayer && currentLayerRef.current && map.hasLayer(currentLayerRef.current)) {
        try {
          map.removeLayer(currentLayerRef.current);
        } catch {}
        currentLayerRef.current = null;
        removeAllVertexMarkers();
      } else {
        makePolygonPermanent();
      }

      try {
        map.getContainer().style.cursor = "";
      } catch {}
    },
    [map, makePolygonPermanent, removeAllVertexMarkers]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        if (currentLayerRef.current && map.hasLayer(currentLayerRef.current)) {
          try {
            map.removeLayer(currentLayerRef.current);
          } catch {}
          currentLayerRef.current = null;
        }
        cleanupMeasurement(true);
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
    if (isMountedRef.current) setIsMeasuring(false);
  }, [cleanupMeasurement]);

  const clearAllMeasurements = useCallback(() => {
    cleanupMeasurement(true);
    if (isMountedRef.current) {
      setIsMeasuring(false);
      setMeasurementResult(null);
    }
  }, [cleanupMeasurement]);

  const startAreaMeasurement = useCallback(() => {
    if (!isMountedRef.current) return;
    setIsMeasuring(true);
    setMeasurementResult(null);

    // remove prior handlers if any
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

    // remove existing measurement
    if (currentLayerRef.current && map.hasLayer(currentLayerRef.current)) {
      try {
        map.removeLayer(currentLayerRef.current);
      } catch {}
      currentLayerRef.current = null;
    }
    removeAllVertexMarkers();

    const layerOptions = {
      color: "#3388ff",
      weight: 3,
      dashArray: "5,10",
      fillOpacity: 0.1,
    };

    const layer = L.polygon([], layerOptions).addTo(map);
    currentLayerRef.current = layer;

    const handleClick = (e) => {
      if (!currentLayerRef.current || !map.hasLayer(currentLayerRef.current) || !isMountedRef.current) return;
      try {
        const latlng = e.latlng;
        currentLayerRef.current.addLatLng(latlng);
        addVertexMarker(latlng);

        const latLngs = currentLayerRef.current.getLatLngs()[0] || currentLayerRef.current.getLatLngs();
        // handle both nested and flat latlng arrays
        const flat = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs;
        updateDisplay(currentLayerRef.current, flat);
        if (tempLineRef.current && map.hasLayer(tempLineRef.current)) {
          try {
            map.removeLayer(tempLineRef.current);
          } catch {}
          tempLineRef.current = null;
        }
      } catch (err) {}
    };

    const handleMouseMove = (e) => {
      if (!currentLayerRef.current || !map.hasLayer(currentLayerRef.current) || !isMountedRef.current) return;
      try {
        const latlng = e.latlng;
        const latLngs = currentLayerRef.current.getLatLngs()[0] || currentLayerRef.current.getLatLngs();
        const flat = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs;
        if (flat.length > 0) {
          const last = flat[flat.length - 1];
          const tempCoords = [...flat, latlng];
          if (!tempLineRef.current) {
            tempLineRef.current = L.polygon(tempCoords, {
              color: "#3388ff",
              weight: 3,
              dashArray: "5,10",
              interactive: false,
              pane: currentLayerRef.current.options.pane,
              fillOpacity: 0.05,
            }).addTo(map);
          } else {
            tempLineRef.current.setLatLngs([tempCoords]);
          }
        }
      } catch {}
    };

    const handleDoubleClick = (e) => {
      if (!currentLayerRef.current || !map.hasLayer(currentLayerRef.current) || !isMountedRef.current) {
        e.originalEvent?.stopPropagation();
        return false;
      }
      try {
        const latLngs = currentLayerRef.current.getLatLngs()[0] || currentLayerRef.current.getLatLngs();
        const flat = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs;
        if (flat.length >= 3) {
          addVertexMarker(flat[flat.length - 1]);
          updateDisplay(currentLayerRef.current, flat);
          makePolygonPermanent();

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

          if (tempLineRef.current && map.hasLayer(tempLineRef.current)) {
            try {
              map.removeLayer(tempLineRef.current);
            } catch {}
            tempLineRef.current = null;
          }

          try {
            map.getContainer().style.cursor = "";
          } catch {}

          if (isMountedRef.current) setIsMeasuring(false);
        }
        e.originalEvent?.stopPropagation();
        return false;
      } catch (err) {}
    };

    clickHandlerRef.current = handleClick;
    dblClickHandlerRef.current = handleDoubleClick;
    mouseMoveHandlerRef.current = handleMouseMove;
    keydownHandlerRef.current = handleKeyDown;

    map.on("click", handleClick);
    map.on("dblclick", handleDoubleClick);
    map.on("mousemove", handleMouseMove);
    document.addEventListener("keydown", handleKeyDown);

    try {
      map.getContainer().style.cursor = "crosshair";
    } catch {}

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
      if (tempLineRef.current && map.hasLayer(tempLineRef.current)) {
        try {
          map.removeLayer(tempLineRef.current);
        } catch {}
        tempLineRef.current = null;
      }
      try {
        map.getContainer().style.cursor = "";
      } catch {}
    };

    return cleanupSession;
  }, [map, removeAllVertexMarkers, updateDisplay, handleKeyDown, addVertexMarker, makePolygonPermanent]);

  useEffect(() => {
    let cleanup;
    if (isMeasuring && measure?.type === "area") {
      cleanup = startAreaMeasurement();
    }
    return () => {
      cleanup?.();
    };
  }, [isMeasuring, measure?.type]);

  useEffect(() => {
    try {
      const layer = currentLayerRef.current;
      if (!layer || !map?.hasLayer(layer)) return;
      const latLngs = layer.getLatLngs()[0] || layer.getLatLngs();
      const flat = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs;
      if (flat && flat.length >= 3) {
        updateDisplay(layer, flat);
      } else if (flat && flat.length < 3) {
        if (isMountedRef.current) setMeasurementResult(null);
        if (layer.getTooltip && layer.getTooltip()) layer.unbindTooltip();
      }
    } catch {}
  }, [measure?.unit, map, updateDisplay]);

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

export default useAreaMeasurement;