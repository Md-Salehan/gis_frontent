// spatialQuery/index.jsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  Space,
  Alert,
  Typography,
  Divider,
  message,
  Empty,
  Button,
} from "antd";
import { AimOutlined } from "@ant-design/icons";
import L from "leaflet";

import {
  setSpatialQuerySelection,
  setSelectedFeature,
} from "../../../store/slices/mapSlice";
import { useAddLayerToMap } from "../../../hooks/useAddLayerToMap";
import useIsCompMinimized from "../../../hooks/useIsCompMinimized";
import { getLayerType } from "../../../utils";

import SourceSelector from "./components/SourceSelector";
import TargetSelector from "./components/TargetSelector";
import OperationSelect from "./components/OperationSelect";
import DistanceInput from "./components/DistanceInput";
import QueryProgress from "./components/QueryProgress";
import QueryResultsTable from "./components/QueryResultsTable";

import { useSpatialQuery } from "./hooks/useSpatialQuery";
import { normalizeQueryConfig } from "./utils/normalizeQueryConfig";
import { validateQuery } from "./utils/queryValidator";

const { Text } = Typography;

function SpatialQuery({ id }) {
  const dispatch = useDispatch();
  const isMinimized = useIsCompMinimized(id);

  const geoJsonLayers = useSelector((s) => s.map.geoJsonLayers || {});
  const tempGeoJsonLayers = useSelector((s) => s.map.tempGeoJsonLayers || {});
  const selection = useSelector((s) => s.map.spatialQuerySelection);

  const [sourceMode, setSourceMode] = useState("layer");
  const [targetMode, setTargetMode] = useState("layer");
  const [operation, setOperation] = useState("");
  const [distance, setDistance] = useState(1000);
  const [distanceUnit, setDistanceUnit] = useState("meters");

  const { addLayerToMap } = useAddLayerToMap({
    layerType: "spatial_query_matched_targets",
    onSuccess: (layer) => {
      const count = layer?.metaData?.layer?.feature_count || 0;
      message.success(`Matched target layer added (${count} features)`);
    },
    onError: (e) => message.error(`Failed to add result layer: ${e.message}`),
  });

  // NOTE: onComplete handler is defined below via useCallback.
  const engine = useSpatialQuery({
    onComplete: (payload) => handleQueryCompleteRef.current?.(payload),
    onError: (e) => message.error(`Spatial query failed: ${e.message}`),
  });

  // Keep a stable ref to the latest handler so the engine closure always sees it.
  const handleQueryCompleteRef = React.useRef(null);

  const availableLayers = useMemo(() => {
    const out = [];
    const push = (layerId, layerData, type) => {
      const features = layerData?.geoJsonData?.features || [];
      if (!features.length) return;
      const geomType = features[0]?.geometry?.type;
      out.push({
        value: layerId,
        label: layerData?.metaData?.layer?.layer_nm || layerId,
        type,
        data: layerData,
        featureCount: features.length,
        geometryTypes: geomType ? [geomType] : [],
      });
    };
    Object.entries(geoJsonLayers).forEach(([lid, d]) => push(lid, d, "main"));
    Object.entries(tempGeoJsonLayers).forEach(([lid, d]) => {
      if (d?.isActive !== false) push(lid, d, "temp");
    });
    return out;
  }, [geoJsonLayers, tempGeoJsonLayers]);

  const layerDataById = useMemo(() => {
    const m = {};
    availableLayers.forEach((l) => {
      m[l.value] = l.data;
    });
    return m;
  }, [availableLayers]);

  const sourceLayerMeta = useMemo(
    () =>
      availableLayers.find((l) => l.value === selection.source.layerId) || null,
    [availableLayers, selection.source.layerId],
  );
  const targetLayerMeta = useMemo(
    () =>
      availableLayers.find((l) => l.value === selection.target.layerId) || null,
    [availableLayers, selection.target.layerId],
  );

  const sourceFeatures = useMemo(
    () => layerDataById[selection.source.layerId]?.geoJsonData?.features || [],
    [layerDataById, selection.source.layerId],
  );
  const targetFeatures = useMemo(
    () => layerDataById[selection.target.layerId]?.geoJsonData?.features || [],
    [layerDataById, selection.target.layerId],
  );

  useEffect(() => {
    setOperation("");
  }, [selection.source.layerId, selection.target.layerId]);

  const setSourceLayer = useCallback(
    (layerId) =>
      dispatch(
        setSpatialQuerySelection({ side: "source", layerId: layerId ?? null }),
      ),
    [dispatch],
  );
  const setTargetLayer = useCallback(
    (layerId) =>
      dispatch(
        setSpatialQuerySelection({ side: "target", layerId: layerId ?? null }),
      ),
    [dispatch],
  );
  const setSourceIndices = useCallback(
    (featureIndices) =>
      dispatch(setSpatialQuerySelection({ side: "source", featureIndices })),
    [dispatch],
  );
  const setTargetIndices = useCallback(
    (featureIndices) =>
      dispatch(setSpatialQuerySelection({ side: "target", featureIndices })),
    [dispatch],
  );

  const focusOnFeature = useCallback(
    (feature, layerId) => {
      if (!feature) return;
      dispatch(
        setSelectedFeature({
          feature: [feature],
          metaData: { layer: { layer_id: layerId } },
        }),
      );
    },
    [dispatch],
  );

  const onFocusSource = useCallback(
    (src) => focusOnFeature(src.feature, src.layerId),
    [focusOnFeature],
  );
  const onFocusTarget = useCallback(
    (tgt) => focusOnFeature(tgt.feature, tgt.layerId),
    [focusOnFeature],
  );

  const handleRun = useCallback(async () => {
    let normalized;
    try {
      normalized = normalizeQueryConfig({
        sourceLayerId: selection.source.layerId,
        sourceMode,
        sourceFeatureIndices: selection.source.featureIndices,
        targetLayerId: selection.target.layerId,
        targetMode,
        targetFeatureIndices: selection.target.featureIndices,
        layerDataById,
        operation,
        distance,
        distanceUnit,
      });
    } catch (err) {
      message.warning(err.message);
      return;
    }

    const validation = validateQuery(normalized, {
      sourceLayerMeta,
      targetLayerMeta,
    });

    if (!validation.ok) {
      message.warning(validation.errors[0]);
      return;
    }

    await engine.startQuery(normalized, {
      sourceLayerName: sourceLayerMeta?.label || selection.source.layerId,
      targetLayerName: targetLayerMeta?.label || selection.target.layerId,
    });
  }, [
    selection,
    sourceMode,
    targetMode,
    layerDataById,
    operation,
    distance,
    distanceUnit,
    sourceLayerMeta,
    targetLayerMeta,
    engine,
  ]);

  // ---- Complete ----
  handleQueryCompleteRef.current = ({ rows, matchedTargetLayer }) => {
    if (!rows?.length || !matchedTargetLayer) {
      message.warning("No matches found");
      return;
    }

    // 1) Highlight matched SOURCE features (spec §31)
    try {
      const sourceFeaturesArr = rows
        .map((r) => r.source.feature)
        .filter((f) => f?.geometry);
      if (sourceFeaturesArr.length) {
        dispatch(
          setSelectedFeature({
            feature: sourceFeaturesArr,
            metaData: {
              layer: { layer_id: selection.source.layerId },
            },
          }),
        );
      }
    } catch (e) {
      console.warn("Highlight source features failed:", e);
    }

    // 2) Add matched target layer for relationship visualization
    const layerId = `spatial_query_${Date.now()}`;
    addLayerToMap({
      layerId,
      geoJsonData: matchedTargetLayer,
      metaData: {
        layer: {
          layer_nm: `Spatial Query: ${
            sourceLayerMeta?.label || selection.source.layerId
          } → ${targetLayerMeta?.label || selection.target.layerId}`,
          source_layer: selection.source.layerId,
          target_layer: selection.target.layerId,
          operation,
          match_count: rows.length,
          feature_count: matchedTargetLayer.features.length,
          created: new Date().toISOString(),
          type: "spatial_query_matched_targets",
        },
        style: {
          geom_typ: getLayerType(matchedTargetLayer.features) || "Unknown",
        },
      },
    });
  };

  const handleZoomToResults = useCallback(() => {
    const rows = engine.resultRows;
    if (!rows?.length) return;
    try {
      const features = rows.map((r) => r.source.feature).filter((f) => f?.geometry);
      if (!features.length) return;
      // Dispatch to the map to fit bounds on all source features.
      dispatch(
        setSelectedFeature({
          feature: features,
          metaData: { layer: { layer_id: rows[0].source.layerId } },
        }),
      );
      message.success(`Zoomed to ${features.length} result(s)`);
    } catch (e) {
      console.warn("Zoom to results failed:", e);
    }
  }, [engine.resultRows, dispatch]);

  const handleExport = useCallback(() => {
    const matched = engine.matchedTargetLayer;
    if (!matched) return;
    try {
      const blob = new Blob([JSON.stringify(matched, null, 2)], {
        type: "application/geo+json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spatial_query_${Date.now()}.geojson`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success("Results exported");
    } catch (e) {
      message.error(`Export failed: ${e.message}`);
    }
  }, [engine.matchedTargetLayer]);

  const handleClear = useCallback(() => {
    engine.reset();
    dispatch(setSpatialQuerySelection({ reset: true }));
    setOperation("");
  }, [engine, dispatch]);

  if (isMinimized) return <div style={{ width: "280px" }} />;

  const sourceTypes = sourceLayerMeta?.geometryTypes || [];
  const targetTypes = targetLayerMeta?.geometryTypes || [];
  const needsDistance =
    operation === "within-distance" || operation === "nearest";

  const canRun =
    !engine.isProcessing &&
    !!selection.source.layerId &&
    !!selection.target.layerId &&
    !!operation &&
    (sourceMode === "layer" || selection.source.featureIndices.length > 0) &&
    (targetMode === "layer" || selection.target.featureIndices.length > 0);

  return (
    <Space direction="vertical" style={{ width: "340px" }} size="small">
      <Card
        size="small"
        styles={{ body: { padding: "8px 12px" } }}
        title={
          <Space size={4}>
            <AimOutlined style={{ fontSize: 14 }} />
            <Text strong style={{ fontSize: 13 }}>
              Spatial Query
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
            <SourceSelector
              layers={availableLayers}
              layerId={selection.source.layerId}
              mode={sourceMode}
              onLayerChange={setSourceLayer}
              onModeChange={setSourceMode}
              features={sourceFeatures}
              selectedIndices={selection.source.featureIndices}
              onSelectedIndicesChange={setSourceIndices}
              disabled={engine.isProcessing}
            />

            <Divider style={{ margin: "8px 0" }} />

            <TargetSelector
              layers={availableLayers}
              layerId={selection.target.layerId}
              mode={targetMode}
              onLayerChange={setTargetLayer}
              onModeChange={setTargetMode}
              features={targetFeatures}
              selectedIndices={selection.target.featureIndices}
              onSelectedIndicesChange={setTargetIndices}
              disabled={engine.isProcessing}
              excludeLayerId={null}
            />

            <Divider style={{ margin: "8px 0" }} />

            <OperationSelect
              sourceGeometryTypes={sourceTypes}
              targetGeometryTypes={targetTypes}
              value={operation}
              onChange={setOperation}
              disabled={engine.isProcessing}
            />

            {needsDistance && (
              <div style={{ marginTop: 6 }}>
                <DistanceInput
                  distance={distance}
                  distanceUnit={distanceUnit}
                  onDistanceChange={setDistance}
                  onUnitChange={setDistanceUnit}
                  disabled={engine.isProcessing}
                />
              </div>
            )}

            <Divider style={{ margin: "8px 0" }} />

            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              <Button
                type="primary"
                size="small"
                block
                onClick={handleRun}
                loading={engine.isProcessing}
                disabled={!canRun}
              >
                {engine.isProcessing ? "Processing..." : "Run Query"}
              </Button>

              <Button
                size="small"
                block
                onClick={handleClear}
                disabled={engine.isProcessing}
              >
                Clear
              </Button>

              {engine.isProcessing && (
                <QueryProgress
                  progress={engine.progress}
                  processed={engine.processedFeatures}
                  total={engine.totalFeatures}
                  matches={engine.matchCount}
                  onCancel={engine.cancel}
                />
              )}

              {engine.error && (
                <Alert
                  type="error"
                  message="Error"
                  description={engine.error}
                  showIcon
                  closable
                  onClose={() => engine.reset()}
                  style={{ fontSize: 12 }}
                />
              )}

              {engine.isComplete && engine.resultRows?.length > 0 && (
                <>
                  <Divider style={{ margin: "4px 0" }} />
                  <Space
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Text strong style={{ fontSize: 12 }}>
                      Results ({engine.resultRows.length})
                    </Text>
                    <Space size={4}>
                      <Button size="small" onClick={handleZoomToResults}>
                        Zoom
                      </Button>
                      <Button size="small" onClick={handleExport}>
                        Export
                      </Button>
                    </Space>
                  </Space>
                  <QueryResultsTable
                    rows={engine.resultRows}
                    onFocusSource={onFocusSource}
                    onFocusTarget={onFocusTarget}
                  />
                </>
              )}

              {engine.isComplete &&
                engine.resultRows &&
                engine.resultRows.length === 0 && (
                  <Alert
                    type="info"
                    message="No matches found"
                    showIcon
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

export default SpatialQuery;