import React, { memo, useCallback, useEffect, useState } from "react";
import {
  Layout,
  Menu,
  theme,
  Input,
  Button,
  Avatar,
  Space,
  Row,
  Col,
  Tooltip,
  Drawer,
} from "antd";
import { useTheme } from "antd-style";

import { useDispatch, useSelector } from "react-redux";
import { setGeoJsonLayer, toggleSidebar } from "../../store/slices/mapSlice";
import "./GisDashboard.css";
import Sidebar from "./components/Sidebar/Sidebar";
import MapPanel from "./components/MapPanel/MapPanel";

//leaflet CSS
import "leaflet/dist/leaflet.css";
// mini map CSS
import "leaflet-minimap/dist/Control.MiniMap.min.css";
import "leaflet-minimap";
// Geoman Css
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

import {
  UploadOutlined,
  UserOutlined,
  VideoCameraOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import {
  Download,
  DraftingCompass,
  Eraser,
  Info,
  Printer,
  TableProperties,
} from "lucide-react";
import { initGeoman } from "../../utils/map/geoman-setup";
import FooterBar from "./components/FooterBar";
import { toggleLegend } from "../../store/slices/uiSlice";
import { AttributeTable } from "../../components";
// import { basicDrawerStyles } from "../../utils";

const { Sider, Content, Header, Footer } = Layout;

// const items = [DraftingCompass, VideoCameraOutlined, UploadOutlined, UserOutlined].map((icon, index) => ({
//   key: String(index + 1),
//   icon: React.createElement(icon),
//   label: `nav ${index + 1}`,
// }));

const GisDashboard = memo(() => {
  const {
    token: {
      colorBgContainer,
      borderRadiusLG,
      colorPrimary,
      colorBorder,
      fontSizeLG,
    },
  } = theme.useToken();

  const dispatch = useDispatch();
  const { geoJsonLayers, sidebarCollapsed } = useSelector((state) => state.map);
  const [drawer, setDrawer] = useState({
    open: false,
    body: <h2>Drawer Content</h2>,
    title: "",
    footer: null,
  });

  // Stable callback for layer toggling
  const handleLayerToggle = useCallback(
    (layerId, geoJsonData, isActive) => {
      dispatch(setGeoJsonLayer({ layerId, geoJsonData, isActive }));
    },
    [dispatch]
  );

  useEffect(() => {
    document.title = "GIS Dashboard";
  }, []);

  useEffect(() => {
    initGeoman();
  }, []);

  const handleSiderCollapse = (collapsed) => {
    dispatch(toggleSidebar());
  };

  const items = [
    {
      key: "0",
      icon: React.createElement(TableProperties),
      label: "Attributes",
      onClick: () =>
        toggleDrawer(
          true,
          <AttributeTable />,
          "Attribute Table",
          null
        ),
    },
    {
      key: "1",
      icon: React.createElement(DraftingCompass),
      label: "Measure",
    },
    {
      key: "2",
      icon: React.createElement(Info),
      label: "Legends",
      onClick: () => dispatch(toggleLegend()),
    },
    {
      key: "3",
      icon: React.createElement(Eraser),
      label: "Clear",
    },
    {
      key: "4",
      icon: React.createElement(Printer),
      label: "Print",
    },
    {
      key: "5",
      icon: React.createElement(Download),
      label: "Download",
    },
  ];

  const toggleDrawer = (open, body = null, title = "", footer = "") => {
    setDrawer({ open, body, title, footer });
  };

  const basicDrawerStyles = {
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
    <Layout className="gis-layout" style={{ minHeight: "100vh" }}>
      <Sider
        style={{ backgroundColor: "white" }}
        width={400}
        breakpoint="lg"
        collapsed={sidebarCollapsed}
        collapsedWidth={0}
        onCollapse={handleSiderCollapse}
      >
        <Sidebar handleLayerToggle={handleLayerToggle} />
      </Sider>

      <Layout>
        <Header style={{ padding: "0 16px", background: colorBgContainer }}>
          <Row
            align="middle"
            justify="space-between"
            wrap={false}
            style={{ width: "100%" }}
          >
            <Col>
              <Space align="center" size={12}>
                <Tooltip
                  title={sidebarCollapsed ? "Open sidebar" : "Collapse sidebar"}
                >
                  <Button
                    type="text"
                    onClick={() => dispatch(toggleSidebar())}
                    icon={
                      sidebarCollapsed ? (
                        <MenuUnfoldOutlined />
                      ) : (
                        <MenuFoldOutlined />
                      )
                    }
                  />
                </Tooltip>

                <div>
                  <Menu
                    mode="horizontal"
                    items={items}
                    selectable={false}
                    style={{ borderBottom: "none", background: "transparent" }}
                  />
                </div>
              </Space>
            </Col>

            <Col>
              <Space align="middle">
                <Avatar icon={<UserOutlined />} />
              </Space>
            </Col>
          </Row>
        </Header>

        <Content style={{ margin: "24px 16px 0" }}>
          <div
            style={{
              width: "100%",
              height: "100%",
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <MapPanel geoJsonLayers={geoJsonLayers} />

            <Drawer
              title={drawer.title ?? "Drawer Title"}
              placement="right"
              footer={drawer.footer ?? ""}
              onClose={() => toggleDrawer(false, null, "", "")}
              open={drawer.open}
              styles={basicDrawerStyles}
            >
              <div>{drawer.body}</div>
            </Drawer>
          </div>
        </Content>

        <FooterBar />
      </Layout>
    </Layout>
  );
});

GisDashboard.displayName = "GisDashboard";
export default GisDashboard;
