// problem:
// at 115 - geomType must be of target layer.
// at 84 - there is no GeometryCollection typed geoJson
// at 60 - matches is Int ? then it should be matchNum

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  Space,
  Alert,
  Typography,
  Divider,
  message,
  Spin,
  Empty,
  Button,
} from "antd";
import { AimOutlined } from "@ant-design/icons";
import { setTempGeoJsonLayer } from "../../../store/slices/mapSlice";
import JoinConfigPanel from "./components/JoinConfigPanel";
import JoinProgress from "./components/JoinProgress";
import JoinResults from "./components/JoinResults";
import { useSpatialJoin } from "./hooks/useSpatialJoin";
import useIsCompMinimized from "../../../hooks/useIsCompMinimized";
import { useAddLayerToMap } from "../../../hooks/useAddLayerToMap";
import { getLayerType } from "../../../utils";

const { Text, Title } = Typography;

function SpatialJoin({ id }) {
  const dispatch = useDispatch();
  const isMinimized = useIsCompMinimized(id);

  // Redux state
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers || {});
  const tempGeoJsonLayers = useSelector(
    (state) => state.map.tempGeoJsonLayers || {}
  );

  // Local state
  const [targetLayerId, setTargetLayerId] = useState(null);
  const [joinLayerId, setJoinLayerId] = useState(null);
  const [predicate, setPredicate] = useState(""); // eg: "intersects", "contains", "within", "touches", "crosses", "overlaps", "equals"
  const [distance, setDistance] = useState(500);
  const [distanceUnit, setDistanceUnit] = useState("meters");
  const [matchStrategy, setMatchStrategy] = useState("all"); // "first", "all", "nearest"
  //Set default to all fields
  const [selectedFields, setSelectedFields] = useState(() => {
    // This will be initialized when joinFields is available
    return [];
  });
  const [fieldPrefix, setFieldPrefix] = useState("join_");
  const [aggregation, setAggregation] = useState(null); // Aggregation strategy for multiple matches (e.g., "count", "sum", "average", etc.)

  // Use the custom hook for adding layers
  const { addLayerToMap } = useAddLayerToMap({
    layerType: "spatial_join_result",
    onSuccess: (resultLayer) => {
      const featureCount = resultLayer?.metaData?.layer?.feature_count || 0;
      message.success(
        `Spatial join complete! ${featureCount} matches found`
      );
    },
    onError: (error) => {
      console.error("Failed to add spatial join layer:", error);
      message.error(`Failed to add result: ${error.message}`);
    },
  });

  // Join hook
  const {
    status,
    progress,
    totalFeatures,
    processedFeatures,
    matches,
    results,
    error,
    startJoin,
    cancelJoin,
    reset,
    isProcessing,
    isComplete,
  } = useSpatialJoin({
    onComplete: handleComplete,
    onError: handleError,
  });

  // Reset predicate and selected fields when target or join layer changes
  useEffect(() => {
    setPredicate("");
    setSelectedFields([]);
  }, [targetLayerId, joinLayerId]);

  // Get available layers (polygon, point, line)
  const availableLayers = useMemo(() => {
    const layers = [];

    const processLayer = (layerId, layerData, type) => {
      if (!layerData?.geoJsonData) return;

      const features = layerData.geoJsonData.features || [];
      if (features.length === 0) return;

      // Determine geometry type
      const geomTypes = new Set();
      features.forEach((f) => {
        if (f.geometry) {
          const type = f.geometry.type;
          if (type === "GeometryCollection") {
            f.geometry.geometries?.forEach((g) => geomTypes.add(g.type));
          } else {
            geomTypes.add(type);
          }
        }
      });

      layers.push({
        value: layerId,
        label: layerData.metaData?.layer?.layer_nm || layerId,
        type: type,
        data: layerData,
        featureCount: features.length,
        geometryTypes: Array.from(geomTypes),
      });
    };

    Object.entries(geoJsonLayers).forEach(([layerId, layerData]) => {
      processLayer(layerId, layerData, "main");
    });

    Object.entries(tempGeoJsonLayers).forEach(([layerId, layerData]) => {
      if (layerData?.isActive !== false) {
        processLayer(layerId, layerData, "temp");
      }
    });

    return layers;
  }, [geoJsonLayers, tempGeoJsonLayers]);

  // Get available fields from join layer
  const joinFields = useMemo(() => {
    if (!joinLayerId) return [];

    const layer = availableLayers.find((l) => l.value === joinLayerId);
    if (!layer?.data?.geoJsonData) return [];

    const features = layer.data.geoJsonData.features || [];
    if (features.length === 0) return [];

    const props = features[0].properties || {};
    return Object.keys(props).filter(
      (key) => !key.startsWith("_") // Exclude internal fields
    );
  }, [joinLayerId, availableLayers]);

  // Handle join completion
  function handleComplete(result) {
    if (!result) {
      message.warning("No matches found");
      return;
    }

    try {
      const layerId = `spatial_join_${Date.now()}`;

      // Use the custom hook to add to map
      const success = addLayerToMap({
        layerId,
        geoJsonData: result,
        metaData: {
          layer: {
            layer_nm: `Spatial Join: ${targetLayerId} → ${joinLayerId}`,
            target_layer: targetLayerId,
            join_layer: joinLayerId,
            predicate: predicate,
            match_count: result.features?.length || 0,
            feature_count: result.features?.length || 0,
            created: new Date().toISOString(),
            type: "spatial_join_result",
          },
          style: {
            geom_typ: getLayerType(result.features) || "Unknown",
          },
        },
      });

      if (!success) {
        message.error("Failed to add spatial join result to map");
      }
    } catch (error) {
      console.error("Error adding result to map:", error);
      message.error(`Failed to add result: ${error.message}`);
    }
  }

  function handleError(error) {
    message.error(`Spatial join failed: ${error.message}`);
  }

  // Handle run join
  const handleRunJoin = useCallback(() => {
    if (!targetLayerId || !joinLayerId) {
      message.warning("Please select both target and join layers");
      return;
    }

    if (targetLayerId === joinLayerId) {
      message.warning("Target and join layers must be different");
      return;
    }

    const target = availableLayers.find((l) => l.value === targetLayerId);
    const join = availableLayers.find((l) => l.value === joinLayerId);

    if (!target || !join) {
      message.error("Selected layers not found");
      return;
    }

    startJoin({
      targetLayer: target,
      joinLayer: join,
      predicate,
      distance,
      distanceUnit,
      matchStrategy,
      selectedFields,
      fieldPrefix,
      aggregation,
    });
  }, [
    targetLayerId,
    joinLayerId,
    availableLayers,
    predicate,
    distance,
    distanceUnit,
    matchStrategy,
    selectedFields,
    fieldPrefix,
    aggregation,
    startJoin,
  ]);

  // Handle clear
  const handleClear = useCallback(() => {
    reset();
    setTargetLayerId(null);
    setJoinLayerId(null);
    setSelectedFields([]);
  }, [reset]);

  if (isMinimized) {
    return <div style={{ width: "280px" }} />;
  }

  return (
    <Space direction="vertical" style={{ width: "320px" }} size="small">
      <Card
        size="small"
        styles={{ body: { padding: "8px 12px" } }}
        title={
          <Space size={4}>
            <AimOutlined style={{ fontSize: 14 }} />
            <Text strong style={{ fontSize: 13 }}>
              Spatial Join
            </Text>
          </Space>
        }
      >
        {availableLayers.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary" style={{ fontSize: 12 }}>
                No layers available
              </Text>
            }
          />
        ) : (
          <>
            <JoinConfigPanel
              targetLayerId={targetLayerId}
              joinLayerId={joinLayerId}
              predicate={predicate}
              distance={distance}
              distanceUnit={distanceUnit}
              matchStrategy={matchStrategy}
              selectedFields={selectedFields}
              fieldPrefix={fieldPrefix}
              aggregation={aggregation}
              availableLayers={availableLayers}
              joinFields={joinFields}
              isProcessing={isProcessing}
              onTargetChange={setTargetLayerId}
              onJoinChange={setJoinLayerId}
              onPredicateChange={setPredicate}
              onDistanceChange={setDistance}
              onDistanceUnitChange={setDistanceUnit}
              onMatchStrategyChange={setMatchStrategy}
              onFieldsChange={setSelectedFields}
              onPrefixChange={setFieldPrefix}
              onAggregationChange={setAggregation}
            />

            <Divider style={{ margin: "8px 0" }} />

            <Space style={{ width: "100%" }} direction="vertical" size={6}>
              <Button
                type="primary"
                onClick={handleRunJoin}
                loading={isProcessing}
                disabled={
                  isProcessing ||
                  !targetLayerId ||
                  !joinLayerId ||
                  targetLayerId === joinLayerId
                }
                block
                size="small"
              >
                {isProcessing ? "Processing..." : "Run Join"}
              </Button>

              {isProcessing && (
                <JoinProgress
                  progress={progress}
                  processed={processedFeatures}
                  total={totalFeatures}
                  matches={matches}
                  onCancel={cancelJoin}
                />
              )}

              {isComplete && results && (
                <JoinResults
                  results={results}
                  matches={matches}
                  onClear={handleClear}
                />
              )}

              {error && (
                <Alert
                  message="Error"
                  description={error}
                  type="error"
                  showIcon
                  closable
                  onClose={() => reset()}
                  style={{ fontSize: 12 }}
                />
              )}
            </Space>
          </>
        )}
      </Card>
    </Space>
  );
}

export default SpatialJoin;