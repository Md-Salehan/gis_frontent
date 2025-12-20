// ...existing code...
import React, { useEffect, useState } from "react";
import { Card, Spin, Alert } from "antd";
import { useSelector } from "react-redux";
import { useGetLegendMutation } from "../../store/api/legendApi";
import LeyerIcon from "./LeyerIcon";
import { getGeomFullForm } from "../../utils";

const Legend = ({ visible }) => {
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  const portal_id = useSelector((state) => state.map.portalId);
  const [getLegend, { isLoading }] = useGetLegendMutation();
  const [legendItems, setLegendItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchLegend() {
      setError(null);
      setLegendItems(null);
      const layerIds = Object.keys(geoJsonLayers || {});
      if (layerIds.length === 0) {
        // nothing to fetch
        return;
      }
      try {
        const payload = {
          portal_id: portal_id,
          layer_ids: layerIds,
          // options: { include_bbox: true, include_sld: true },
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
  }, [visible, geoJsonLayers, getLegend]);

  if (!visible) return null;

  return (
    <Card
      className="map-legend"
      style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        zIndex: 1000,
        backgroundColor: "white",
        maxWidth: "320px",
        maxHeight: "400px",
        overflowY: "auto",
      }}
      size="small"
      title="Legend"
    >
      {isLoading && (
        <div style={{ textAlign: "center", padding: 12 }}>
          <Spin />
        </div>
      )}

      {error && (
        <Alert
          type="error"
          message="Error"
          description={
            typeof error === "string" ? error : JSON.stringify(error)
          }
          showIcon
        />
      )}

      {Object.entries(geoJsonLayers || {}).length === 0 && (
        <div>No layer selected</div>
      )}

      {!isLoading && !error && legendItems && legendItems.length === 0 && (
        <div>No legend items found</div>
      )}

      {!isLoading &&
        !error &&
        legendItems &&
        legendItems.map((item) => (
          <div key={item.layerId} style={{ marginBottom: "12px" }}>
            {/* <h4 style={{ margin: "4px 0" }}>{item.name}</h4> */}
            {/* <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
              {item.description}
            </div> */}

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
                  {/* <div
                    style={{
                      width: '26px',
                      height: '18px',
                      backgroundColor: s.style?.fillColor || '#3388ff',
                      border: `2px solid ${s.style?.color || '#3388ff'}`,
                      opacity: typeof s.style?.opacity === 'number' ? s.style.opacity : 1,
                      borderRadius: '3px',
                    }}
                  /> */}
                  <LeyerIcon iconInfo={{ ...s.style, geom_typ: s.geom_type }} />
                  <div>
                    {/* <div style={{ fontSize: 13 }}>{s.label || s.value}</div> */}
                    {/* <div style={{ fontSize: 11, color: "#888" }}>
                      • Layer Id: {s.value}
                    </div>
                    <div style={{ fontSize: 11, color: "#888" }}>
                      • {getGeomFullForm(s.geom_type) || ""}
                    </div> */}
                    <div style={{ fontSize: 11, color: "#888" }}>
                      {s.label || ""}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ))}
    </Card>
  );
};

export default Legend;
// ...existing code...
