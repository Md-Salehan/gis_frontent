import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Table, Tabs, Checkbox, Button, message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { toggleAttributeTable } from "../../store/slices/uiSlice";
import {
  setSelectedFeature,
  setMultiSelectedFeatures,
} from "../../store/slices/mapSlice";
import CustomDrawer from "../common/CustomDrawer";
import L from "leaflet";
import { useMap } from "react-leaflet";

function AttributeTable() {
  const dispatch = useDispatch();
  const map = useMap();

  const [activeTab, setActiveTab] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState({});
  // multi-select state: { [layerId]: Set<rowKey> }
  const [multiSelected, setMultiSelected] = useState({});

  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  const isAttributeTableOpen = useSelector(
    (state) => state.ui.isAttributeTableOpen
  );

  // Generate table columns from properties (returns columns for properties only)
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
      // single selection logic preserved
      const newSelectedRowKeys = {};

      if (selectedKeys.length > 0) {
        newSelectedRowKeys[layerId] = selectedKeys;

        const selectedRow = selectedRows[0];
        const selectedFeature =
          geoJsonLayers[layerId]?.geoJsonData.features[
            selectedRow.featureIndex
          ];
        console.log(selectedFeature, "selectedFeature1");
        if (selectedFeature) {
          dispatch(
            setSelectedFeature({
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
        dispatch(setSelectedFeature({ feature: [], metaData: null }));
      }

      setSelectedRowKeys(newSelectedRowKeys);
    },
    [dispatch, geoJsonLayers, map]
  );

  // Handle multi-select toggle for the custom column
  const toggleMultiSelect = useCallback((layerId, rowKey, checked) => {
    setMultiSelected((prev) => {
      const layerSet = new Set(prev[layerId] ? Array.from(prev[layerId]) : []);
      if (checked) {
        layerSet.add(rowKey);
      } else {
        layerSet.delete(rowKey);
      }
      return { ...prev, [layerId]: layerSet };
    });
  }, []);

  // Fit map to combined bounds of all multi-selected features
  const fitToMultiSelectedBounds = useCallback(() => {
    if (!map || !multiSelected || Object.keys(multiSelected).length === 0) {
      return;
    }

    try {
      let combinedBounds = null;

      Object.entries(multiSelected).forEach(([layerId, keySet]) => {
        const features = geoJsonLayers[layerId]?.geoJsonData?.features || [];
        Array.from(keySet || []).forEach((rowKey) => {
          const parts = rowKey.split("-");
          const idxStr = parts[parts.length - 1];
          const idx = Number(idxStr);
          const feature = features[idx];

          if (feature) {
            try {
              const layer = L.geoJSON(feature);
              const bounds = layer.getBounds();

              if (bounds && bounds.isValid && bounds.isValid()) {
                if (!combinedBounds) {
                  combinedBounds = bounds;
                } else {
                  combinedBounds.extend(bounds);
                }
              }
            } catch (error) {
              console.error(`Error processing feature at ${idx}:`, error);
            }
          }
        });
      });

      // Fit map to combined bounds if valid
      if (
        combinedBounds &&
        combinedBounds.isValid &&
        combinedBounds.isValid()
      ) {
        map.flyToBounds(combinedBounds, {
          padding: [10, 10],
          maxZoom: 16,
          duration: 0.7,
        });
      }
    } catch (error) {
      console.error("Error fitting to multi-selected bounds:", error);
    }
  }, [map, multiSelected, geoJsonLayers]);

  // sync multiSelected -> redux so SelectedFeaturesLayer can render them
  // and fit map to combined bounds
  useEffect(() => {
    const multiFeatures = [];
    Object.entries(multiSelected).forEach(([layerId, keySet]) => {
      const features = geoJsonLayers[layerId]?.geoJsonData?.features || [];
      const metaData = geoJsonLayers[layerId]?.metaData || {};
      Array.from(keySet || []).forEach((rowKey) => {
        const parts = rowKey.split("-");
        const idxStr = parts[parts.length - 1];
        const idx = Number(idxStr);
        const feature = features[idx];
        if (feature) {
          // include layerId to allow downstream logic if needed
          multiFeatures.push({ layerId, feature, metaData });
        }
      });
    });
    console.log(multiFeatures, "selectedFeature2");

    dispatch(setMultiSelectedFeatures(multiFeatures));

    // Fit map to combined bounds of all selected features
    if (multiFeatures.length > 0) {
      fitToMultiSelectedBounds();
    }
  }, [multiSelected, geoJsonLayers, dispatch, fitToMultiSelectedBounds]);

  // Prepare minimal list of layers (memoized)
  const layerEntries = useMemo(() => {
    return Object.entries(geoJsonLayers || {}).filter(
      ([_, layerData]) => layerData && layerData?.geoJsonData?.features
    );
  }, [geoJsonLayers]);

  // CSV export for all multi-selected features across layers
  const exportSelectedToCSV = useCallback(() => {
    // collect selected features
    const selected = [];
    Object.entries(multiSelected).forEach(([layerId, keySet]) => {
      const features = geoJsonLayers[layerId]?.geoJsonData?.features || [];
      Array.from(keySet || []).forEach((rowKey) => {
        const parts = rowKey.split("-");
        const idxStr = parts[parts.length - 1];
        const idx = Number(idxStr);
        const feature = features[idx];
        if (feature) {
          // Extract lat/long for point geometries
          let latitude = null;
          let longitude = null;
          let isPoint = false;

          if (
            feature.geometry?.type === "Point" &&
            feature.geometry?.coordinates
          ) {
            const [lng, lat] = feature.geometry.coordinates;
            longitude = lng;
            latitude = lat;
            isPoint = true;
          }

          selected.push({
            layerId,
            properties: feature.properties || {},
            latitude,
            longitude,
            isPoint,
          });
        }
      });
    });

    if (selected.length === 0) {
      message.info("No features selected for download");
      return;
    }

    // Check if any selected feature is a point
    const hasPointFeatures = selected.some((s) => s.isPoint);

    // build headers (union of all property keys)
    const headersSet = new Set();
    if (hasPointFeatures) {
      headersSet.add("latitude");
      headersSet.add("longitude");
    }
    selected.forEach((s) => {
      Object.keys(s.properties).forEach((k) => headersSet.add(k));
    });
    const headers = ["layerId", ...Array.from(headersSet)];

    // build CSV rows
    const escapeCell = (v) => {
      if (v === undefined || v === null) return "";
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvRows = [];
    csvRows.push(headers.join(","));
    selected.forEach((s) => {
      const row = headers.map((h) => {
        if (h === "layerId") return escapeCell(s.layerId);
        if (h === "latitude") return escapeCell(s.latitude);
        if (h === "longitude") return escapeCell(s.longitude);
        return escapeCell(s.properties[h]);
      });
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `features_${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [multiSelected, geoJsonLayers]);

  // Add validation helper
  const getRowBackgroundColor = useCallback(
    (record, layerId) => {
      const isMultiSelected = multiSelected[layerId]?.has(record.key);
      const isSingleSelected = selectedRowKeys[layerId]?.includes(record.key);

      if (isMultiSelected) return "#fff7cc";
      if (isSingleSelected) return "#ffece6ff";
      return "white";
    },
    [multiSelected, selectedRowKeys]
  );

  // Build Tabs items but only render Table for the active tab (lazy)
  const tabs = useMemo(() => {
    return layerEntries.map(([layerId, layerData]) => {
      const label = layerData?.metaData?.layer?.layer_nm || layerId;

      const rowSelection = {
        title: "Find",
        type: "radio",
        selectedRowKeys: selectedRowKeys[layerId] || [],
        onChange: (selectedKeys, selectedRows) =>
          handleRowSelection(selectedKeys, selectedRows, layerId),
      };

      // custom select column (checkboxes) for multi-select
      const selectColumn = {
        title: "Select",
        key: `${layerId}-select`,
        width: 80,
        fixed: "left",
        render: (text, record) => {
          const checked =
            (multiSelected[layerId] &&
              multiSelected[layerId].has(record.key)) ||
            false;
          return (
            <Checkbox
              checked={checked}
              onChange={(e) => {
                toggleMultiSelect(layerId, record.key, e.target.checked);
              }}
            />
          );
        },
      };

      const propertyColumns = getColumns(
        layerData?.geoJsonData?.features[0]?.properties
      );

      const columns = [selectColumn, ...propertyColumns];

      // Only create the heavy Table when this tab is active
      const children =
        activeTab === layerId ? (
          <Table
            rowKey="key"
            rowSelection={rowSelection}
            columns={columns}
            dataSource={getTableData(layerData?.geoJsonData?.features, layerId)}
            scroll={{ x: true, y: 600 }}
            size="small"
            pagination={{ pageSize: 5 }}
            onRow={(record) => ({
              // onClick: () => handleRowClick(record, layerId),
              style: {
                cursor: "pointer",
                backgroundColor: getRowBackgroundColor(record, layerId),
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
    multiSelected,
    toggleMultiSelect,
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
      setMultiSelected({}); // clear multi-select on tab change for clarity
      dispatch(setSelectedFeature({ feature: [], metaData: null }));
      dispatch(setMultiSelectedFeatures([])); // clear multi-selected in redux
    },
    [dispatch]
  );

  // Clear selection when drawer closes
  const handleAfterDrawerClose = useCallback(() => {
    setSelectedRowKeys({});
    setMultiSelected({});
    dispatch(setSelectedFeature({ feature: [], metaData: null }));
    dispatch(setMultiSelectedFeatures([]));
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
      {/* top-right download button */}
      <div
        style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}
      >
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={exportSelectedToCSV}
        >
          Download CSV
        </Button>
      </div>

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
