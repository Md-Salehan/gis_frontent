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
} from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  setGeoJsonLayer,
  setPortalId,
  toggleSidebar,
} from "../../store/slices/mapSlice";
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
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LeftOutlined,
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
import {
  toggleAttributeTable,
  toggleLegend,
  toggleMeasure,
  togglePrintModal,
} from "../../store/slices/uiSlice";
const { Sider, Content, Header, Footer } = Layout;

const GisDashboard = memo(() => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const { portal_id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { sidebarCollapsed } = useSelector((state) => state.map);

  useEffect(() => {
    if (portal_id) {
      dispatch(setPortalId(portal_id));
    }
  }, [portal_id]);

  useEffect(() => {
    document.title = "GIS Dashboard";
  }, []);

  useEffect(() => {
    initGeoman();
  }, []);

  const items = [
    {
      key: "0",
      icon: React.createElement(TableProperties),
      label: "Attributes",
      onClick: () => dispatch(toggleAttributeTable()),
    },
    {
      key: "1",
      icon: React.createElement(DraftingCompass),
      label: "Measure",
      onClick: () => dispatch(toggleMeasure()),
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
      onClick: () => dispatch(togglePrintModal()),
    },
    {
      key: "5",
      icon: React.createElement(Download),
      label: "Download",
    },
  ];

  const handleSiderCollapse = (collapsed) => {
    dispatch(toggleSidebar());
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
        <Sidebar />
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
                <Tooltip title="Back">
                  <Button
                    type="text"
                    onClick={() => navigate(-1)}
                    icon={<LeftOutlined />}
                  />
                </Tooltip>
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
            <MapPanel />
          </div>

          
        </Content>

        <FooterBar />
      </Layout>
    </Layout>
  );
});

GisDashboard.displayName = "GisDashboard";
export default GisDashboard;
