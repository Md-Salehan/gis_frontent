import React, { useState } from 'react';
import { Table, Tabs } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { toggleAttributeTable } from '../../store/slices/uiSlice';
import { setSelectedFeatures } from '../../store/slices/mapSlice';
import CustomDrawer from '../common/CustomDrawer';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

function AttributeTable() {
  const [activeTab, setActiveTab] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState({});
  const dispatch = useDispatch();
  const map = useMap();

  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  const isAttributeTableOpen = useSelector((state) => state.ui.isAttributeTableOpen);
  const selectedFeatures = useSelector((state) => state.map.selectedFeatures);

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

  // Handle row selection with single selection mode
  const handleRowSelection = (selectedKeys, selectedRows, layerId) => {
    // Clear all previous selections across all tabs
    const newSelectedRowKeys = {};
    
    // Only set the current selection if a row was actually selected
    if (selectedKeys.length > 0) {
      newSelectedRowKeys[layerId] = selectedKeys;
      
      // Get the selected feature
      const selectedRow = selectedRows[0];
      const selectedFeature = geoJsonLayers[selectedRow.layerId]?.geoJsonData.features[selectedRow.featureIndex];
      
      if (selectedFeature) {
        // Update selected features in Redux (only one feature)
        dispatch(setSelectedFeatures([selectedFeature]));

        // Fit map bounds to selected feature
        if (map) {
          try {
            const layer = L.geoJSON(selectedFeature);
            const bounds = layer.getBounds();
            if (bounds && bounds.isValid && bounds.isValid()) {
              map.flyToBounds(bounds, {
                padding: [50, 50],
                maxZoom: 16, // Changed from 1 to 16 for better zoom level
                duration: 0.7
              });
            }
          } catch (error) {
            console.error('Error fitting bounds:', error);
          }
        }
      }
    } else {
      // If no rows selected, clear all selections
      dispatch(setSelectedFeatures([]));
    }

    setSelectedRowKeys(newSelectedRowKeys);
  };

  // Handle individual row click for selection/deselection
  const handleRowClick = (record, layerId) => {
    const rowKey = record.key;
    const currentSelectedKeys = selectedRowKeys[layerId] || [];
    
    if (currentSelectedKeys.includes(rowKey)) {
      // Clicking selected row - deselect it
      handleRowSelection([], [], layerId);
    } else {
      // Select new row
      handleRowSelection([rowKey], [record], layerId);
    }
  };

  // Generate tabs from active layers
  const tabs = Object.entries(geoJsonLayers)
    .filter(([_, layerData]) => layerData && layerData?.geoJsonData.features)
    .map(([layerId, layerData]) => {
      const rowSelection = {
        type: 'radio',
        selectedRowKeys: selectedRowKeys[layerId] || [],
        onChange: (selectedKeys, selectedRows) => 
          handleRowSelection(selectedKeys, selectedRows, layerId),
      };

      return {
        key: layerId,
        label: layerData?.metaData?.layer?.layer_nm || layerId,
        children: (
          <Table 
            rowSelection={rowSelection}
            columns={getColumns(layerData?.geoJsonData?.features[0]?.properties, layerId)} 
            dataSource={getTableData(layerData?.geoJsonData?.features, layerId)}
            scroll={{ x: true, y: 600 }}
            size="small"
            pagination={{ pageSize: 10 }}
            onRow={(record) => ({
              onClick: () => handleRowClick(record, layerId),
              style: {
                cursor: 'pointer',
                backgroundColor: selectedRowKeys[layerId]?.includes(record.key) ? '#e6f7ff' : 'white',
              }
            })}
          />
        )
      };
    });

  const handleClose = () => {
    dispatch(toggleAttributeTable());
  };

  // Clear selection when changing tabs
  const handleTabChange = (activeKey) => {
    setActiveTab(activeKey);
    setSelectedRowKeys({});
    dispatch(setSelectedFeatures([]));
  };

  // Clear selection when drawer closes
  const handleAfterDrawerClose = () => {
    setSelectedRowKeys({});
    dispatch(setSelectedFeatures([]));
  };

  return (
    <CustomDrawer
      title="Attribute Table"
      placement="bottom"
      onClose={handleClose}
      afterOpenChange={(open) => {
        if (!open) {
          handleAfterDrawerClose();
        }
      }}
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
          onChange={handleTabChange}
          defaultActiveKey={tabs[0]?.key}
        />
      )}
    </CustomDrawer>
  );
}

export default AttributeTable;