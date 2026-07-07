// DistanceMatrix.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Button,
  Select,
  Space,
  Alert,
  Typography,
  Divider,
  message,
  Tooltip,
  Modal,
  Table,
  Card,
  Flex,
  Statistic,
  Tag,
  Empty,
  Progress,
  Spin,
  Collapse,
  Badge,
  List,
  InputNumber,
  Radio,
  Row,
  Col,
  Popconfirm,
  Switch,
  Form,
} from "antd";
import {
  CalculatorOutlined,
  CloseOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  DatabaseOutlined,
  AimOutlined,
  DeleteOutlined,
  PlusOutlined,
  WarningOutlined,
  ExportOutlined,
  LineChartOutlined,
  TableOutlined,
  UnorderedListOutlined,
  StopOutlined,
} from "@ant-design/icons";
import * as turf from "@turf/turf";
import KDBush from "kdbush";
import * as geokdbush from "geokdbush";
import { setTempGeoJsonLayer } from "../../store/slices/mapSlice";

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

// Helper to check if layer contains points
const isPointLayer = (geoJsonData) => {
  if (!geoJsonData) return false;
  const features = geoJsonData.features || [];
  if (features.length === 0) return false;

  return features.some((feature) => {
    const geomType = feature.geometry?.type;
    return (
      geomType === "Point" ||
      geomType === "MultiPoint" ||
      (geomType === "GeometryCollection" &&
        feature.geometry?.geometries?.some(
          (g) => g.type === "Point" || g.type === "MultiPoint",
        ))
    );
  });
};

// Helper to extract coordinates from feature
const getFeatureCoords = (feature) => {
  let geometry = feature.geometry;
  if (geometry.type === "GeometryCollection") {
    const pointGeom = geometry.geometries.find(
      (g) => g.type === "Point" || g.type === "MultiPoint",
    );
    if (!pointGeom) return null;
    geometry = pointGeom;
  }

  if (geometry.type === "Point") {
    return geometry.coordinates;
  } else if (geometry.type === "MultiPoint") {
    return geometry.coordinates[0]; // Use first point for KD-tree
  }
  return null;
};

// Distance unit conversions
const DISTANCE_UNITS = {
  meter: { label: "Meter", factor: 1, symbol: "m" },
  kilometer: { label: "Kilometer", factor: 1000, symbol: "km" },
  mile: { label: "Mile", factor: 1609.344, symbol: "mi" },
};

// Map our (singular) DISTANCE_UNITS keys to Turf's expected (plural) unit strings
const TURF_UNIT_MAP = {
  meter: "meters",
  kilometer: "kilometers",
  mile: "miles",
};

// Matrix types
const MATRIX_TYPES = {
  linear: {
    label: "Linear (N × K × 3)",
    description: "Each row is a source-target pair",
    key: "linear",
  },
  standard: {
    label: "Standard Matrix",
    description: "N rows × K columns (distance matrix)",
    key: "standard",
  },
  summary: {
    label: "Summary Matrix",
    description: "Min, Max, Mean, Std dev per source",
    key: "summary",
  },
};

function DistanceMatrix() {
  const dispatch = useDispatch();
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers || {});
  const tempGeoJsonLayers = useSelector(
    (state) => state.map.tempGeoJsonLayers || {},
  );

  const [sourceLayerId, setSourceLayerId] = useState(null);
  const [targetLayerId, setTargetLayerId] = useState(null);
  const [sourceIdField, setSourceIdField] = useState(null);
  const [targetIdField, setTargetIdField] = useState(null);
  const [matrixType, setMatrixType] = useState("linear");
  const [nearestK, setNearestK] = useState(0);
  const [distanceUnit, setDistanceUnit] = useState("kilometer");
  const [drawLines, setDrawLines] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  const [resultData, setResultData] = useState(null);
  const [resultStats, setResultStats] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [showResult, setShowResult] = useState(false);

  const [sourceFieldOptions, setSourceFieldOptions] = useState([]);
  const [targetFieldOptions, setTargetFieldOptions] = useState([]);

  const abortControllerRef = useRef(null);

  // Get point layer options
  const pointLayerOptions = useMemo(() => {
    const options = [];

    Object.entries(geoJsonLayers).forEach(([layerId, layerData]) => {
      if (layerData?.geoJsonData && isPointLayer(layerData.geoJsonData)) {
        options.push({
          value: layerId,
          label: layerData.metaData?.layer?.layer_nm || layerId,
          type: "main",
          data: layerData,
          feature_count: layerData.geoJsonData.features?.length || 0,
        });
      }
    });

    Object.entries(tempGeoJsonLayers).forEach(([layerId, layerData]) => {
      if (layerData?.geoJsonData && isPointLayer(layerData.geoJsonData)) {
        options.push({
          value: layerId,
          label: layerData.metaData?.layer?.layer_nm || layerId,
          type: "temp",
          data: layerData,
          feature_count: layerData.geoJsonData.features?.length || 0,
          isActive: layerData.isActive,
        });
      }
    });

    return options;
  }, [geoJsonLayers, tempGeoJsonLayers]);

  // Get field options for a layer
  const getFieldOptions = useCallback(
    (layerId) => {
      if (!layerId) return [];

      const allLayers = { ...geoJsonLayers, ...tempGeoJsonLayers };
      const layerData = allLayers[layerId];
      if (!layerData?.geoJsonData?.features?.length) return [];

      const firstFeature = layerData.geoJsonData.features[0];
      if (!firstFeature?.properties) return [];

      return Object.keys(firstFeature.properties).map((key) => ({
        value: key,
        label: key,
      }));
    },
    [geoJsonLayers, tempGeoJsonLayers],
  );

  // Update field options when layers change
  useEffect(() => {
    if (sourceLayerId) {
      setSourceFieldOptions(getFieldOptions(sourceLayerId));
    }
  }, [sourceLayerId, getFieldOptions]);

  useEffect(() => {
    if (targetLayerId) {
      setTargetFieldOptions(getFieldOptions(targetLayerId));
    }
  }, [targetLayerId, getFieldOptions]);

  // Reset result when inputs change
  useEffect(() => {
    setShowResult(false);
    setResultData(null);
    setResultStats(null);
    setTableData([]);
    setTableColumns([]);
  }, [
    sourceLayerId,
    targetLayerId,
    sourceIdField,
    targetIdField,
    matrixType,
    nearestK,
    distanceUnit,
  ]);

  // Get layer data
  const getLayerData = useCallback(
    (layerId) => {
      const allLayers = { ...geoJsonLayers, ...tempGeoJsonLayers };
      return allLayers[layerId];
    },
    [geoJsonLayers, tempGeoJsonLayers],
  );

  // Render layer option with badge
  const renderLayerOption = (option) => ({
    label: (
      <Space size={4}>
        <Badge
          status={
            option.type === "main"
              ? "processing"
              : option.isActive
                ? "success"
                : "default"
          }
          text={option.label}
        />
        <Tag
          color={option.type === "main" ? "blue" : "orange"}
          style={{ fontSize: 10, margin: 0, padding: "0 4px" }}
        >
          {option.type === "main" ? "Main" : "Temp"}
        </Tag>
        <Tag
          color="green"
          style={{ fontSize: 10, margin: 0, padding: "0 4px" }}
        >
          {option.feature_count}
        </Tag>
      </Space>
    ),
    value: option.value,
  });

  // Filter function for Select
  const filterOption = (input, option) => {
    const labelText =
      option?.label?.props?.children
        ?.map((child) => {
          if (typeof child === "string") return child;
          if (child?.props?.text) return child.props.text;
          return "";
        })
        ?.join(" ") || "";
    return labelText.toLowerCase().includes(input.toLowerCase());
  };

  // Build KD-tree index for target features
  const buildKDIndex = useCallback((targetFeatures) => {
    const points = [];
    const featureMap = new Map();

    targetFeatures.forEach((feature, index) => {
      const coords = getFeatureCoords(feature);
      if (coords) {
        const [lng, lat] = coords;
        // Store feature with its index
        const featureWithIndex = { ...feature, _originalIndex: index };
        points.push({ lng, lat, feature: featureWithIndex, index });
        featureMap.set(index, featureWithIndex);
      }
    });

    if (points.length === 0) {
      throw new Error("No valid point features found in target layer");
    }

    // KDBush v4+ uses a builder-style API: you must pre-declare the number of
    // items, then `.add(x, y)` each point in order, then call `.finish()`.
    // (The old v1-v3 API of `new KDBush(points, getX, getY)` no longer exists.)
    const index = new KDBush(points.length);
    for (const p of points) {
      index.add(p.lng, p.lat);
    }
    index.finish();

    // Store the points array for later reference
    // NOTE: geokdbush returns ids matching insertion order (0-based),
    // which is exactly the order we called index.add() above, so this
    // still lines up correctly with `points[idx]` lookups later.
    index._points = points;
    index._featureMap = featureMap;

    return index;
  }, []);

  // Calculate distance between two points using Turf
  // Turf only accepts specific plural unit strings ("meters", "kilometers",
  // "miles", etc.) - our DISTANCE_UNITS keys are singular ("meter",
  // "kilometer", "mile"), so we map between the two here.
  const calculateDistance = useCallback((coords1, coords2, unit) => {
    const from = turf.point(coords1);
    const to = turf.point(coords2);
    const turfUnit = TURF_UNIT_MAP[unit] || unit;
    const distance = turf.distance(from, to, { units: turfUnit });
    return distance;
  }, []);

  // Cancel processing
  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsCancelled(true);
      message.info("Calculation cancelled");
    }
  }, []);

  // Process with KD-tree optimization (K > 0)
  const processWithKDTree = useCallback(
    async (
      sourceFeatures,
      targetFeatures,
      k,
      unit,
      sourceIdKey,
      targetIdKey,
      onProgress,
    ) => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Build KD-tree for target features
      onProgress(0, "Building spatial index...");
      const KDIndex = buildKDIndex(targetFeatures);
      const points = KDIndex._points || [];
      const featureMap = KDIndex._featureMap || new Map();

      onProgress(10, "Index built. Querying nearest neighbors...");

      const results = [];
      const totalSources = sourceFeatures.length;
      const unitFactor = DISTANCE_UNITS[unit].factor;

      for (let i = 0; i < totalSources; i++) {
        if (abortController.signal.aborted) {
          throw new Error("Cancelled");
        }

        const sourceFeature = sourceFeatures[i];
        const sourceCoords = getFeatureCoords(sourceFeature);
        if (!sourceCoords) continue;

        const [lng, lat] = sourceCoords;
        const sourceId = sourceFeature.properties?.[sourceIdKey] || i;

        // Query nearest K using geokdbush
        const nearestIndices = geokdbush.around(KDIndex, lng, lat, k);

        const sourceResults = [];
        for (const idx of nearestIndices) {
          if (abortController.signal.aborted) {
            throw new Error("Cancelled");
          }

          // Get the point data from the stored points array
          const pointData = points[idx];
          if (!pointData) continue;

          const targetFeature = pointData.feature;
          const targetCoords = getFeatureCoords(targetFeature);
          if (!targetCoords) continue;

          const distance = calculateDistance(sourceCoords, targetCoords, unit);
          const targetId =
            targetFeature.properties?.[targetIdKey] || pointData.index;

          sourceResults.push({
            sourceId,
            sourceFeature,
            targetId,
            targetFeature,
            distance,
            // distanceMeters: distance * unitFactor,
            targetIndex: pointData.index,
          });
        }

        results.push({
          sourceId,
          sourceFeature,
          sourceCoords,
          targetResults: sourceResults,
        });

        const progress = 10 + (80 * (i + 1)) / totalSources;
        onProgress(progress, `Processed ${i + 1}/${totalSources} sources...`);
      }

      onProgress(95, "Finalizing results...");
      return results;
    },
    [buildKDIndex, calculateDistance],
  );

  // Process full matrix (K = 0)
  const processFullMatrix = useCallback(
    async (
      sourceFeatures,
      targetFeatures,
      unit,
      sourceIdKey,
      targetIdKey,
      onProgress,
    ) => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const totalSources = sourceFeatures.length;
      const totalTargets = targetFeatures.length;
      const unitFactor = DISTANCE_UNITS[unit].factor;

      const results = [];

      for (let i = 0; i < totalSources; i++) {
        if (abortController.signal.aborted) {
          throw new Error("Cancelled");
        }

        const sourceFeature = sourceFeatures[i];
        const sourceCoords = getFeatureCoords(sourceFeature);
        if (!sourceCoords) continue;

        const sourceId = sourceFeature.properties?.[sourceIdKey] || i;
        const sourceResults = [];

        for (let j = 0; j < totalTargets; j++) {
          if (abortController.signal.aborted) {
            throw new Error("Cancelled");
          }

          const targetFeature = targetFeatures[j];
          const targetCoords = getFeatureCoords(targetFeature);
          if (!targetCoords) continue;

          const distance = calculateDistance(sourceCoords, targetCoords, unit);
          const targetId = targetFeature.properties?.[targetIdKey] || j;

          sourceResults.push({
            sourceId,
            sourceFeature,
            targetId,
            targetFeature,
            distance,
            // distanceMeters: distance * unitFactor,
            targetIndex: j,
          });
        }

        results.push({
          sourceId,
          sourceFeature,
          sourceCoords,
          targetResults: sourceResults,
        });

        const progress = 10 + (80 * (i + 1)) / totalSources;
        onProgress(progress, `Processed ${i + 1}/${totalSources} sources...`);
      }

      onProgress(95, "Finalizing results...");
      return results;
    },
    [calculateDistance],
  );

  // Generate result table data based on matrix type
  const generateTableData = useCallback(
    (results, matrixType, sourceIdKey, targetIdKey) => {
      if (!results || results.length === 0) return { data: [], columns: [] };

      if (matrixType === "linear") {
        // Linear: Each row is a source-target pair
        const rows = [];
        results.forEach((sourceResult) => {
          sourceResult.targetResults.forEach((targetResult) => {
            rows.push({
              key: `${sourceResult.sourceId}-${targetResult.targetId}`,
              sourceId: sourceResult.sourceId,
              targetId: targetResult.targetId,
              distance: targetResult.distance,
              // distanceMeters: targetResult.distanceMeters,
            });
          });
        });

        const columns = [
          {
            title: sourceIdKey || "Source ID",
            dataIndex: "sourceId",
            key: "sourceId",
            width: 150,
          },
          {
            title: targetIdKey || "Target ID",
            dataIndex: "targetId",
            key: "targetId",
            width: 150,
          },
          {
            title: "Distance",
            dataIndex: "distance",
            key: "distance",
            width: 150,
            render: (v) => v?.toFixed?.(4) || v,
          },
          // {
          //   title: "Distance (m)",
          //   dataIndex: "distanceMeters",
          //   key: "distanceMeters",
          //   width: 150,
          //   render: (v) => v?.toFixed?.(2) || v,
          // },
        ];

        return { data: rows, columns };
      }

      if (matrixType === "standard") {
        // Standard Matrix: N rows × K columns
        const rows = [];
        results.forEach((sourceResult) => {
          const row = {
            key: sourceResult.sourceId,
            sourceId: sourceResult.sourceId,
          };
          sourceResult.targetResults.forEach((targetResult, idx) => {
            row[`target_${idx + 1}`] = targetResult.distance;
            row[`target_id_${idx + 1}`] = targetResult.targetId;
          });
          rows.push(row);
        });

        const columns = [
          {
            title: sourceIdKey || "Source ID",
            dataIndex: "sourceId",
            key: "sourceId",
            fixed: "left",
            width: 150,
          },
        ];

        if (results.length > 0 && results[0].targetResults.length > 0) {
          results[0].targetResults.forEach((_, idx) => {
            columns.push({
              title: `${targetIdKey || "Target"} ${idx + 1}`,
              dataIndex: `target_id_${idx + 1}`,
              key: `target_id_${idx + 1}`,
              width: 120,
            });
            columns.push({
              title: `Distance ${idx + 1}`,
              dataIndex: `target_${idx + 1}`,
              key: `target_${idx + 1}`,
              width: 120,
              render: (v) => v?.toFixed?.(4) || v,
            });
          });
        }

        return { data: rows, columns };
      }

      if (matrixType === "summary") {
        // Summary Matrix: Min, Max, Mean, Std dev per source
        const rows = results.map((sourceResult) => {
          const distances = sourceResult.targetResults.map((t) => t.distance);
          const sum = distances.reduce((a, b) => a + b, 0);
          const mean = sum / distances.length;
          const variance =
            distances.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
            distances.length;
          const stdDev = Math.sqrt(variance);
          const min = Math.min(...distances);
          const max = Math.max(...distances);

          return {
            key: sourceResult.sourceId,
            sourceId: sourceResult.sourceId,
            count: distances.length,
            min,
            max,
            mean,
            stdDev,
            sum,
            sumMeters: sum * DISTANCE_UNITS[distanceUnit].factor,
          };
        });

        const columns = [
          {
            title: sourceIdKey || "Source ID",
            dataIndex: "sourceId",
            key: "sourceId",
            fixed: "left",
            width: 150,
          },
          { title: "Count", dataIndex: "count", key: "count", width: 100 },
          {
            title: "Min Distance",
            dataIndex: "min",
            key: "min",
            width: 120,
            render: (v) => v?.toFixed?.(4) || v,
          },
          {
            title: "Max Distance",
            dataIndex: "max",
            key: "max",
            width: 120,
            render: (v) => v?.toFixed?.(4) || v,
          },
          {
            title: "Mean Distance",
            dataIndex: "mean",
            key: "mean",
            width: 120,
            render: (v) => v?.toFixed?.(4) || v,
          },
          {
            title: "Std Dev",
            dataIndex: "stdDev",
            key: "stdDev",
            width: 120,
            render: (v) => v?.toFixed?.(4) || v,
          },
          {
            title: "Sum (m)",
            dataIndex: "sumMeters",
            key: "sumMeters",
            width: 120,
            render: (v) => v?.toFixed?.(2) || v,
          },
        ];

        return { data: rows, columns };
      }

      return { data: [], columns: [] };
    },
    [distanceUnit],
  );

  // Draw lines on map
  const drawResultLines = useCallback((results, unit) => {
    if (!results || results.length === 0) return null;

    const features = [];
    const unitSymbol = DISTANCE_UNITS[unit]?.symbol || "m";

    results.forEach((sourceResult) => {
      sourceResult.targetResults.forEach((targetResult) => {
        const sourceCoords = sourceResult.sourceCoords;
        const targetCoords = getFeatureCoords(targetResult.targetFeature);
        if (!sourceCoords || !targetCoords) return;

        const line = turf.lineString([sourceCoords, targetCoords]);
        line.properties = {
          source_id: sourceResult.sourceId,
          target_id: targetResult.targetId,
          distance: targetResult.distance,
          // distance_meters: targetResult.distanceMeters,
          unit: unitSymbol,
        };
        features.push(line);
      });
    });

    if (features.length === 0) return null;

    return {
      type: "FeatureCollection",
      features,
    };
  }, []);

  // Main calculation function
  const calculateDistanceMatrix = useCallback(async () => {
    // Validation
    if (!sourceLayerId) {
      message.warning("Please select a source layer");
      return;
    }
    if (!targetLayerId) {
      message.warning("Please select a target layer");
      return;
    }
    if (!sourceIdField) {
      message.warning("Please select a source ID field");
      return;
    }
    if (!targetIdField) {
      message.warning("Please select a target ID field");
      return;
    }
    if (sourceLayerId === targetLayerId) {
      message.warning("Source and target layers must be different");
      return;
    }

    setIsProcessing(true);
    setIsCancelled(false);
    setShowResult(false);
    setProgressPercent(0);
    setProgressMessage("Starting calculation...");

    try {
      const sourceLayerData = getLayerData(sourceLayerId);
      const targetLayerData = getLayerData(targetLayerId);

      if (!sourceLayerData?.geoJsonData?.features?.length) {
        throw new Error("Source layer has no features");
      }
      if (!targetLayerData?.geoJsonData?.features?.length) {
        throw new Error("Target layer has no features");
      }

      const sourceFeatures = sourceLayerData.geoJsonData.features;
      const targetFeatures = targetLayerData.geoJsonData.features;
      const k = nearestK > 0 ? nearestK : targetFeatures.length;

      let results;
      const onProgress = (percent, message) => {
        setProgressPercent(percent);
        setProgressMessage(message);
      };

      if (nearestK > 0) {
        // Use KD-tree optimization
        results = await processWithKDTree(
          sourceFeatures,
          targetFeatures,
          k,
          distanceUnit,
          sourceIdField,
          targetIdField,
          onProgress,
        );
      } else {
        // Full matrix (K = 0)
        results = await processFullMatrix(
          sourceFeatures,
          targetFeatures,
          distanceUnit,
          sourceIdField,
          targetIdField,
          onProgress,
        );
      }

      if (isCancelled || !results || results.length === 0) {
        throw new Error("Calculation cancelled or no results");
      }

      // Calculate statistics
      const allDistances = [];
      results.forEach((r) => {
        r.targetResults.forEach((t) => {
          allDistances.push(t.distance);
        });
      });

      const stats = {
        totalSources: results.length,
        totalTargets: targetFeatures.length,
        totalPairs: allDistances.length,
        minDistance: Math.min(...allDistances),
        maxDistance: Math.max(...allDistances),
        meanDistance:
          allDistances.reduce((a, b) => a + b, 0) / allDistances.length,
        stdDev: Math.sqrt(
          allDistances.reduce(
            (a, b) =>
              a +
              Math.pow(
                b -
                  allDistances.reduce((a, b) => a + b, 0) / allDistances.length,
                2,
              ),
            0,
          ) / allDistances.length,
        ),
        unit: DISTANCE_UNITS[distanceUnit].symbol,
      };

      setResultStats(stats);
      setResultData(results);

      // Generate table data
      const { data, columns } = generateTableData(
        results,
        matrixType,
        sourceIdField,
        targetIdField,
      );
      setTableData(data);
      setTableColumns(columns);

      setProgressPercent(100);
      setProgressMessage("Complete!");

      // Draw lines on map if enabled
      if (drawLines) {
        const lineGeoJson = drawResultLines(results, distanceUnit);
        if (lineGeoJson && lineGeoJson.features.length > 0) {
          const layerId = `distance_lines_${Date.now()}`;
          dispatch(
            setTempGeoJsonLayer({
              layerId,
              geoJsonData: lineGeoJson,
              metaData: {
                layer: {
                  layer_nm: `Distance Lines (${sourceLayerData.metaData?.layer?.layer_nm || "Source"} → ${targetLayerData.metaData?.layer?.layer_nm || "Target"})`,
                  type: "distance_matrix_result",
                  source_layer: sourceLayerId,
                  target_layer: targetLayerId,
                  matrix_type: matrixType,
                  nearest_k: nearestK,
                  unit: distanceUnit,
                  feature_count: lineGeoJson.features.length,
                  created: new Date().toISOString(),
                },
                style: {
                  geom_typ: "L",
                  color: "#1890ff",
                  weight: 2,
                  opacity: 0.7,
                },
              },
              isActive: true,
            }),
          );
          message.success(
            `Added ${lineGeoJson.features.length} distance lines to map`,
          );
        }
      }

      setShowResult(true);
      message.success(
        `Calculated ${allDistances.length} distances successfully!`,
      );
    } catch (error) {
      if (error.message === "Cancelled") {
        message.info("Calculation cancelled");
      } else {
        console.error("Error calculating distance matrix:", error);
        message.error(`Failed to calculate: ${error.message}`);
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  }, [
    sourceLayerId,
    targetLayerId,
    sourceIdField,
    targetIdField,
    matrixType,
    nearestK,
    distanceUnit,
    getLayerData,
    processWithKDTree,
    processFullMatrix,
    generateTableData,
    drawResultLines,
    dispatch,
    drawLines,
    isCancelled,
  ]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (!tableData.length || !tableColumns.length) {
      message.warning("No data to export");
      return;
    }

    try {
      // Build CSV header
      const headers = tableColumns.map((col) => col.title);
      const rows = tableData.map((row) => {
        return headers.map((header) => {
          const dataIndex = tableColumns.find(
            (col) => col.title === header,
          )?.dataIndex;
          if (!dataIndex) return "";
          const value = row[dataIndex];
          if (typeof value === "number") return value.toFixed?.(6) || value;
          return value !== undefined && value !== null ? String(value) : "";
        });
      });

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `distance_matrix_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      message.success("CSV exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export CSV");
    }
  }, [tableData, tableColumns]);

  // Clear all
  const clearAll = useCallback(() => {
    setSourceLayerId(null);
    setTargetLayerId(null);
    setSourceIdField(null);
    setTargetIdField(null);
    setNearestK(0);
    setResultData(null);
    setResultStats(null);
    setTableData([]);
    setTableColumns([]);
    setShowResult(false);
    setProgressPercent(0);
    setProgressMessage("");
    setIsProcessing(false);
    setIsCancelled(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    message.info("Cleared all data");
  }, []);

  // Matrix type options for Radio
  const matrixTypeOptions = Object.values(MATRIX_TYPES).map((type) => ({
    label: type.label,
    value: type.key,
  }));

  return (
    <div
      style={{
        width: showResult ? "50vw" : "25vw",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ width: "100%", display: "flex", gap: "5px" }}>
        <div
          style={{
            width: showResult ? "50%" : "100%",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
          size={4}
        >
          {/* Source Layer */}
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Form layout="vertical" style={{ marginBottom: 0 }}>
              <Form.Item
                label={
                  <Text style={{ fontSize: 12 }}>Source Layer (Points)</Text>
                }
                required
                style={{ marginBottom: 6 }}
              >
                <Select
                  placeholder="Choose source point layer"
                  style={{ width: "100%" }}
                  value={sourceLayerId}
                  onChange={setSourceLayerId}
                  disabled={isProcessing}
                  size="small"
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  filterOption={filterOption}
                  options={pointLayerOptions.map(renderLayerOption)}
                />
              </Form.Item>

              <Form.Item
                label={<Text style={{ fontSize: 12 }}>Source ID Field</Text>}
                required
                style={{ marginBottom: 6 }}
              >
                <Select
                  placeholder="Select ID field"
                  style={{ width: "100%" }}
                  value={sourceIdField}
                  onChange={setSourceIdField}
                  disabled={isProcessing || !sourceLayerId}
                  size="small"
                  showSearch
                  allowClear
                  options={sourceFieldOptions}
                />
              </Form.Item>
            </Form>
          </Card>

          {/* Target Layer */}
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Form layout="vertical" style={{ marginBottom: 0 }}>
              <Form.Item
                label={
                  <Text style={{ fontSize: 12 }}>Target Layer (Points)</Text>
                }
                required
                style={{ marginBottom: 6 }}
              >
                <Select
                  placeholder="Choose target point layer"
                  style={{ width: "100%" }}
                  value={targetLayerId}
                  onChange={setTargetLayerId}
                  disabled={isProcessing}
                  size="small"
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  filterOption={filterOption}
                  options={pointLayerOptions.map(renderLayerOption)}
                />
              </Form.Item>

              <Form.Item
                label={<Text style={{ fontSize: 12 }}>Target ID Field</Text>}
                required
                style={{ marginBottom: 6 }}
              >
                <Select
                  placeholder="Select ID field"
                  style={{ width: "100%" }}
                  value={targetIdField}
                  onChange={setTargetIdField}
                  disabled={isProcessing || !targetLayerId}
                  size="small"
                  showSearch
                  allowClear
                  options={targetFieldOptions}
                />
              </Form.Item>
            </Form>
          </Card>

          {/* Settings */}
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Form layout="vertical" style={{ marginBottom: 0 }}>
              <Form.Item
                label={<Text style={{ fontSize: 12 }}>Output Matrix Type</Text>}
                style={{ marginBottom: 6 }}
              >
                <Radio.Group
                  value={matrixType}
                  onChange={(e) => setMatrixType(e.target.value)}
                  disabled={isProcessing}
                  size="small"
                  optionType="button"
                  buttonStyle="solid"
                  options={matrixTypeOptions}
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item
                    label={<Text style={{ fontSize: 12 }}>Nearest K</Text>}
                    style={{ marginBottom: 6 }}
                    tooltip="0 = Calculate all distances, >0 = Nearest K only"
                  >
                    <InputNumber
                      min={0}
                      max={1000}
                      value={nearestK}
                      onChange={setNearestK}
                      disabled={isProcessing}
                      size="small"
                      style={{ width: "100%" }}
                      placeholder="0 = all"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={<Text style={{ fontSize: 12 }}>Distance Unit</Text>}
                    style={{ marginBottom: 6 }}
                  >
                    <Select
                      value={distanceUnit}
                      onChange={setDistanceUnit}
                      disabled={isProcessing}
                      size="small"
                      style={{ width: "100%" }}
                    >
                      {Object.entries(DISTANCE_UNITS).map(([key, unit]) => (
                        <Option key={key} value={key}>
                          {unit.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item style={{ marginBottom: 0 }}>
                <Space size={4}>
                  <Switch
                    checked={drawLines}
                    onChange={setDrawLines}
                    disabled={isProcessing}
                    size="small"
                  />
                  <Text style={{ fontSize: 11 }}>Draw lines on map</Text>
                </Space>
              </Form.Item>
            </Form>
          </Card>

          {/* Actions */}
          <Card size="small" bodyStyle={{ padding: "6px 12px" }}>
            <Flex gap={4}>
              <Button
                type="primary"
                icon={<CalculatorOutlined />}
                onClick={calculateDistanceMatrix}
                loading={isProcessing}
                disabled={
                  !sourceLayerId ||
                  !targetLayerId ||
                  !sourceIdField ||
                  !targetIdField ||
                  isProcessing ||
                  sourceLayerId === targetLayerId
                }
                size="small"
                style={{ flex: 1 }}
              >
                {isProcessing ? "Calculating..." : "Calculate"}
              </Button>
              {isProcessing && (
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={cancelProcessing}
                  size="small"
                >
                  Cancel
                </Button>
              )}
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={clearAll}
                disabled={!sourceLayerId && !targetLayerId && !showResult}
                size="small"
              >
                Clear
              </Button>
            </Flex>

            {isProcessing && (
              <div style={{ marginTop: 6 }}>
                <Progress
                  percent={progressPercent}
                  status={isCancelled ? "exception" : "active"}
                  strokeColor={{
                    from: "#108ee9",
                    to: "#87d068",
                  }}
                  size="small"
                  format={(percent) => (
                    <Space size={4}>
                      <Spin indicator={<LoadingOutlined spin />} size="small" />
                      <Text style={{ fontSize: 11 }}>{progressMessage}</Text>
                    </Space>
                  )}
                />
              </div>
            )}
          </Card>
        </div>

        {showResult && (
          <div
            style={{
              width: "50%",
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
            size={4}
          >
            {/* Statistics */}

            <Card
              size="small"
              bodyStyle={{ padding: "6px 12px" }}
              title={
                <Space size={4}>
                  <CheckOutlined style={{ color: "#52c41a", fontSize: 12 }} />
                  <Text strong style={{ fontSize: 12 }}>
                    Results
                  </Text>
                  <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                    {resultStats?.totalPairs} pairs
                  </Tag>
                </Space>
              }
              extra={
                <Button
                  size="small"
                  icon={<ExportOutlined />}
                  onClick={exportToCSV}
                  disabled={!tableData?.length}
                >
                  CSV
                </Button>
              }
            >
              {resultStats && (
                <Row gutter={[4, 2]}>
                  <Col span={6}>
                    <Statistic
                      title={<Text style={{ fontSize: 9 }}>Sources</Text>}
                      value={resultStats.totalSources}
                      valueStyle={{ fontSize: 14 }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title={<Text style={{ fontSize: 9 }}>Targets</Text>}
                      value={resultStats.totalTargets}
                      valueStyle={{ fontSize: 14 }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title={<Text style={{ fontSize: 9 }}>Min</Text>}
                      value={resultStats.minDistance}
                      valueStyle={{ fontSize: 14, color: "#3f8600" }}
                      suffix={
                        <Text style={{ fontSize: 9 }}>{resultStats.unit}</Text>
                      }
                      precision={4}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title={<Text style={{ fontSize: 9 }}>Max</Text>}
                      value={resultStats.maxDistance}
                      valueStyle={{ fontSize: 14, color: "#cf1322" }}
                      suffix={
                        <Text style={{ fontSize: 9 }}>{resultStats.unit}</Text>
                      }
                      precision={4}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title={<Text style={{ fontSize: 9 }}>Mean</Text>}
                      value={resultStats.meanDistance}
                      valueStyle={{ fontSize: 14 }}
                      suffix={
                        <Text style={{ fontSize: 9 }}>{resultStats.unit}</Text>
                      }
                      precision={4}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title={<Text style={{ fontSize: 9 }}>Std Dev</Text>}
                      value={resultStats.stdDev}
                      valueStyle={{ fontSize: 14 }}
                      suffix={
                        <Text style={{ fontSize: 9 }}>{resultStats.unit}</Text>
                      }
                      precision={4}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title={<Text style={{ fontSize: 9 }}>Matrix Type</Text>}
                      value={MATRIX_TYPES[matrixType]?.label || matrixType}
                      valueStyle={{ fontSize: 12 }}
                    />
                  </Col>
                </Row>
              )}
            </Card>

            {/* Result Table */}
            {tableData.length > 0 && (
              <Card
                size="small"
                bodyStyle={{ padding: "4px 8px" }}
                title={
                  <Space size={4}>
                    <TableOutlined style={{ fontSize: 12 }} />
                    <Text strong style={{ fontSize: 12 }}>
                      Distance Matrix
                    </Text>
                    <Tag color="green" style={{ fontSize: 10, margin: 0 }}>
                      {tableData.length} rows
                    </Tag>
                  </Space>
                }
              >
                <Table
                  dataSource={tableData}
                  columns={tableColumns}
                  size="small"
                  scroll={{ x: true, y: 300 }}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} rows`,
                    pageSizeOptions: ["10", "20", "50", "100"],
                  }}
                  rowKey="key"
                  bordered
                />
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Help Section */}
      <Collapse
        ghost
        size="small"
        defaultActiveKey={[]}
        style={{ background: "transparent" }}
      >
        <Panel
          header={
            <Space>
              <InfoCircleOutlined />
              <Text type="secondary">How to use</Text>
            </Space>
          }
          key="help"
        >
          <List
            size="small"
            dataSource={[
              "Select a source point layer and ID field",
              "Select a target point layer and ID field",
              "Choose output matrix type (Linear, Standard, Summary)",
              "Set K value: 0 = all distances, >0 = nearest K only",
              "When K > 0, KD-tree optimization is used for speed",
              "Click Calculate to compute distances",
              "Results appear in table and as lines on map",
            ]}
            renderItem={(item) => (
              <List.Item style={{ padding: "2px 0" }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  • {item}
                </Text>
              </List.Item>
            )}
          />
          <Divider style={{ margin: "4px 0" }} />
          <Text type="secondary" style={{ fontSize: 10 }}>
            <InfoCircleOutlined />{" "}
            {
              "K > 0 uses KD-tree (kdbush + geokdbush) for fast nearest neighbor queries"
            }
          </Text>
        </Panel>
      </Collapse>
    </div>
  );
}

export default DistanceMatrix;
