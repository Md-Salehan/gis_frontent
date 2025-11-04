import React, { useState } from 'react';
import { Table, Tabs } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { toggleAttributeTable } from '../../store/slices/uiSlice';
import { setSelectedFeatures } from '../../store/slices/mapSlice'; // Add this import
import CustomDrawer from '../common/CustomDrawer';

function AttributeTable() {
  const [activeTab, setActiveTab] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState({});
  const dispatch = useDispatch();

  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  const isAttributeTableOpen = useSelector((state) => state.ui.isAttributeTableOpen);

  // Generate table columns from properties
  const getColumns = (properties, layerId) => {
    if (!properties || Object.keys(properties).length === 0) return [];
    
    const baseColumns = Object.keys(properties).map(key => ({
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

    return baseColumns;
  };

  // Generate table data from features
  const getTableData = (features, layerId) => {
    if (!features || features.length === 0) return [];
    
    return features.map((feature, index) => ({
      key: `${layerId}-${index}`,
      featureIndex: index,
      layerId: layerId,
      ...feature.properties
    }));
  };

  // Handle row selection
  const handleRowSelection = (selectedKeys, selectedRows, layerId) => {
    setSelectedRowKeys(prev => ({
      ...prev,
      [layerId]: selectedKeys
    }));

    // Create selected features layer data
    const selectedFeatures = selectedRows.map(row => {
      const layerData = geoJsonLayers[row.layerId];
      return layerData.features[row.featureIndex];
    });

    dispatch(setSelectedFeatures(selectedFeatures));
  };

  // Generate tabs from active layers
  const tabs = Object.entries(geoJsonLayers)
    .filter(([_, layerData]) => layerData && layerData.features)
    .map(([layerId, layerData]) => {
      const rowSelection = {
        selectedRowKeys: selectedRowKeys[layerId] || [],
        onChange: (selectedKeys, selectedRows) => 
          handleRowSelection(selectedKeys, selectedRows, layerId),
      };

      return {
        key: layerId,
        label: layerData.name || layerId,
        children: (
          <Table 
            rowSelection={rowSelection}
            columns={getColumns(layerData.features[0]?.properties, layerId)} 
            dataSource={getTableData(layerData.features, layerId)}
            scroll={{ x: true, y: 600 }}
            size="small"
            pagination={{ pageSize: 10 }}
          />
        )
      };
    });

  const handleClose = () => {
    console.log("handleClose");
    dispatch(toggleAttributeTable());
  };

  return (
    <CustomDrawer
      title="Attribute Table"
      placement="bottom"
      onClose={handleClose}
      open={isAttributeTableOpen}
      height="40vh"
      mask={false}
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
    </CustomDrawer>
  );
}

export default AttributeTable;