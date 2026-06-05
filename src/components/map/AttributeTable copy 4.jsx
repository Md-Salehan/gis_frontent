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
  Dropdown,
  Tag,
} from "antd";
import {
  DownloadOutlined,
  SearchOutlined,
  CloseCircleOutlined,
  DownOutlined,
  EllipsisOutlined,
  UserOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import {
  setSelectedFeature,
  setMultiSelectedFeatures,
  resetBuffer,
} from "../../store/slices/mapSlice";
import L from "leaflet";
import { useMap } from "react-leaflet";
import transformProperties from "../../utils/transformProperties";
import { evaluateQuery } from "../../utils";
import { QueryBuilder } from "..";
import shpWrite from "@mapbox/shp-write";

// Constants
const DEBUG = process.env.NODE_ENV === "development";
const MAP_FIT_OPTIONS = {
  padding: [10, 10],
  maxZoom: 20,
  duration: 0.7,
};
const TABLE_VISIBILITY_TYPES = [
  {
    label: "All",
    key: "1",
    // icon: <UserOutlined />,
  },
  {
    label: "Selected",
    key: "2",
    // icon: <UserOutlined />,
  },
  {
    label: "Unselected",
    key: "3",
    // icon: <UserOutlined />,
  },
];

const DOWNLOAD_TYPES = [
  {
    label: "CSV",
    key: "1",
    icon: <DownloadOutlined />,
  },
  {
    label: "GeoJSON",
    key: "2",
    icon: <DownloadOutlined />,
  },
  {
    label: "Shapefile",
    key: "3",
    icon: <DownloadOutlined />,
  },
];

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
  const [multiSelected, setMultiSelected] = useState({});
  const [hasInitialized, setHasInitialized] = useState(false);
  const [searchQueries, setSearchQueries] = useState({});
  const [tableVisibilityType, setTableVisibilityType] = useState("All");
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [numOfItems, setNumOfItems] = useState(0);
  const [downloadType, setDownloadType] = useState("CSV");

  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  const multiSelectedFeatures = useSelector(
    (state) => state.map.multiSelectedFeatures,
  );
  // ============================================
  // Utility: Parse row key to feature index
  // ============================================
  const generateRowKey = useCallback((layerId, featureIndex) => {
    return `${layerId}-${featureIndex}`;
  }, []);
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
    [geoJsonLayers, parseRowKeyToIndex],
  );

  // ============================================
  // Helper: Check if value is an array of strings
  // ============================================
  const isArrayOfStrings = useCallback((value) => {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((item) => typeof item === "string")
    );
  }, []);

  // ============================================
  // Helper: Render value as button if it's an array of strings, otherwise as text
  // ============================================
  const renderCellValue = useCallback(
    (value, record, dataIndex) => {
      if (isArrayOfStrings(value)) {
        return (
          <Space direction="vertical" size="small">
            {value.map((url, idx) => (
              <Button
                key={idx}
                type="link"
                size="small"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent row click from triggering
                  if (url && url.startsWith("http")) {
                    window.open(url, "_blank", "noopener,noreferrer");
                  } else if (url) {
                    // If URL doesn't have protocol, add https://
                    window.open(
                      "https://" + url,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }
                }}
                style={{ padding: "0 4px" }}
              >
                {url.length > 50 ? `${url.substring(0, 47)}...` : url}
              </Button>
            ))}
          </Space>
        );
      }

      // Handle regular string/numbers/objects
      if (typeof value === "object" && value !== null) {
        return JSON.stringify(value);
      }

      return value;
    },
    [isArrayOfStrings],
  );

  // ============================================
  // Table Utilities
  // ============================================
  const getColumns = useCallback(
    (properties) => {
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
        render: (value, record) => renderCellValue(value, record, key),
      }));
    },
    [renderCellValue],
  );

  // getTableData now accepts optionally an array of originalIndices to
  // ensure keys (layerId-index) use original indices even when filtered.
  const getTableData = useCallback((features, layerId, originalIndices) => {
    if (!features || features.length === 0) return [];

    return features.map((feature, index) => {
      const originalIndex =
        Array.isArray(originalIndices) && originalIndices[index] !== undefined
          ? originalIndices[index]
          : index;
      const TransformedProperties = transformProperties(
        feature.properties || {},
        {
          delimiter: "~",
          processNestedArrays: false,
        },
      );

      return {
        key: generateRowKey(layerId, originalIndex),
        featureIndex: originalIndex,
        ...TransformedProperties,
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
      const filterType = tableVisibilityType;
      if (!q && filterType === "All") return features.map((_, idx) => idx);

      const matchesFilterType = (feature) => {
        const rowKey = generateRowKey(layerId, features.indexOf(feature));
        const isMultiSelected = multiSelected[layerId]?.has(rowKey);

        if (filterType === "Selected") {
          // return isMultiSelected || isSingleSelected;
          return isMultiSelected;
        }
        if (filterType === "Unselected") {
          // return !isMultiSelected && !isSingleSelected;
          return !isMultiSelected;
        }
        return true; // "All"
      };

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

      const result = features
        .map((f, idx) => ({ f, idx }))
        .filter(({ f }) => matchesFilterType(f))
        .filter(({ f }) => matchesQuery(f))
        .map(({ idx }) => idx);

      return result;
    },
    [searchQueries, tableVisibilityType, multiSelected, generateRowKey],
  );

  const parseQueryToRowKeys = useCallback(
    (query, layerId) => {
      if (!query || !layerId) return [];

      const layerData = geoJsonLayers[layerId];

      if (!layerData?.geoJsonData?.features) return [];
      const features = layerData.geoJsonData.features;
      const matchingIndices = [];

      features.forEach((feature, idx) => {
        try {
          // Evaluate the query against this feature

          const matches = evaluateQuery(query, feature);

          if (matches) {
            matchingIndices.push(idx);
          }
        } catch (error) {
          console.error(`Error evaluating query for feature ${idx}:`, error);
        }
      });

      // Convert indices to row keys
      const rowKeys = matchingIndices.map((idx) =>
        generateRowKey(layerId, idx),
      );

      return rowKeys;
    },
    [geoJsonLayers],
  );

  const handleTableVisibilityChange = useCallback((type) => {
    setTableVisibilityType(
      TABLE_VISIBILITY_TYPES.find((t) => t.key === type.key)?.label || "All",
    );
  }, []);

  const handleDownloadTypeChange = useCallback((type) => {
    setDownloadType(
      DOWNLOAD_TYPES.find((t) => t.key === type.key)?.label || "CSV",
    );
  }, []);

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
          }),
        );

        if (map) {
          try {
            const layer = L.geoJSON(selectedFeature);
            const bounds = layer.getBounds();
            if (bounds && bounds.isValid && bounds.isValid()) {
              const currentBounds = map.getBounds();

              // Calculate if the feature is already within or very close to current view
              const isAlreadyInView = currentBounds.contains(bounds);

              if (isAlreadyInView) {
                // Use instant fitBounds without animation for close features
                map.fitBounds(bounds, MAP_FIT_OPTIONS);
              } else {
                // Use flyToBounds with animation for distant features
                map.flyToBounds(bounds, MAP_FIT_OPTIONS);
              }
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
          }),
        );
        setSelectedRowKeys({});
        prevSelectedFeatureId.current = "";
      }
    },
    [dispatch, geoJsonLayers, map],
  );
  // Toggle multi-select for a specific row
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

  const applyQuerySelection = useCallback(
    (query, layerId) => {
      const allRowKeys = parseQueryToRowKeys(query, layerId) || [];

      setMultiSelected((prev) => {
        const updated = { ...prev };
        updated[layerId] = new Set(allRowKeys);
        return updated;
      });
      handleTableVisibilityChange({ key: "2" }); // Switch to "Selected" view after applying query
    },
    [parseQueryToRowKeys, handleTableVisibilityChange],
  );

  const toggleQueryBuilder = useCallback((bool) => {
    if (typeof bool === "boolean") {
      setShowQueryBuilder(bool);
    } else {
      setShowQueryBuilder((prev) => !prev);
    }
  }, []);

  const clearMultiSelection = useCallback(() => {
    setMultiSelected({});
    handleTableVisibilityChange({ key: "1" }); // Switch back to "All" view
  }, [handleTableVisibilityChange]);

  // ============================================
  // Select All / Unselect All Handler (respects filtering)
  // ============================================
  const handleSelectAllChange = useCallback(
    (layerId, checked) => {
      const layerData = geoJsonLayers[layerId];
      if (!layerData?.geoJsonData?.features) return;

      const features = layerData.geoJsonData.features;
      const visibleIndices = getFilteredFeatureIndices(features, layerId);

      const allRowKeys = visibleIndices.map((idx) =>
        generateRowKey(layerId, idx),
      );

      setMultiSelected((prev) => {
        const updated = { ...prev };
        if (checked) {
          // Add visible keys to the set (preserve other selections)
          const existing = new Set(
            prev[layerId] ? Array.from(prev[layerId]) : [],
          );
          allRowKeys.forEach((k) => existing.add(k));
          updated[layerId] = existing;
        } else {
          // Remove visible keys from selection
          const existing = new Set(
            prev[layerId] ? Array.from(prev[layerId]) : [],
          );
          allRowKeys.forEach((k) => existing.delete(k));
          updated[layerId] = existing;
        }
        return updated;
      });
    },
    [geoJsonLayers, getFilteredFeatureIndices],
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
          (multiSelected[layerId] || new Set()).has(
            generateRowKey(layerId, idx),
          ),
        ).length || 0;

      if (visibleCount === 0) return false;
      if (visibleSelectedCount === 0) return false; // Unchecked
      if (visibleSelectedCount === visibleCount) return true; // Checked
      return "indeterminate"; // Indeterminate (partial selection)
    },
    [geoJsonLayers, multiSelected, getFilteredFeatureIndices],
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
    console.log(
      "xxw: Updating multi-selected features in Redux:",
      multiFeatures,
    );
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
  // Export
  // ============================================

  const exportSelectedToGeoJSON = useCallback(() => {
    if (!multiSelectedFeatures || multiSelectedFeatures.length === 0) {
      message.info("No features selected for download");
      return;
    }

    // Create a FeatureCollection from the selected features
    const featureCollection = {
      type: "FeatureCollection",
      features: multiSelectedFeatures.map((item) => item.feature),
    };

    // Convert to JSON string with pretty formatting
    const jsonContent = JSON.stringify(featureCollection, null, 2);

    // Create blob and download
    const blob = new Blob([jsonContent], {
      type: "application/json;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `geojson_${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [multiSelectedFeatures]);

  const exportSelectedToCSV = useCallback(() => {
    const selected = [];

    multiSelectedFeatures.forEach(({ layerId, feature }) => {
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

        // Handle array of strings in CSV export
        const value = s.properties[h];
        if (Array.isArray(value)) {
          return escapeCell(value.join(", "));
        }
        return escapeCell(value);
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
  }, [multiSelectedFeatures]);

  const exportSelectedToShapeFile = useCallback(async () => {
    if (!multiSelectedFeatures || multiSelectedFeatures.length === 0) {
      message.info("No features selected for download");
      return;
    }

    try {
      const { zip } = await import("@mapbox/shp-write");

      const features = multiSelectedFeatures.map((item) => {
        const feature = JSON.parse(JSON.stringify(item.feature));
        if (feature.properties) {
          feature.properties._layerId = item.layerId;
        } else {
          feature.properties = { _layerId: item.layerId };
        }
        return feature;
      });

      const featureCollection = {
        type: "FeatureCollection",
        features: features,
      };

      const filenameBase = `shapefile_${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}`;

      const zipBlob = await zip(featureCollection, {
        outputType: "blob",
        compression: "DEFLATE",
        prj: 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]',
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filenameBase}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      message.success(
        `Exported ${features.length} features to Shapefile (ZIP archive)`,
      );
    } catch (error) {
      console.error("Error exporting to Shapefile:", error);
      if (error.message && error.message.includes("geometry")) {
        message.error("Export failed: Some features have invalid geometry");
      } else {
        message.error("Failed to export Shapefile. Please try again.");
      }
    }
  }, [multiSelectedFeatures]);

  const handleFileExport = useCallback(() => {
    if (downloadType === "CSV") {
      exportSelectedToCSV();
    } else if (downloadType === "GeoJSON") {
      exportSelectedToGeoJSON();
    } else if (downloadType === "Shapefile") {
      exportSelectedToShapeFile();
    }
  }, [downloadType, exportSelectedToCSV]);

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
    [multiSelected, selectedRowKeys],
  );

  // ============================================
  // Tab Configuration
  // ============================================
  const layerEntries = useMemo(() => {
    return Object.entries(geoJsonLayers || {}).filter(
      ([_, layerData]) => layerData?.geoJsonData?.features,
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

  // ============================================
  // Build tabs with tables based on geoJsonLayers
  // ============================================
  const tabs = useMemo(() => {
    return layerEntries.map(([layerId, layerData]) => {
      const label = layerData?.metaData?.layer?.layer_nm || layerId;

      // Build filtered set for this layer according to search query
      const features = layerData?.geoJsonData?.features || [];
      // const availableFeatures =
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
            record.key,
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
        layerData?.geoJsonData?.features[0]?.properties,
      );

      // ✅ Columns with updated select column
      const columns = [selectColumn, actionColumn, ...propertyColumns];

      activeTab === layerId && setNumOfItems(filteredFeatures.length);

      const children =
        activeTab === layerId ? (
          <>
            <Space
              style={{
                display: "flex",
                justifyContent: "start",
                gap: "8px",
                margin: "2px 0 2px",
                // position: "sticky",
                // top: 0,
                // zIndex: 9999,
                // left: 0,
                // backgroundColor: "white",
                // padding: "4px",
              }}
            >
              <Space direction="horizontal" size="small">
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
                  size="small"
                />
                <Space.Compact size="small">
                  <Button
                    size="small"
                    style={{
                      width: "100px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "start",
                    }}
                    onClick={() => {}}
                  >
                    {tableVisibilityType} {numOfItems}
                  </Button>
                  <Dropdown
                    menu={{
                      items: TABLE_VISIBILITY_TYPES,
                      onClick: (e) => handleTableVisibilityChange(e),
                    }}
                    placement="bottomRight"
                  >
                    <Button icon={<EllipsisOutlined />} />
                  </Dropdown>
                </Space.Compact>
              </Space>

              {csvDownloader && (
                <Space.Compact size="small">
                  <Dropdown
                    menu={{
                      items: DOWNLOAD_TYPES,
                      onClick: (e) => handleDownloadTypeChange(e),
                    }}
                    placement="bottomRight"
                  >
                    <Button
                      style={{
                        width: "100px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "start",
                      }}
                    >
                      {downloadType}
                    </Button>
                  </Dropdown>
                  <Button
                    size="small"
                    style={{
                      width: "25px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onClick={() => handleFileExport()}
                  >
                    <DownloadOutlined />
                  </Button>
                </Space.Compact>
              )}
              <Button
                size="small"
                type="primary"
                icon={<DatabaseOutlined />}
                onClick={() => toggleQueryBuilder(true)}
              >
                Query Builder
              </Button>
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
                  visibleIndices,
                )}
                scroll={{ x: true }}
                sticky={true}
                size="small"
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                onRow={(record) => ({
                  style: {
                    whiteSpace: "nowrap",
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
    tableVisibilityType,
    handleTableVisibilityChange,
    numOfItems,
    showQueryBuilder,
    toggleQueryBuilder,
    downloadType,
    handleDownloadTypeChange,
    handleFileExport,
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

  // Handle tab change with optional data clearing
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
    [dispatch, clearDataOnTabChange],
  );

  // Clean up on component unmount if clearDataOnClose is enabled
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
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        gap: "10px",
      }}
    >
      {showQueryBuilder && (
        <QueryBuilder
          activeTab={activeTab}
          onApplyFilters={applyQuerySelection}
          layerData={geoJsonLayers[activeTab]}
          onClose={toggleQueryBuilder}
          onClear={clearMultiSelection}
        />
      )}
      {tabs.length === 0 ? (
        <div className="table-container">
          <Space
            direction="vertical"
            size="large"
            wrap="nowrap"
            style={{ width: "100%", textAlign: "center", marginTop: 20 }}
          >
            <Tag color="red" style={{}}>
              No layers with features available
            </Tag>
          </Space>
        </div>
      ) : (
        <div className="table-container">
          {/* hide vertical scroll bar */}
          <Tabs
            type="card"
            items={tabs}
            onChange={handleTabChange}
            activeKey={activeTab}
            destroyOnHidden={true}
            animated={false}
          />
        </div>
      )}
    </div>
  );
}

export default memo(AttributeTable);
