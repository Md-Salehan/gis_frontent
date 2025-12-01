import { Drawer, theme } from "antd";
import React from "react";

function CustomDrawer({
  title,
  placement,
  height,
  open,
  onClose,
  styles = null,
  children,
  mask = true,
  width = 400,
  afterOpenChange,
}) {
  const {
    token: { colorPrimary, colorBorder, fontSizeLG },
  } = theme.useToken();

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
    },
    body: {
      fontSize: fontSizeLG,
    },
    footer: {
      borderTop: `1px solid ${colorBorder}`,
    },
  };

  return (
    <Drawer
      title={title}
      placement={placement}
      onClose={onClose}
      open={open}
      height={height}
      styles={styles ?? drawerStyles}
      mask={mask}
      width={width}
      afterOpenChange={afterOpenChange}
    >
      {children}
    </Drawer>
  );
}

export default CustomDrawer;
