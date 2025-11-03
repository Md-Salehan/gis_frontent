import React, { useState } from 'react';
import { Table, Tabs } from 'antd';
import { useSelector } from 'react-redux';

function AttributeTable() {
  const [activeTab, setActiveTab] = useState(null);
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);

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

  if (tabs.length === 0) {
    return <div>No active layers with attributes to display</div>;
  }

  return (
    <Tabs
      type="card"
      items={tabs}
      onChange={setActiveTab}
      defaultActiveKey={tabs[0]?.key}
    />
  );
}

export default AttributeTable;