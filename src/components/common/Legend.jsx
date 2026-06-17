// Legend.jsx
import React, { useEffect, useState, useRef } from "react";
import { Spin, Alert } from "antd";
import { useSelector } from "react-redux";
import { useGetLegendMutation } from "../../store/api/legendApi";
import LeyerIcon from "./LeyerIcon";
import Movable from "./Movable";

const Legend = ({
  visible,
  isMovable = false,
  width,
  height,
  titleFontSize,
  labelFontSize,
  getDimentions,
}) => {
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  const portal_id = useSelector((state) => state.portal.portalId);
  const [getLegend, { isLoading }] = useGetLegendMutation();
  const [legendItems, setLegendItems] = useState(null);
  const [error, setError] = useState(null);
  const legendContentRef = useRef(null);
  const [position, setPosition] = useState({ x: null, y: null });

  // Fetch legend data only
  useEffect(() => {
    let mounted = true;
    async function fetchLegend() {
      setError(null);
      setLegendItems(null);
      const layerIds = Object.keys(geoJsonLayers || {});
      if (layerIds.length === 0) return;

      try {
        const payload = {
          portal_id: portal_id,
          layer_ids: layerIds,
        };
        const res = await getLegend(payload).unwrap();
        if (mounted) {
          setLegendItems(res?.data || null);
        }
      } catch (err) {
        if (mounted) {
          setError(err?.data || err?.message || "Failed to load legend");
        }
      }
    }

    if (visible) {
      fetchLegend();
    }

    return () => {
      mounted = false;
    };
  }, [visible, geoJsonLayers, getLegend, portal_id]);

  // Handle dimensions callback
  useEffect(() => {
    let t;
    if (getDimentions && legendContentRef.current && !width && !height && legendItems) {
      const rect = legendContentRef.current.getBoundingClientRect();
      t = setTimeout(() => {
        getDimentions?.({
          width: Math.ceil(rect.width),
          height: Math.ceil(rect.height),
        });
      }, 500);
    }
    return () => clearTimeout(t);
  }, [getDimentions, width, height, legendItems]);

  const handlePositionChange = (newPosition) => {
    setPosition(newPosition);
    // Optionally persist position to localStorage or parent
  };

  if (!visible) return null;

  // Render legend content (pure data rendering)
  const renderLegendContent = () => {
    if (isLoading) {
      return (
        <div style={{ textAlign: "center", padding: 12 }}>
          <Spin />
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          type="error"
          message="Error"
          description={typeof error === "string" ? error : JSON.stringify(error)}
          showIcon
        />
      );
    }

    if (Object.entries(geoJsonLayers || {}).length === 0) {
      return <div>No layer selected</div>;
    }

    if (legendItems && legendItems.length === 0) {
      return <div>No legend items found</div>;
    }

    return legendItems?.map((item) => (
      <div key={item.layerId} style={{ marginBottom: "12px" }}>
        {Array.isArray(item.symbols) &&
          item.symbols.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: 6,
              }}
            >
              <LeyerIcon iconInfo={{ ...s.style, geom_typ: s.geom_type }} />
              <div>
                <div style={{ fontSize: labelFontSize ?? 11, color: "#888" }}>
                  {s.label || ""}
                </div>
              </div>
            </div>
          ))}
      </div>
    ));
  };



  // Movable version
  return (
    <Movable
      isMovable={isMovable}
      title="Legend"
      titleFontSize={titleFontSize}
      width={width}
      height={height}
      onPositionChange={handlePositionChange}
      initialPosition={position}
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        maxHeight: "50vh",
        width: width ?? "auto",
        height: height ?? "auto",
      }}
    >
      <div ref={legendContentRef}>
        {renderLegendContent()}
      </div>
    </Movable>
  );
};

export default Legend;