import React, { useEffect, useRef, useState } from "react";
import { Drawer, theme, Button, Tooltip, Space } from "antd";
import { X, Maximize, Minimize } from "lucide-react";

/**
 * Global minimized registry (keeps order of minimized drawers so they don't overlap).
 * Stored on window so multiple instances share it.
 */
if (typeof window !== "undefined" && !window.__CUSTOM_DRAWER_MINIMIZED__) {
  window.__CUSTOM_DRAWER_MINIMIZED__ = [];
}

/**
 * Utility helpers for the registry
 */
const registerMinimized = (id) => {
  const arr = window.__CUSTOM_DRAWER_MINIMIZED__;
  if (!arr.includes(id)) arr.push(id);
  window.dispatchEvent(new CustomEvent("custom-drawer-minimized-change"));
};
const unregisterMinimized = (id) => {
  const arr = window.__CUSTOM_DRAWER_MINIMIZED__;
  const idx = arr.indexOf(id);
  if (idx > -1) arr.splice(idx, 1);
  window.dispatchEvent(new CustomEvent("custom-drawer-minimized-change"));
};
const getMinimizedIndex = (id) =>
  (window.__CUSTOM_DRAWER_MINIMIZED__ || []).indexOf(id);

function CustomDrawer({
  title,
  placement = "right",
  height,
  open,
  onClose,
  styles = null,
  children,
  mask = true,
  width = 400,
  afterOpenChange,
  // NEW: enable the custom header (title left, icons right) only when explicitly requested
  enableCustomHeader = false,
  // optional stable id to identify drawer across renders; if not provided we generate one
  drawerId,
  // preserve any other Drawer props (e.g. getContainer)
  ...rest
}) {
  const {
    token: { colorPrimary, colorBorder, fontSizeLG },
  } = theme.useToken();

  // unique id for registry & eventing
  const idRef = useRef(
    drawerId || `custom-drawer-${Math.random().toString(36).slice(2, 9)}`
  );

  // minimize/maximize internal state (does not close the drawer or call onClose)
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // keep previous size so "restore" returns to previous width/height
  const prevSizeRef = useRef({ width, height });

  // index among minimized drawers (used to offset minimized buttons so they don't overlap)
  const [minimizedIndex, setMinimizedIndex] = useState(() =>
    getMinimizedIndex(idRef.current)
  );

  useEffect(() => {
    const handler = () => {
      setMinimizedIndex(getMinimizedIndex(idRef.current));
    };
    // listen to registry changes
    window.addEventListener("custom-drawer-minimized-change", handler);
    // also set initial index
    handler();
    return () =>
      window.removeEventListener("custom-drawer-minimized-change", handler);
  }, []);

  // compute width/height when minimized/maximized to pass into Drawer
  const isHorizontal = placement === "top" || placement === "bottom";

  const computedWidth = !isHorizontal
    ? isMinimized
      ? 56 // narrow pill when minimized on vertical drawers
      : isMaximized
      ? "100%"
      : width
    : undefined;

  const computedHeight = isHorizontal
    ? isMinimized
      ? 48 // short bar when minimized on horizontal drawers
      : isMaximized
      ? "100vh"
      : height
    : undefined;

  const drawerStyles = {
    mask: {
      backgroundColor: "transparent",
      backdropFilter: "none",
    },
    content: {
      // boxShadow: "-10px 0 10px #666",
    },
    header: {
      borderBottom: `1px solid ${colorPrimary}`,
      padding: 0,
    },
    body: {
      fontSize: fontSizeLG,
    },
    footer: {
      borderTop: `1px solid ${colorBorder}`,
    },
  };

  // Toggle minimize: keep drawer "open" but shrink it and hide body
  const handleToggleMinimize = () => {
    if (!isMinimized) {
      // store current sizes for restore
      prevSizeRef.current = {
        width: computedWidth === "100%" ? width : computedWidth,
        height: computedHeight === "100vh" ? height : computedHeight,
      };
      setIsMinimized(true);
      setIsMaximized(false);
      registerMinimized(idRef.current);
    } else {
      // restoring from minimized
      setIsMinimized(false);
      unregisterMinimized(idRef.current);
    }
  };

  // Toggle maximize: expands to full available dimension for placement
  const handleToggleMaximize = () => {
    if (!isMaximized) {
      prevSizeRef.current = { width, height };
      setIsMaximized(true);
      // if maximized while minimized, remove minimized registry entry
      if (isMinimized) {
        unregisterMinimized(idRef.current);
        setIsMinimized(false);
      }
    } else {
      setIsMaximized(false);
      // restore minimized state is false here
    }
  };

  // Close: call provided onClose and reset internal states & registry
  const handleClose = () => {
    setIsMaximized(false);
    if (isMinimized) {
      unregisterMinimized(idRef.current);
      setIsMinimized(false);
    }
    onClose && onClose();
  };

  // Build header when enabled. Title on left; actions on the right.
  const headerNode = enableCustomHeader ? (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "6px 12px",
        gap: 8,
      }}
    >
      <div
        style={{
          fontWeight: 600,
          color: colorPrimary,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={typeof title === "string" ? title : undefined}
      >
        {title}
      </div>

      <Space size="small" align="center">
        <Tooltip title={isMinimized ? "Restore" : "Minimize"}>
          <Button
            type="text"
            onClick={handleToggleMinimize}
            size="small"
            aria-label={isMinimized ? "Restore" : "Minimize"}
            style={{ color: "inherit", padding: 6 }}
          >
            <Minimize size={14} />
          </Button>
        </Tooltip>

        <Tooltip title={isMaximized ? "Restore size" : "Maximize"}>
          <Button
            type="text"
            onClick={handleToggleMaximize}
            size="small"
            aria-label={isMaximized ? "Restore size" : "Maximize"}
            style={{ color: "inherit", padding: 6 }}
          >
            <Maximize size={14} />
          </Button>
        </Tooltip>

        <Tooltip title="Close">
          <Button
            type="text"
            onClick={handleClose}
            size="small"
            aria-label="Close"
            style={{ color: "inherit", padding: 6 }}
          >
            <X size={14} />
          </Button>
        </Tooltip>
      </Space>
    </div>
  ) : (
    title
  );

  // When minimized we hide mask to avoid blocking interactions with the page
  const effectiveMask = isMinimized ? false : mask;

  // body style: hide content when minimized
  const bodyStyle = {
    display: isMinimized ? "none" : undefined,
    fontSize: fontSizeLG,
  };

  // header style override to remove default padding when we provided custom headerNode
  const headerStyle = {
    padding: 0,
    borderBottom: `1px solid ${colorPrimary}`,
  };

  // Position for minimized pill so multiple minimized drawers don't overlap.
  // We anchor minimized pills at the bottom-left of the viewport and offset horizontally.
  const minimizedPillStyle = (() => {
    if (!isMinimized) return undefined;
    const PILL_WIDTH = 200;
    const PILL_HEIGHT = 40;
    const GAP = 8;
    const index = minimizedIndex >= 0 ? minimizedIndex : 0;
    const left = GAP + index * (PILL_WIDTH + GAP);
    return {
      position: "fixed",
      left,
      bottom: GAP,
      width: PILL_WIDTH,
      height: PILL_HEIGHT,
      zIndex: 1200, // above page but below modal-level if any
      boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
      borderRadius: 6,
      background: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "6px 10px",
      gap: 8,
    };
  })();

  // Render minimized pill as a floating control so users can restore/maximize without obstruction.
  // We only render it when drawer is open and minimized (parent 'open' is still true).
  const minimizedPill =
    isMinimized && open ? (
      <div style={minimizedPillStyle}>
        <div
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: 600,
          }}
          title={typeof title === "string" ? title : undefined}
        >
          {title}
        </div>

        <Space size="small" align="center">
          <Tooltip title="Maximize">
            <Button
              type="text"
              onClick={() => {
                handleToggleMaximize();
              }}
              size="small"
              aria-label="Maximize"
              style={{ padding: 6 }}
            >
              <Maximize size={14} />
            </Button>
          </Tooltip>

          <Tooltip title="Restore">
            <Button
              type="text"
              onClick={() => {
                // restore (un-minimize)
                handleToggleMinimize();
              }}
              size="small"
              aria-label="Restore"
              style={{ padding: 6 }}
            >
              <Minimize size={14} />
            </Button>
          </Tooltip>

          <Tooltip title="Close">
            <Button
              type="text"
              onClick={() => {
                // close via provided handler
                handleClose();
              }}
              size="small"
              aria-label="Close"
              style={{ padding: 6 }}
            >
              <X size={14} />
            </Button>
          </Tooltip>
        </Space>
      </div>
    ) : null;

  return (
    <>
      <Drawer
        title={headerNode}
        placement={placement}
        onClose={handleClose}
        open={open}
        height={computedHeight}
        styles={styles ?? drawerStyles}
        mask={effectiveMask}
        width={computedWidth}
        afterOpenChange={afterOpenChange}
        bodyStyle={bodyStyle}
        headerStyle={headerStyle}
        maskStyle={{
          backgroundColor: effectiveMask ? undefined : "transparent",
        }}
        {...rest}
      >
        {children}
      </Drawer>

      {/* render minimized floating pill to allow restore/maximize when minimized */}
      {minimizedPill}
    </>
  );
}

export default CustomDrawer;
