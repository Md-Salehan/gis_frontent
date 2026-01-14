import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  memo,
  useRef,
} from "react";
import {
  Table,
  Tabs,
  Checkbox,
  Button,
  message,
  Space,
  Tooltip,
  Input,
} from "antd";
import { DownloadOutlined, SearchOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import {
  setSelectedFeature,
  setMultiSelectedFeatures,
  resetBuffer,
} from "../../store/slices/mapSlice";
import L from "leaflet";
import { useMap } from "react-leaflet";

// Constants
const DEBUG = process.env.NODE_ENV === "development";
const MAP_FIT_OPTIONS = {
  padding: [10, 10],
  maxZoom: 16,
  duration: 0.7,
};

function AttributeTable({
  csvDownloader = true,
  clearDataOnTabChange = true,
  clearDataOnClose = true,
  defaultSelectAll = false,
}) {
  const dispatch = useDispatch();
  const map = useMap();

  const [activeTab, setActiveTab] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState({});
  const [multiSelected, setMultiSelected] = useState([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [searchQueries, setSearchQueries] = useState({});

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

  // getTableData now accepts optionally an array of originalIndices to
  // ensure keys (layerId-index) use original indices even when filtered.
  const getTableData = useCallback((features, layerId, originalIndices) => {
    if (!features || features.length === 0) return [];

    return features.map((feature, index) => {
      const originalIndex =
        Array.isArray(originalIndices) && originalIndices[index] !== undefined
          ? originalIndices[index]
          : index;
      return {
        key: `${layerId}-${originalIndex}`,
        featureIndex: originalIndex,
        ...feature.properties,
      };
    });
  }, []);

  // ============================================
  // Filtering utilities
  // ============================================
  const getFilteredFeatureIndices = useCallback(
    (features, layerId) => {
      if (!features || features.length === 0) return [];

      const q = (searchQueries[layerId] || "").trim().toLowerCase();
      if (!q) return features.map((_, idx) => idx);

      const matchesQuery = (feature) => {
        // Search properties
        const props = feature.properties || {};
        for (const k of Object.keys(props)) {
          const v = props[k];
          if (
            v !== undefined &&
            v !== null &&
            String(v).toLowerCase().includes(q)
          ) {
            return true;
          }
        }

        // Search geometry coordinates (flattened)
        if (feature.geometry && feature.geometry.coordinates) {
          try {
            const coordsStr = JSON.stringify(feature.geometry.coordinates)
              .toLowerCase()
              .replace(/\s+/g, "");
            if (coordsStr.includes(q)) return true;
          } catch (err) {
            // ignore
          }
        }

        // Also allow matching layerId
        if (String(layerId).toLowerCase().includes(q)) return true;

        return false;
      };

      return features
        .map((f, idx) => ({ f, idx }))
        .filter(({ f }) => matchesQuery(f))
        .map(({ idx }) => idx);
    },
    [searchQueries]
  );

  // ============================================
  // Selection Handlers
  // ============================================
  const prevSelectedFeatureId = useRef("");
  const handleViewFeature = useCallback(
    (record, layerId) => {
      const selectedFeature =
        geoJsonLayers[layerId]?.geoJsonData.features[record.featureIndex];

      if (
        selectedFeature &&
        layerId + record.featureIndex !== prevSelectedFeatureId.current
      ) {
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

        prevSelectedFeatureId.current = layerId + record.featureIndex;
      } else {
        // Deselect if the same feature is clicked again
        dispatch(
          setSelectedFeature({
            feature: [],
            metaData: null,
          })
        );
        setSelectedRowKeys({});
        prevSelectedFeatureId.current = "";
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
  // Select All / Unselect All Handler (respects filtering)
  // ============================================
  const handleSelectAllChange = useCallback(
    (layerId, checked) => {
      const layerData = geoJsonLayers[layerId];
      if (!layerData?.geoJsonData?.features) return;

      const features = layerData.geoJsonData.features;
      const visibleIndices = getFilteredFeatureIndices(features, layerId);

      const allRowKeys = visibleIndices.map((idx) => `${layerId}-${idx}`);

      setMultiSelected((prev) => {
        const updated = { ...prev };
        if (checked) {
          // Add visible keys to the set (preserve other selections)
          const existing = new Set(
            prev[layerId] ? Array.from(prev[layerId]) : []
          );
          allRowKeys.forEach((k) => existing.add(k));
          updated[layerId] = existing;
        } else {
          // Remove visible keys from selection
          const existing = new Set(
            prev[layerId] ? Array.from(prev[layerId]) : []
          );
          allRowKeys.forEach((k) => existing.delete(k));
          updated[layerId] = existing;
        }
        return updated;
      });
    },
    [geoJsonLayers, getFilteredFeatureIndices]
  );

  // ============================================
  // Determine Select All Checkbox State (based on visible/filtered rows)
  // ============================================
  const getSelectAllState = useCallback(
    (layerId) => {
      const layerData = geoJsonLayers[layerId];
      const features = layerData?.geoJsonData?.features || [];
      const visibleIndices = getFilteredFeatureIndices(features, layerId);
      const visibleCount = visibleIndices.length;
      const visibleSelectedCount =
        visibleIndices.filter((idx) =>
          (multiSelected[layerId] || new Set()).has(`${layerId}-${idx}`)
        ).length || 0;

      if (visibleCount === 0) return false;
      if (visibleSelectedCount === 0) return false; // Unchecked
      if (visibleSelectedCount === visibleCount) return true; // Checked
      return "indeterminate"; // Indeterminate (partial selection)
    },
    [geoJsonLayers, multiSelected, getFilteredFeatureIndices]
  );

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

  // ============================================
  // Auto-select all rows when defaultSelectAll is enabled and tab changes
  // ============================================
  useEffect(() => {
    if (!defaultSelectAll || !activeTab || !hasInitialized) {
      return;
    }
    const layerData = geoJsonLayers[activeTab];
    if (!layerData?.geoJsonData?.features) {
      return;
    }

    const features = layerData.geoJsonData.features;
    const allRowKeys = features.map((_, idx) => `${activeTab}-${idx}`);

    // Update multiSelected to include all rows in active tab
    setMultiSelected((prev) => {
      const updated = { ...prev };
      updated[activeTab] = new Set(allRowKeys);
      return updated;
    });
  }, [activeTab, defaultSelectAll, geoJsonLayers, hasInitialized]);

  const tabs = useMemo(() => {
    return layerEntries.map(([layerId, layerData]) => {
      const label = layerData?.metaData?.layer?.layer_nm || layerId;

      // Build filtered set for this layer according to search query
      const features = layerData?.geoJsonData?.features || [];
      const visibleIndices = getFilteredFeatureIndices(features, layerId);
      const filteredFeatures = visibleIndices.map((idx) => features[idx]);

      // ✅ Action column with view button
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

      // ✅ UPDATED: Select column with Select All header (works on filtered rows)
      const selectColumn = {
        title: (
          <Tooltip title="Select all / Unselect all rows in this tab (filtered)">
            <Checkbox
              checked={getSelectAllState(layerId) === true}
              indeterminate={getSelectAllState(layerId) === "indeterminate"}
              onChange={(e) => handleSelectAllChange(layerId, e.target.checked)}
            >
              Select
            </Checkbox>
          </Tooltip>
        ),
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

      // ✅ Columns with updated select column
      const columns = [selectColumn, actionColumn, ...propertyColumns];

      const children =
        activeTab === layerId ? (
          <>
            <Space
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
                <Input.Search
                  placeholder={`Search ${label}`}
                  enterButton={<SearchOutlined />}
                  allowClear
                  value={searchQueries[layerId] || ""}
                  onChange={(e) =>
                    setSearchQueries((prev) => ({
                      ...prev,
                      [layerId]: e.target.value,
                    }))
                  }
                  onSearch={(value) =>
                    setSearchQueries((prev) => ({ ...prev, [layerId]: value }))
                  }
                  style={{ width: 400 }}
                />

                
              {csvDownloader && (
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={exportSelectedToCSV}
                >
                  Download CSV
                </Button>
              )}
            </Space>

            {filteredFeatures.length === 0 ? (
              <div>No matching features found</div>
            ) : (
              <Table
                rowKey="key"
                columns={columns}
                dataSource={getTableData(
                  filteredFeatures,
                  layerId,
                  visibleIndices
                )}
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
            )}
          </>
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
    getSelectAllState,
    handleSelectAllChange,
    searchQueries,
    getFilteredFeatureIndices,
    csvDownloader, 
    exportSelectedToCSV,
  ]);

  // ============================================
  // Lifecycle
  // ============================================
  useEffect(() => {
    if (!activeTab && tabs.length > 0) {
      setActiveTab(tabs[0].key);
    }
    if (activeTab && !hasInitialized) {
      setHasInitialized(true);
    }
  }, [tabs, activeTab]);

  const handleTabChange = useCallback(
    (activeKey) => {
      setActiveTab(activeKey);
      if (clearDataOnTabChange) {
        setSelectedRowKeys({});
        setMultiSelected({});
        setSearchQueries({}); // clear searches on tab change (if opted)
        dispatch(resetBuffer());
        dispatch(setSelectedFeature({ feature: [], metaData: null }));
        dispatch(setMultiSelectedFeatures([]));
      }
    },
    [dispatch, clearDataOnTabChange]
  );

  const cleanUp = useCallback(() => {
    setSelectedRowKeys({});
    setMultiSelected({});
    setSearchQueries({});
    dispatch(setSelectedFeature({ feature: [], metaData: null }));
    dispatch(setMultiSelectedFeatures([]));
  }, [dispatch]);

  useEffect(() => {
    return () => {
      clearDataOnClose && cleanUp();
    };
  }, [clearDataOnClose, cleanUp]);

  // ============================================
  // Render
  // ============================================
  return (
    <>
      {/* {csvDownloader && (
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
      )} */}

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
