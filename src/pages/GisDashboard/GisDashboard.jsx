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
  resetMapState,
  setGeoJsonLayer,
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
  Proportions,
  TableProperties,
  Layers,
  CircleDot,
  CircleDashed,
  Dice5,
  Calculator,
  MousePointerClick,
  Link 
} from "lucide-react";
import { initGeoman } from "../../utils/map/geoman-setup";
import FooterBar from "./components/FooterBar";
import {
  toggleAttributeTable,
  toggleBuffer,
  toggleCentroidModal,
  toggleCountPointsModal,
  toggleDataJoinModal,
  toggleDistanceMatrixModal,
  toggleFeatureSelection,
  toggleIdentify,
  toggleLegend,
  toggleMeasure,
  togglePrintModal,
  toggleSpatialJoinModal,
} from "../../store/slices/uiSlice";
import {
  resetActivePortalDetails,
  setPortalId,
  setPortalIdByName,
} from "../../store/slices/portalSlice";
import { MinimizedBar, SpatialAnalysis, UserMenu } from "../../components";
import { set } from "lodash";
const { Sider, Content, Header, Footer } = Layout;

const GisDashboard = memo(() => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const { portal_url } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { sidebarCollapsed } = useSelector((state) => state.map);
  const uiStates = useSelector((state) => state.ui);

  const [selectedMenu, setSelectedMenu] = useState([]);

  useEffect(() => {
    if (portal_url) {
      dispatch(setPortalIdByName("/" + portal_url));
    }
  }, [portal_url]);

  useEffect(() => {
    document.title = "GIS Dashboard";
    return () => {
      dispatch(resetActivePortalDetails());
      dispatch(resetMapState());
    };
  }, []);

  useEffect(() => {
    initGeoman();
  }, []);

  const handleMenuSelect = useCallback(() => {
    const selected = [];

    if (uiStates.isAttributeTableOpen) selected.push("0");
    if (uiStates.isMeasureOpen) selected.push("1");
    if (uiStates.isLegendVisible) selected.push("2");
    if (uiStates.isPrintModalOpen) selected.push("4");
    if (uiStates.isBufferOpen) selected.push("5");
    if (uiStates.isFeatureSelectionEnabled) selected.push("6");
    if (uiStates.isIdentifyOpen) selected.push("7");
    return selected;
  }, [uiStates]);

  useEffect(() => {
    setSelectedMenu(handleMenuSelect());
  }, [uiStates, handleMenuSelect]);

  const spatialAnalysisItems = [
    {
      key: "centroids",
      label: "Centroid",
      onClick: () => {
        dispatch(toggleCentroidModal({ state: true }));
      },
      icon: React.createElement(CircleDot),
    },
    {
      key: "countpoints",
      label: "Count Points",
      onClick: () => {
        dispatch(toggleCountPointsModal({ state: true }));
      },
      icon: React.createElement(Dice5),
    },
    {
      key: "distancematrix",
      label: "Distance Matrix",
      onClick: () => {
        dispatch(toggleDistanceMatrixModal({ state: true }));
      },
      icon: React.createElement(Calculator),
    },
    {
      key: "spatialjoin",
      label: "Spatial Join",
      onClick: () => {
        dispatch(toggleSpatialJoinModal({ state: true }));
      },
      icon: React.createElement(CircleDashed),
    },
    {
      key: "datajoin",
      label: "Data Join",
      onClick: () => {
        dispatch(toggleDataJoinModal({ state: true }));
      },
      icon: React.createElement(Link),
    },
  ];

  const items = [
    {
      key: "0",
      icon: React.createElement(TableProperties),
      label: "Attributes",
      onClick: () => {
        // handleMenuClick("0");
        // dispatch(toggleLegend(false));
        // dispatch(togglePrintModal(false));
        // dispatch(toggleMeasure(false));
        dispatch(toggleBuffer({ state: false }));
        dispatch(toggleAttributeTable({ state: true }));
      },
    },
    {
      key: "1",
      icon: React.createElement(DraftingCompass),
      label: "Measure",
      onClick: () => {
        // handleMenuClick("1");
        dispatch(toggleMeasure());
      },
    },
    {
      key: "2",
      icon: React.createElement(Info),
      label: "Legends",
      onClick: () => {
        // handleMenuClick("2");
        dispatch(toggleLegend());
      },
    },
    {
      key: "3",
      icon: React.createElement(Eraser),
      label: "Clear",
      onClick: () => window.location.reload(),
    },
    {
      key: "4",
      icon: React.createElement(Printer),
      label: "Print",
      onClick: () => {
        // handleMenuClick("4");
        // dispatch(toggleAttributeTable(false));
        // dispatch(toggleMeasure(false));
        // dispatch(toggleBuffer(false));
        dispatch(togglePrintModal());
      },
    },
    {
      key: "5",
      icon: React.createElement(Proportions),
      label: "Buffer",
      onClick: () => {
        // handleMenuClick("5");
        dispatch(toggleAttributeTable({ state: false }));
        // dispatch(togglePrintModal(false));
        // dispatch(toggleMeasure(false));
        dispatch(toggleBuffer({ state: true }));
      },
    },
    {
      key: "6",
      icon: React.createElement(MousePointerClick),
      label: "Selection",
      onClick: () => {
        // handleMenuClick("6");
        dispatch(toggleFeatureSelection());
      },
    },
    {
      key: "7",
      icon: React.createElement(Info),
      label: "Identify",
      onClick: () => {
        // handleMenuClick("7");
        dispatch(toggleIdentify());
      },
    },
    {
      key: "8",
      icon: React.createElement(Layers),
      label: "Spatial Analysis",
      children: spatialAnalysisItems, // This creates sub-menu items
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
            <Col span={22}>
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <Tooltip title="Back">
                  <Button
                    type="text"
                    onClick={() => {
                      navigate(-1);
                      // dispatch(resetMapState());
                    }}
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

                <Menu
                  mode="horizontal"
                  items={items}
                  selectable={true}
                  selectedKeys={selectedMenu}
                  multiple={true}
                  // onSelect={(e) => setSelectedMenu([e.key])}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    borderBottom: "none",
                    background: "transparent",
                  }}
                />
              </div>
            </Col>

            <Col span={2} style={{ textAlign: "right" }}>
              <UserMenu />
            </Col>
          </Row>
        </Header>

        <Content style={{ margin: "24px 16px 0" }}>
          <div
            style={{
              width: "100%",
              height: "100%",
              // padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <MapPanel />
            <SpatialAnalysis />
            {/* <MinimizedBar /> */}
          </div>
        </Content>

        <FooterBar />
      </Layout>
    </Layout>
  );
});

GisDashboard.displayName = "GisDashboard";
export default GisDashboard;
