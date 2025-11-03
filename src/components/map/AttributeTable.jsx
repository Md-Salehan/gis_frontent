import React, { useState } from 'react';
import { Table, Tabs, Drawer, theme } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { toggleAttributeTable } from '../../store/slices/uiSlice';

function AttributeTable() {
  const [activeTab, setActiveTab] = useState(null);
  const dispatch = useDispatch();
  const {
    token: { colorPrimary, colorBorder, fontSizeLG },
  } = theme.useToken();

  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  const isAttributeTableOpen = useSelector((state) => state.ui.isAttributeTableOpen);

  // Generate table columns from properties
  const getColumns = (properties) => {
    if (!properties || Object.keys(properties).length === 0) return [];
    
    return Object.keys(properties).map(key => ({
      title: key.charAt(0).toUpperCase() + key.slice(1),
      dataIndex: key,
      key: key,
      sorter: (a, b) => {
        if (typeof a[key] === 'number') {
          return a[key] - b[key];
        }
        return String(a[key]).localeCompare(String(b[key]));
      },
    }));
  };

  // Generate table data from features
  const getTableData = (features) => {
    if (!features || features.length === 0) return [];
    
    return features.map((feature, index) => ({
      key: index,
      ...feature.properties
    }));
  };

  // Generate tabs from active layers
  const tabs = Object.entries(geoJsonLayers)
    .filter(([_, layerData]) => layerData && layerData.features)
    .map(([layerId, layerData]) => ({
      key: layerId,
      label: layerData.name || layerId,
      children: (
        <Table 
          columns={getColumns(layerData.features[0]?.properties)} 
          dataSource={getTableData(layerData.features)}
          scroll={{ x: true, y: 600 }}
          size="small"
        />
      )
    }));

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


  const handleClose = () => {
    dispatch(toggleAttributeTable());
  };

  return (
    <Drawer
      title="Attribute Table"
      placement="bottom"
      onClose={handleClose}
      open={isAttributeTableOpen}
      height="40vh"
      styles={drawerStyles}
    >
      {tabs.length === 0 ? (
        <div>No active layers with attributes to display</div>
      ) : (
        <Tabs
          type="card"
          items={tabs}
          onChange={setActiveTab}
          defaultActiveKey={tabs[0]?.key}
        />
      )}
    </Drawer>
  );
}

export default AttributeTable;