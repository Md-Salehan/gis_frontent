import { Drawer, Space, Button, Tooltip, theme } from "antd";
import React, { useState, useRef } from "react";

function MinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="11" width="16" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}
function MaxIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6L18 18M6 18L18 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  maximized = false,
  minimized = false,
}) {
  const {
    token: { colorPrimary, colorBorder, fontSizeLG },
  } = theme.useToken();

  // states for minimize / maximize
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  // store previous dimensions so "restore" works
  const prevSizeRef = useRef({ width, height });

  const isHorizontal = placement === "top" || placement === "bottom";
  // computed size depending on state and placement
  const computedWidth = !isHorizontal
    ? isMinimized
      ? 56
      : isMaximized
      ? "100%"
      : width
    : undefined;
  const computedHeight = isHorizontal
    ? isMinimized
      ? 56
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

  const handleToggleMinimize = () => {
    // If we're minimizing, store current size first
    if (!isMinimized) {
      prevSizeRef.current = {
        width: computedWidth === "100%" ? width : computedWidth,
        height: computedHeight === "100vh" ? height : computedHeight,
      };
      setIsMinimized(true);
      setIsMaximized(false);
    } else {
      // restore previous size
      setIsMinimized(false);
    }
  };

  const handleToggleMaximize = () => {
    if (!isMaximized) {
      // store previous real size before maximizing
      prevSizeRef.current = { width, height };
      setIsMaximized(true);
      setIsMinimized(false);
    } else {
      // restore
      setIsMaximized(false);
    }
  };

  // custom header element: title left, icons right
  const headerNode = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "8px 12px",
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
      >
        {title}
      </div>

      <Space size="small" align="center">
        {minimized && (
          <Tooltip title={isMinimized ? "Restore" : "Minimize"}>
            <Button
              type="text"
              onClick={handleToggleMinimize}
              size="small"
              aria-label={isMinimized ? "Restore" : "Minimize"}
              style={{ color: "inherit", padding: 6 }}
            >
              <MinIcon />
            </Button>
          </Tooltip>
        )}
        {maximized && (
          <Tooltip title={isMaximized ? "Restore size" : "Maximize"}>
            <Button
              type="text"
              onClick={handleToggleMaximize}
              size="small"
              aria-label={isMaximized ? "Restore size" : "Maximize"}
              style={{ color: "inherit", padding: 6 }}
            >
              <MaxIcon />
            </Button>
          </Tooltip>
        )}

        <Tooltip title="Close">
          <Button
            type="text"
            onClick={() => {
              // reset states when closing so it opens in normal state next time
              setIsMaximized(false);
              setIsMinimized(false);
              onClose && onClose();
            }}
            size="small"
            aria-label="Close"
            style={{ color: "inherit", padding: 6 }}
          >
            <CloseIcon />
          </Button>
        </Tooltip>
      </Space>
    </div>
  );

  return (
    <Drawer
      title={headerNode}
      placement={placement}
      onClose={() => {
        setIsMaximized(false);
        setIsMinimized(false);
        onClose && onClose();
      }}
      open={open}
      // pass computed dimensions; Drawer accepts number or string for width/height
      width={computedWidth}
      height={computedHeight}
      styles={styles ?? drawerStyles}
      mask={mask}
      afterOpenChange={afterOpenChange}
      // prevent body from rendering when minimized (keeps header only)
      bodyStyle={{
        display: isMinimized ? "none" : undefined,
        fontSize: fontSizeLG,
      }}
      headerStyle={{
        padding: 0,
        borderBottom: `1px solid ${colorPrimary}`,
      }}
      maskStyle={{
        backgroundColor: mask ? undefined : "transparent",
      }}
    >
      {children}
    </Drawer>
  );
}

export default CustomDrawer;
