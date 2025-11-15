import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Table, Tabs } from "antd";
import { useSelector, useDispatch } from "react-redux";
import { toggleAttributeTable } from "../../store/slices/uiSlice";
import { setSelectedFeatures } from "../../store/slices/mapSlice";
import CustomDrawer from "../common/CustomDrawer";
import L from "leaflet";
import { useMap } from "react-leaflet";

function AttributeTable() {
  const [activeTab, setActiveTab] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState({});
  const dispatch = useDispatch();
  const map = useMap();

  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  const isAttributeTableOpen = useSelector(
    (state) => state.ui.isAttributeTableOpen
  );

  // Generate table columns from properties
  const getColumns = useCallback((properties) => {
    if (!properties || Object.keys(properties).length === 0) return [];

    return Object.keys(properties).map((key) => ({
      title: key.charAt(0).toUpperCase() + key.slice(1),
      dataIndex: key,
      key: key,
      sorter: (a, b) => {
        if (typeof a[key] === "number" && typeof b[key] === "number") {
          return a[key] - b[key];
        }
        return String(a[key] ?? "").localeCompare(String(b[key] ?? ""));
      },
    }));
  }, []);

  // Generate table data from features
  const getTableData = useCallback((features, layerId) => {
    if (!features || features.length === 0) return [];

    return features.map((feature, index) => ({
      key: `${layerId}-${index}`,
      featureIndex: index,
      ...feature.properties,
    }));
  }, []);

  // Handle row selection with single selection mode
  const handleRowSelection = useCallback(
    (selectedKeys, selectedRows, layerId) => {
      console.log("Row selection changed:", selectedKeys, selectedRows, layerId);
      const newSelectedRowKeys = {};

      if (selectedKeys.length > 0) {
        newSelectedRowKeys[layerId] = selectedKeys;

        const selectedRow = selectedRows[0];
        const selectedFeature =
          geoJsonLayers[layerId]?.geoJsonData.features[
            selectedRow.featureIndex
          ];

        if (selectedFeature) {
          dispatch(
            setSelectedFeatures({
              feature: [selectedFeature],
              metaData: geoJsonLayers[layerId]?.metaData,
            })
          );

          if (map) {
            try {
              const layer = L.geoJSON(selectedFeature);
              const bounds = layer.getBounds();
              if (bounds && bounds.isValid && bounds.isValid()) {
                map.flyToBounds(bounds, {
                  padding: [50, 50],
                  maxZoom: 16,
                  duration: 0.7,
                });
              }
            } catch (error) {
              console.error("Error fitting bounds:", error);
            }
          }
        }
      } else {
        dispatch(setSelectedFeatures({ feature: [], metaData: null }));
      }

      setSelectedRowKeys(newSelectedRowKeys);
    },
    [dispatch, geoJsonLayers, map]
  );

  // Handle individual row click for selection/deselection
  const handleRowClick = useCallback(
    (record, layerId) => {
      console.log("Row clicked:", record, layerId);
      
      const rowKey = record.key;
      const currentSelectedKeys = selectedRowKeys[layerId] || [];

      if (currentSelectedKeys.includes(rowKey)) {
        handleRowSelection([], [], layerId);
      } else {
        handleRowSelection([rowKey], [record], layerId);
      }
    },
    [selectedRowKeys, handleRowSelection]
  );

  // Prepare minimal list of layers (memoized)
  const layerEntries = useMemo(() => {
    return Object.entries(geoJsonLayers || {}).filter(
      ([_, layerData]) => layerData && layerData?.geoJsonData?.features
    );
  }, [geoJsonLayers]);

  // Build Tabs items but only render Table for the active tab (lazy)
  const tabs = useMemo(() => {
    return layerEntries.map(([layerId, layerData]) => {
      const label = layerData?.metaData?.layer?.layer_nm || layerId;

      const rowSelection = {
        type: "radio",
        selectedRowKeys: selectedRowKeys[layerId] || [],
        onChange: (selectedKeys, selectedRows) =>
          handleRowSelection(selectedKeys, selectedRows, layerId),
      };

      // Only create the heavy Table when this tab is active
      const children =
        activeTab === layerId ? (
          <Table
            rowKey="key"
            rowSelection={rowSelection}
            columns={getColumns(
              layerData?.geoJsonData?.features[0]?.properties
            )}
            dataSource={getTableData(layerData?.geoJsonData?.features, layerId)}
            scroll={{ x: true, y: 600 }}
            size="small"
            pagination={{ pageSize: 5 }}
            onRow={(record) => ({
              // onClick: () => handleRowClick(record, layerId),
              style: {
                cursor: "pointer",
                backgroundColor: selectedRowKeys[layerId]?.includes(record.key)
                  ? "#e6f7ff"
                  : "white",
              },
            })}
          />
        ) : null;

      return {
        key: layerId,
        label,
        children,
      };
    });
  }, [
    layerEntries,
    activeTab,
    selectedRowKeys,
    getColumns,
    getTableData,
    handleRowSelection,
    handleRowClick,
  ]);

  // Ensure there's a sensible default active tab
  useEffect(() => {
    if (!activeTab && tabs.length > 0) {
      setActiveTab(tabs[0].key);
    }
  }, [tabs, activeTab]);

  const handleClose = useCallback(() => {
    dispatch(toggleAttributeTable());
  }, [dispatch]);

  // Clear selection when changing tabs
  const handleTabChange = useCallback(
    (activeKey) => {
      setActiveTab(activeKey);
      setSelectedRowKeys({});
      dispatch(setSelectedFeatures({ feature: [], metaData: null }));
    },
    [dispatch]
  );

  // Clear selection when drawer closes
  const handleAfterDrawerClose = useCallback(() => {
    setSelectedRowKeys({});
    dispatch(setSelectedFeatures({ feature: [], metaData: null }));
  }, [dispatch]);

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
          activeKey={activeTab}
          destroyOnHidden={true} // unmount inactive panes
          animated={false} // disable animation for snappier switch
        />
      )}
    </CustomDrawer>
  );
}

export default AttributeTable;
