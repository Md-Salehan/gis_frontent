import React, { useEffect, useState, useRef, useCallback } from "react";
import { Card, Spin, Alert } from "antd";
import { useSelector } from "react-redux";
import { useGetLegendMutation } from "../../store/api/legendApi";
import LeyerIcon from "./LeyerIcon";
import { getGeomFullForm } from "../../utils";
import { DragOutlined } from "@ant-design/icons";

const Legend = ({ visible }) => {
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  const portal_id = useSelector((state) => state.portal.portalId);
  const [getLegend, { isLoading }] = useGetLegendMutation();
  const [legendItems, setLegendItems] = useState(null);
  const [error, setError] = useState(null);

  // Drag/position state
  const legendRef = useRef(null);
  const parentRef = useRef(null);
  const startRef = useRef(null); // { startX, startY, origX, origY, legendW, legendH, parentW, parentH }
  const [pos, setPos] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);

  // Fetch legend when visible and layers exist
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

  // Compute & clamp helper
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  // Initialize position and keep within bounds when size changes
  useEffect(() => {
    if (!visible) return;
    const el = legendRef.current;
    if (!el) return;
    const parent = el.parentElement || el.offsetParent || document.body;
    parentRef.current = parent;

    const computeAndSetInitial = () => {
      const parentRect = parent.getBoundingClientRect();
      const legendRect = el.getBoundingClientRect();
      const margin = 20;
      const initX = clamp(parentRect.width - legendRect.width - margin, 0, parentRect.width);
      const initY = clamp(parentRect.height - legendRect.height - margin, 0, parentRect.height);
      setPos((p) => {
        // don't overwrite if user already dragged
        if (p.x !== null && p.y !== null) return p;
        return { x: initX, y: initY };
      });
    };

    // Use ResizeObserver to respond to content or parent changes
    const ro = new ResizeObserver(() => computeAndSetInitial());
    ro.observe(parent);
    ro.observe(el);
    // initial run
    requestAnimationFrame(computeAndSetInitial);
    const onWinResize = () => computeAndSetInitial();
    window.addEventListener("resize", onWinResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWinResize);
    };
  }, [visible, legendItems]); // recalc if legend content changes size

  // Pointer event handlers
  const onPointerDown = useCallback((e) => {
    // only primary button
    if (e.button && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const el = legendRef.current;
    const parent = parentRef.current || (el && el.parentElement);
    if (!el || !parent) return;

    const legendRect = el.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();

    startRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX:
        pos.x !== null
          ? pos.x
          : clamp(parentRect.width - legendRect.width - 20, 0, parentRect.width),
      origY:
        pos.y !== null
          ? pos.y
          : clamp(parentRect.height - legendRect.height - 20, 0, parentRect.height),
      legendW: legendRect.width,
      legendH: legendRect.height,
      parentW: parentRect.width,
      parentH: parentRect.height,
      pointerId: e.pointerId,
    };

    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignore if not supported
    }
    setIsDragging(true);
  }, [pos]);

  const onPointerMove = useCallback((e) => {
    if (!isDragging || !startRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const s = startRef.current;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    const newX = clamp(s.origX + dx, 0, Math.max(0, s.parentW - s.legendW));
    const newY = clamp(s.origY + dy, 0, Math.max(0, s.parentH - s.legendH));
    setPos({ x: newX, y: newY });
  }, [isDragging]);

  const onPointerUp = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    const el = legendRef.current;
    try {
      if (el && startRef.current && startRef.current.pointerId === e.pointerId) {
        el.releasePointerCapture(e.pointerId);
      }
    } catch (err) {
      // ignore
    }
    startRef.current = null;
    setIsDragging(false);
  }, [isDragging]);

  // Attach document-level listeners while dragging to ensure consistent behavior
  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [isDragging, onPointerMove, onPointerUp]);

  // Keyboard accessibility: allow nudging with arrow keys
  const onKeyDown = (e) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    const step = e.shiftKey ? 20 : 8;
    const parent = parentRef.current;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const el = legendRef.current;
    const legendRect = el ? el.getBoundingClientRect() : { width: 0, height: 0 };
    const current = { x: pos.x ?? parentRect.width - legendRect.width - 20, y: pos.y ?? parentRect.height - legendRect.height - 20 };
    let nx = current.x;
    let ny = current.y;
    if (e.key === "ArrowUp") ny = current.y - step;
    if (e.key === "ArrowDown") ny = current.y + step;
    if (e.key === "ArrowLeft") nx = current.x - step;
    if (e.key === "ArrowRight") nx = current.x + step;
    nx = clamp(nx, 0, Math.max(0, parentRect.width - legendRect.width));
    ny = clamp(ny, 0, Math.max(0, parentRect.height - legendRect.height));
    setPos({ x: nx, y: ny });
  };

  if (!visible) return null;

  return (
    <Card
      ref={legendRef}
      className="map-legend"
      size="small"
      title={
        <div
          onPointerDown={onPointerDown}
          style={{
            cursor: isDragging ? "grabbing" : "grab",
            display: "flex",
            alignItems: "center",
            gap: 8,
            userSelect: "none",
          }}
        >
          <DragOutlined />
          Legend
        </div>
      }
      style={{
        position: "absolute",
        zIndex: 1000,
        left: pos.x != null ? pos.x : undefined,
        top: pos.y != null ? pos.y : undefined,
        right: pos.x == null ? 20 : undefined,
        bottom: pos.y == null ? 20 : undefined,
        backgroundColor: "white",
        maxWidth: "320px",
        maxHeight: "400px",
        overflowY: "auto",
        touchAction: "none", // prevent touch scrolling while dragging
        userSelect: isDragging ? "none" : "auto",
      }}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="Map legend (draggable)"
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
          description={typeof error === "string" ? error : JSON.stringify(error)}
          showIcon
        />
      )}

      {Object.entries(geoJsonLayers || {}).length === 0 && <div>No layer selected</div>}

      {!isLoading && !error && legendItems && legendItems.length === 0 && <div>No legend items found</div>}

      {!isLoading &&
        !error &&
        legendItems &&
        legendItems.map((item) => (
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
                    <div style={{ fontSize: 11, color: "#888" }}>{s.label || ""}</div>
                  </div>
                </div>
              ))}
          </div>
        ))}
    </Card>
  );
};

export default Legend;