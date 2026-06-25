// Movable.jsx
import React, { useState, useRef, useCallback, useEffect } from "react";
import { CloseOutlined, DragOutlined } from "@ant-design/icons";
import { Tag } from "antd";

const Movable = ({
  children,
  isMovable = false,
  title = "",
  icon = null,
  titleFontSize = 14,
  width = "auto",
  height = "auto",
  className = "",
  style = {},
  onPositionChange,
  initialPosition = { x: null, y: null },
  onClose = null,
}) => {
  // State
  const [pos, setPos] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const containerRef = useRef(null);
  const parentRef = useRef(null);
  const startRef = useRef(null);

  // Clamp helper
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Find nearest positioned parent
  const findPositionedParent = (el) => {
    let p = el.offsetParent || el.parentElement;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      if (cs && cs.position && cs.position !== "static") return p;
      p = p.parentElement;
    }
    return document.body;
  };

  // Initialize position
  useEffect(() => {
    if (!isMovable || !containerRef.current) return;

    const el = containerRef.current;
    const parent = findPositionedParent(el);
    parentRef.current = parent;

    const computeAndSet = () => {
      const parentRect = parent.getBoundingClientRect();
      const legendRect = el.getBoundingClientRect();

      const maxX = Math.max(0, parentRect.width - legendRect.width - 50);
      const maxY = Math.max(0, parentRect.height - legendRect.height - 100);

      setPos((prev) => {
        if (prev.x == null && prev.y == null) {
          return { x: maxX, y: maxY };
        }
        const clampedX = clamp(
          prev.x,
          0,
          Math.max(0, parentRect.width - legendRect.width),
        );
        const clampedY = clamp(
          prev.y,
          0,
          Math.max(0, parentRect.height - legendRect.height),
        );
        return { x: clampedX, y: clampedY };
      });
    };

    const ro = new ResizeObserver(() => computeAndSet());
    ro.observe(parent);
    ro.observe(el);

    requestAnimationFrame(computeAndSet);
    window.addEventListener("resize", computeAndSet);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", computeAndSet);
    };
  }, [isMovable]);

  // Notify parent of position changes
  useEffect(() => {
    if (onPositionChange && pos.x !== null && pos.y !== null) {
      onPositionChange(pos);
    }
  }, [pos, onPositionChange]);

  // Pointer handlers
  const onPointerDown = useCallback(
    (e) => {
      if (!isMovable) return;
      if (e.button && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      console.log("log calling onPointerDown");

      const el = containerRef.current;
      const parent = parentRef.current || (el && findPositionedParent(el));
      if (!el || !parent) return;

      const legendRect = el.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      const margin = 10;

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
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    },
    [isMovable, pos],
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
    [isDragging],
  );

  const onPointerUp = useCallback(
    (e) => {
      if (!isDragging) return;
      e.preventDefault();
      e.stopPropagation();

      const el = containerRef.current;
      try {
        if (
          el &&
          startRef.current &&
          startRef.current.pointerId === e.pointerId
        ) {
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
    [isDragging],
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
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
      return;
    e.preventDefault();
    e.stopPropagation();
    const step = e.shiftKey ? 20 : 8;
    const parent = parentRef.current;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const el = legendRef.current;
    const legendRect = el
      ? el.getBoundingClientRect()
      : { width: 0, height: 0 };
    const current = {
      x: pos.x ?? parentRect.width - legendRect.width - 20,
      y: pos.y ?? parentRect.height - legendRect.height - 20,
    };
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

  // Transform style
  const transformStyle =
    pos.x != null && pos.y != null
      ? {
          left: 0,
          top: 0,
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
          willChange: "transform",
        }
      : { right: "1%", bottom: "8%" };

  if (!icon && !title && !children) return null;
  return (
    <div
      ref={containerRef}
      className={`movable-container ${className}`}
      style={{
        position: "absolute",
        zIndex: 1000,
        ...transformStyle,
        ...style,
        touchAction: "none",
        userSelect: isDragging ? "none" : "auto",
      }}
      tabIndex={isMovable ? 0 : undefined}
      onKeyDown={isMovable ? onKeyDown : undefined}
      aria-label={isMovable ? `${title} (draggable)` : title}
      aria-grabbed={isDragging}
    >
      {/* Title/Drag handle */}

      <div
        
        style={{
          cursor: isDragging ? "grabbing" : isMovable ? "grab" : "default",
          display: "flex",
          alignItems: "center",
          userSelect: "none",
          fontSize: titleFontSize,
          padding: "0px 12px",
          backgroundColor: "white",
          borderBottom: "1px solid #f0f0f0",
          width: "100%",
          justifyContent: "space-between",
          height: "54px"
        }}
        aria-hidden="true"
      >
        <div onPointerDown={isMovable ? onPointerDown : undefined} style={{ display: "flex", alignItems: "center", height: "100%", flex: 1 }}>
          <div style={{ marginRight: "5px" }}>{icon ?? ""} </div>
          <div style={{ marginBottom: "5px" }}>{title ?? ""}</div>
        </div>
        {onClose ? (
          <Tag
            onClick={onClose}
            style={{  cursor: "pointer" }}
            color="red"
          >
            <CloseOutlined />
          </Tag>
        ) : (
          ""
        )}
      </div>

      {/* Children content */}
      {children && (
        <div style={{ padding: "12px", backgroundColor: "white" }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default Movable;
