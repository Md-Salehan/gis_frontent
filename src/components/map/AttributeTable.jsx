import React, { useState, useMemo, useCallback, useEffect, memo } from "react";
import { Table, Tabs, Checkbox, Button, message, Space, Tooltip } from "antd";
import { DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import {
  setSelectedFeature,
  setMultiSelectedFeatures,
} from "../../store/slices/mapSlice";
import L from "leaflet";
import { useMap } from "react-leaflet";

// Constants
const DEBUG = process.env.NODE_ENV === "development";
const MAP_FIT_OPTIONS = {
  padding: [50, 50],
  maxZoom: 16,
  duration: 0.7,
};

function AttributeTable({ csvDownloader = true, clearDataOnTabChange = true }) {
  const dispatch = useDispatch();
  const map = useMap();

  const [activeTab, setActiveTab] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState({});
  const [multiSelected, setMultiSelected] = useState({});

  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);

  // ============================================
  // Utility: Parse row key to feature index
  // ============================================
  const parseRowKeyToIndex = useCallback((rowKey) => {
    const parts = rowKey.split("-");
    const idxStr = parts[parts.length - 1];
    return Number(idxStr);
  }, []);

  // ============================================
  // Get feature by layerId and rowKey
  // ============================================
  const getFeatureByRowKey = useCallback(
    (layerId, rowKey) => {
      const features = geoJsonLayers[layerId]?.geoJsonData?.features || [];
      const idx = parseRowKeyToIndex(rowKey);
      return features[idx] || null;
    },
    [geoJsonLayers, parseRowKeyToIndex]
  );

  // ============================================
  // Table Utilities
  // ============================================
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

  const getTableData = useCallback((features, layerId) => {
    if (!features || features.length === 0) return [];

    return features.map((feature, index) => ({
      key: `${layerId}-${index}`,
      featureIndex: index,
      ...feature.properties,
    }));
  }, []);

  // ============================================
  // Selection Handlers
  // ============================================
  const handleViewFeature = useCallback(
    (record, layerId) => {
      const selectedFeature =
        geoJsonLayers[layerId]?.geoJsonData.features[record.featureIndex];

      if (selectedFeature) {
        dispatch(
          setSelectedFeature({
            feature: [selectedFeature],
            metaData: {
              ...geoJsonLayers[layerId]?.metaData,
              selectedKeys: [record.key],
            },
          })
        );

        if (map) {
          try {
            const layer = L.geoJSON(selectedFeature);
            const bounds = layer.getBounds();
            if (bounds && bounds.isValid && bounds.isValid()) {
              map.flyToBounds(bounds, MAP_FIT_OPTIONS);
            }
          } catch (error) {
            console.error("Error fitting bounds:", error);
          }
        }

        // Update selected row keys
        setSelectedRowKeys({
          [layerId]: [record.key],
        });
      }
    },
    [dispatch, geoJsonLayers, map]
  );

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

  // ============================================
  // Map Bounds Fitting
  // ============================================
  const fitToMultiSelectedBounds = useCallback(() => {
    if (!map) {
      DEBUG && console.warn("Map instance not available");
      return;
    }

    if (!multiSelected || Object.keys(multiSelected).length === 0) {
      return;
    }

    try {
      let combinedBounds = null;

      Object.entries(multiSelected).forEach(([layerId, keySet]) => {
        const features = geoJsonLayers[layerId]?.geoJsonData?.features || [];
        Array.from(keySet || []).forEach((rowKey) => {
          const idx = parseRowKeyToIndex(rowKey);
          const feature = features[idx];

          if (feature) {
            try {
              const layer = L.geoJSON(feature);
              const bounds = layer.getBounds();

              if (bounds?.isValid?.()) {
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

      if (combinedBounds?.isValid?.()) {
        map.flyToBounds(combinedBounds, MAP_FIT_OPTIONS);
      }
    } catch (error) {
      console.error("Error fitting to multi-selected bounds:", error);
    }
  }, [map, multiSelected, geoJsonLayers, parseRowKeyToIndex]);

  // ============================================
  // Redux Sync & Auto-fit
  // ============================================
  useEffect(() => {
    const multiFeatures = [];
    Object.entries(multiSelected).forEach(([layerId, keySet]) => {
      const features = geoJsonLayers[layerId]?.geoJsonData?.features || [];
      const metaData = geoJsonLayers[layerId]?.metaData || {};
      Array.from(keySet || []).forEach((rowKey) => {
        const idx = parseRowKeyToIndex(rowKey);
        const feature = features[idx];
        if (feature) {
          multiFeatures.push({ layerId, feature, metaData });
        }
      });
    });

    DEBUG && console.log("multiFeatures:", multiFeatures);

    dispatch(setMultiSelectedFeatures(multiFeatures));

    if (multiFeatures.length > 0) {
      fitToMultiSelectedBounds();
    }
  }, [
    multiSelected,
    geoJsonLayers,
    dispatch,
    fitToMultiSelectedBounds,
    parseRowKeyToIndex,
  ]);

  // ============================================
  // CSV Export
  // ============================================
  const exportSelectedToCSV = useCallback(() => {
    const selected = [];
    Object.entries(multiSelected).forEach(([layerId, keySet]) => {
      Array.from(keySet || []).forEach((rowKey) => {
        const feature = getFeatureByRowKey(layerId, rowKey);
        if (feature) {
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

    const hasPointFeatures = selected.some((s) => s.isPoint);

    const headersSet = new Set(["layerId"]);
    if (hasPointFeatures) {
      headersSet.add("latitude");
      headersSet.add("longitude");
    }
    selected.forEach((s) => {
      Object.keys(s.properties).forEach((k) => headersSet.add(k));
    });
    const headers = Array.from(headersSet);

    const escapeCell = (v) => {
      if (v === undefined || v === null) return "";
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvRows = [headers.join(",")];
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
  }, [multiSelected, getFeatureByRowKey]);

  // ============================================
  // Styling
  // ============================================
  const getRowBackgroundColor = useCallback(
    (record, layerId) => {
      const isMultiSelected = multiSelected[layerId]?.has(record.key);
      const isSingleSelected = selectedRowKeys[layerId]?.includes(record.key);

      if (isSingleSelected) return "#ffece6ff";
      if (isMultiSelected) return "#fff7cc";
      return "white";
    },
    [multiSelected, selectedRowKeys]
  );

  // ============================================
  // Tab Configuration
  // ============================================
  const layerEntries = useMemo(() => {
    return Object.entries(geoJsonLayers || {}).filter(
      ([_, layerData]) => layerData?.geoJsonData?.features
    );
  }, [geoJsonLayers]);

  const tabs = useMemo(() => {
    return layerEntries.map(([layerId, layerData]) => {
      const label = layerData?.metaData?.layer?.layer_nm || layerId;

      // ✅ NEW: Action column with view button instead of radio
      const actionColumn = {
        title: "Find",
        key: `${layerId}-action`,
        width: 80,
        fixed: "left",
        render: (text, record) => {
          const isSingleSelected = selectedRowKeys[layerId]?.includes(
            record.key
          );
          return (
            <Tooltip
              title={
                isSingleSelected
                  ? "View feature on map (currently selected)"
                  : "View feature on map"
              }
            >
              <Button
                type={isSingleSelected ? "primary" : "default"}
                icon={<SearchOutlined />}
                size="small"
                onClick={() => handleViewFeature(record, layerId)}
              />
            </Tooltip>
          );
        },
      };

      const selectColumn = {
        title: "Select",
        key: `${layerId}-select`,
        width: 80,
        fixed: "left",
        render: (text, record) => {
          const checked = multiSelected[layerId]?.has(record.key) || false;
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

      // ✅ UPDATED: Replaced rowSelection with custom columns
      const columns = [actionColumn, selectColumn, ...propertyColumns];

      const children =
        activeTab === layerId ? (
          <Table
            rowKey="key"
            columns={columns}
            dataSource={getTableData(layerData?.geoJsonData?.features, layerId)}
            scroll={{ x: true, y: 600 }}
            size="small"
            pagination={{ pageSize: 5 }}
            onRow={(record) => ({
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
    handleViewFeature,
    multiSelected,
    toggleMultiSelect,
    getRowBackgroundColor,
  ]);

  // ============================================
  // Lifecycle
  // ============================================
  useEffect(() => {
    if (!activeTab && tabs.length > 0) {
      setActiveTab(tabs[0].key);
    }
  }, [tabs, activeTab]);

  const handleTabChange = useCallback(
    (activeKey) => {
      setActiveTab(activeKey);
      if (clearDataOnTabChange) {
        setSelectedRowKeys({});
        setMultiSelected({});
        dispatch(setSelectedFeature({ feature: [], metaData: null }));
        dispatch(setMultiSelectedFeatures([]));
      }
    },
    [dispatch, clearDataOnTabChange]
  );

  useEffect(() => {
    return () => {
      setSelectedRowKeys({});
      setMultiSelected({});
      dispatch(setSelectedFeature({ feature: [], metaData: null }));
      dispatch(setMultiSelectedFeatures([]));
    };
  }, [dispatch]);

  // ============================================
  // Render
  // ============================================
  return (
    <>
      {csvDownloader && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 8,
          }}
        >
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={exportSelectedToCSV}
          >
            Download CSV
          </Button>
        </div>
      )}

      {tabs.length === 0 ? (
        <div>No active layers with attributes to display</div>
      ) : (
        <Tabs
          type="card"
          items={tabs}
          onChange={handleTabChange}
          activeKey={activeTab}
          destroyOnHidden={true}
          animated={false}
        />
      )}
    </>
  );
}

export default memo(AttributeTable);
