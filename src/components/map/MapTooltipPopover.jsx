import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Card, Table, Button, Pagination } from "antd";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useSelector, useDispatch } from "react-redux";
import { ZoomInOutlined, CloseOutlined } from "@ant-design/icons";
import { setSelectedFeature } from "../../store/slices/mapSlice";

const PAGE_SIZE_DEFAULT = 5;

const MapTooltipPopover = () => {
  const map = useMap();
  const dispatch = useDispatch();
  const feature = useSelector((s) => s.map.selectedFeature);

  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const [pageSize] = useState(PAGE_SIZE_DEFAULT);
  const [page, setPage] = useState(1);

  // Build properties list (generic key/value) skipping geometry
  const properties = useMemo(() => {
    if (!feature?.properties) return [];
    return Object.entries(feature.properties)
      .filter(([k]) => k !== "geometry")
      .map(([k, v], i) => ({
        key: `${i}`,
        name: k,
        value:
          v === null || v === undefined
            ? ""
            : typeof v === "object"
            ? JSON.stringify(v)
            : String(v),
      }));
  }, [feature]);

  // compute screen position when selected feature changes
  useEffect(() => {
    if (!feature) {
      setVisible(false);
      return;
    }

    let latlng = null;
    try {
      if (feature.geometry?.type === "Point" && Array.isArray(feature.geometry.coordinates)) {
        const [lng, lat] = feature.geometry.coordinates;
        latlng = L.latLng(lat, lng);
      } else {
        // try computing bounds center for non-points
        const layer = L.geoJSON(feature);
        const bounds = layer.getBounds();
        if (bounds && bounds.isValid && bounds.isValid()) {
          latlng = bounds.getCenter();
        }
      }
    } catch (err) {
      latlng = null;
    }

    if (!latlng) latlng = map.getCenter();

    const p = map.latLngToContainerPoint(latlng);
    setPos({ left: p.x, top: p.y });
    setPage(1);
    setVisible(true);
  }, [feature, map]);

  const close = useCallback(() => {
    setVisible(false);
    dispatch(setSelectedFeature(null));
  }, [dispatch]);

  const handleZoom = useCallback(() => {
    if (!feature) return;
    try {
      if (feature.geometry?.type === "Point") {
        const [lng, lat] = feature.geometry.coordinates;
        map.setView([lat, lng], Math.min(16, map.getZoom() || 16));
      } else {
        const layer = L.geoJSON(feature);
        const bounds = layer.getBounds();
        if (bounds && bounds.isValid && bounds.isValid()) {
          map.fitBounds(bounds, { maxZoom: 16 });
        }
      }
    } catch (err) {
      // ignore
    }
  }, [feature, map]);

  if (!visible || !feature) return null;

  // table columns and pagination
  const columns = [
    {
      title: "Key",
      dataIndex: "name",
      key: "name",
      width: "40%",
      render: (text) => <strong>{text}</strong>,
    },
    { title: "Value", dataIndex: "value", key: "value" },
  ];

  const start = (page - 1) * pageSize;
  const pageData = properties.slice(start, start + pageSize);

  // portal container = map DOM element (position coordinates relative to map container)
  const container = map.getContainer();

  const cardStyle = {
    position: "absolute",
    transform: "translate(-50%, -100%)", // anchor above point
    left: `${pos.left}px`,
    top: `${pos.top}px`,
    zIndex: 65535,
    minWidth: 320,
    maxWidth: 420,
    maxHeight: 360,
    overflow: "auto",
    boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
    borderRadius: 6,
  };

  const title =
    feature?.properties?.label_text || feature?.properties?.name || "Feature";

  return createPortal(
    <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
      <Card
        size="small"
        title={title}
        extra={
          <span>
            <Button
              size="small"
              icon={<ZoomInOutlined />}
              onClick={handleZoom}
              style={{ marginRight: 8 }}
            />
            <Button size="small" icon={<CloseOutlined />} onClick={close} />
          </span>
        }
      >
        <Table
          columns={columns}
          dataSource={pageData}
          pagination={false}
          size="small"
          rowKey="key"
          showHeader={false}
        />
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={properties.length}
            onChange={(p) => setPage(p)}
            size="small"
            simple
          />
        </div>
      </Card>
    </div>,
    container
  );
};

export default MapTooltipPopover;