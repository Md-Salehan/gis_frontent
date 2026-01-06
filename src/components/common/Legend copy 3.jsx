import React, { useEffect, useState, useRef, useCallback } from "react";
import { Card, Spin, Alert } from "antd";
import { useSelector } from "react-redux";
import { useGetLegendMutation } from "../../store/api/legendApi";
import LeyerIcon from "./LeyerIcon";
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

  // Helper: clamp
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Helper: find nearest positioned parent (offsetParent fallback)
  const findPositionedParent = (el) => {
    // Prefer offsetParent, otherwise walk up until a non-static ancestor
    let p = el.offsetParent || el.parentElement;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      if (cs && cs.position && cs.position !== "static") return p;
      p = p.parentElement;
    }
    return document.body;
  };

  // Compute & set initial position + clamp existing pos on resize
  useEffect(() => {
    if (!visible) return;
    const el = legendRef.current;
    if (!el) return;

    const parent = findPositionedParent(el);
    parentRef.current = parent;

    const margin = 20;

    const computeAndSet = () => {
      const parentRect = parent.getBoundingClientRect();
      const legendRect = el.getBoundingClientRect();

      const maxX = Math.max(0, parentRect.width - legendRect.width - margin);
      const maxY = Math.max(0, parentRect.height - legendRect.height - margin);

      setPos((prev) => {
        // if not moved yet, initialize bottom-right with margin
        if (prev.x == null && prev.y == null) {
          return { x: maxX, y: maxY };
        }
        // clamp existing pos so it never goes outside after a resize
        const clampedX = clamp(prev.x, 0, Math.max(0, parentRect.width - legendRect.width));
        const clampedY = clamp(prev.y, 0, Math.max(0, parentRect.height - legendRect.height));
        return { x: clampedX, y: clampedY };
      });
    };

    // Observe size changes of parent and legend
    const ro = new ResizeObserver(() => computeAndSet());
    try {
      ro.observe(parent);
      ro.observe(el);
    } catch (e) {
      // Ignore if ResizeObserver isn't available
    }
    // initial run
    requestAnimationFrame(computeAndSet);
    window.addEventListener("resize", computeAndSet);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", computeAndSet);
    };
  }, [visible, legendItems]);

  // Pointer handlers
  const onPointerDown = useCallback(
    (e) => {
      // Only primary button (touch/pointer ok)
      if (e.button && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const el = legendRef.current;
      const parent = parentRef.current || (el && findPositionedParent(el));
      if (!el || !parent) return;

      const legendRect = el.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      const margin = 20;

      const maxX = Math.max(0, parentRect.width - legendRect.width - margin);
      const maxY = Math.max(0, parentRect.height - legendRect.height - margin);

      startRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: pos.x != null ? pos.x : maxX,
        origY: pos.y != null ? pos.y : maxY,
        legendW: legendRect.width,
        legendH: legendRect.height,
        parentW: parentRect.width,
        parentH: parentRect.height,
        pointerId: e.pointerId,
      };

      try {
        el.setPointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }
      setIsDragging(true);
      // visually helpful cursor on body
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    },
    [pos]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!isDragging || !startRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      const s = startRef.current;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      const newX = clamp(s.origX + dx, 0, Math.max(0, s.parentW - s.legendW));
      const newY = clamp(s.origY + dy, 0, Math.max(0, s.parentH - s.legendH));
      setPos({ x: newX, y: newY });
    },
    [isDragging]
  );

  const onPointerUp = useCallback(
    (e) => {
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
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    },
    [isDragging]
  );

  // Attach global handlers only while dragging
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

  // Keyboard accessibility: arrow nudging
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

  // Use transform for smoother updates; fall back to bottom-right when not moved
  const transformStyle =
    pos.x != null && pos.y != null
      ? { left: 0, top: 0, transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`, willChange: "transform" }
      : { right: 20, bottom: 20 };

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
          aria-hidden="true"
        >
          <DragOutlined />
          Legend
        </div>
      }
      style={{
        position: "absolute",
        zIndex: 1000,
        ...transformStyle,
        backgroundColor: "white",
        maxWidth: "320px",
        maxHeight: "400px",
        overflowY: "auto",
        touchAction: "none",
        userSelect: isDragging ? "none" : "auto",
      }}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="Map legend (draggable)"
      aria-grabbed={isDragging}
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