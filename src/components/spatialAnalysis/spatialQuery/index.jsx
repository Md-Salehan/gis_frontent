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
// import { useMap } from "react-leaflet";

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
  const map = null;
  const isMinimized = useIsCompMinimized(id);

  // ---- Redux ----
  const geoJsonLayers = useSelector((s) => s.map.geoJsonLayers || {});
  const tempGeoJsonLayers = useSelector((s) => s.map.tempGeoJsonLayers || {});
  const selection = useSelector((s) => s.map.spatialQuerySelection);

  // ---- Local UI state (not in Redux) ----
  const [sourceMode, setSourceMode] = useState("layer");
  const [targetMode, setTargetMode] = useState("layer");
  const [operation, setOperation] = useState("");
  const [distance, setDistance] = useState(1000);
  const [distanceUnit, setDistanceUnit] = useState("meters");

  // ---- useAddLayerToMap (result layer) ----
  const { addLayerToMap } = useAddLayerToMap({
    layerType: "spatial_query_matched_targets",
    onSuccess: (layer) => {
      const count = layer?.metaData?.layer?.feature_count || 0;
      message.success(`Matched target layer added (${count} features)`);
    },
    onError: (e) => message.error(`Failed to add result layer: ${e.message}`),
  });

  // ---- Engine ----
  const engine = useSpatialQuery({
    onComplete: handleQueryComplete,
    onError: (e) => message.error(`Spatial query failed: ${e.message}`),
  });

  // ---- Available layers ----
  const availableLayers = useMemo(() => {
    const out = [];
    const push = (layerId, layerData, type) => {
      const features = layerData?.geoJsonData?.features || [];
      if (!features.length) return;
      // Single-geometry-type assumption per spec: use the first feature's type.
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
    () => availableLayers.find((l) => l.value === selection.source.layerId) || null,
    [availableLayers, selection.source.layerId],
  );
  const targetLayerMeta = useMemo(
    () => availableLayers.find((l) => l.value === selection.target.layerId) || null,
    [availableLayers, selection.target.layerId],
  );

  // ---- Selected features for pickers ----
  const sourceFeatures = useMemo(
    () => layerDataById[selection.source.layerId]?.geoJsonData?.features || [],
    [layerDataById, selection.source.layerId],
  );
  const targetFeatures = useMemo(
    () => layerDataById[selection.target.layerId]?.geoJsonData?.features || [],
    [layerDataById, selection.target.layerId],
  );

  // ---- Reset operation when layers change ----
  useEffect(() => {
    setOperation("");
  }, [selection.source.layerId, selection.target.layerId]);

  // ---- Redux dispatchers (isolated key) ----
  const setSourceLayer = useCallback(
    (layerId) =>
      dispatch(setSpatialQuerySelection({ side: "source", layerId: layerId ?? null })),
    [dispatch],
  );
  const setTargetLayer = useCallback(
    (layerId) =>
      dispatch(setSpatialQuerySelection({ side: "target", layerId: layerId ?? null })),
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

  // ---- Focus helpers ----
  const focusOnFeature = useCallback(
    (feature, layerId) => {
      if (!feature || !map) return;
      dispatch(
        setSelectedFeature({
          feature: [feature],
          metaData: { layer: { layer_id: layerId } },
        }),
      );
      try {
        const bounds = L.geoJSON(feature).getBounds();
        if (bounds?.isValid?.()) map.flyToBounds(bounds);
      } catch (e) {
        // ignore
      }
    },
    [dispatch, map],
  );

  const onFocusSource = useCallback(
    (src) => focusOnFeature(src.feature, src.layerId),
    [focusOnFeature],
  );
  const onFocusTarget = useCallback(
    (tgt) => focusOnFeature(tgt.feature, tgt.layerId),
    [focusOnFeature],
  );

  // ---- Run ----
  const handleRun = useCallback(async () => {
    const normalized = normalizeQueryConfig({
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
  function handleQueryComplete({ rows, matchedTargetLayer }) {
    if (!rows?.length || !matchedTargetLayer) {
      message.warning("No matches found");
      return;
    }

    const layerId = `spatial_query_${Date.now()}`;

    addLayerToMap({
      layerId,
      geoJsonData: matchedTargetLayer,
      metaData: {
        layer: {
          layer_nm: `Spatial Query: ${sourceLayerMeta?.label || selection.source.layerId} → ${targetLayerMeta?.label || selection.target.layerId}`,
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
  }

  // ---- Clear ----
  const handleClear = useCallback(() => {
    engine.reset();
    dispatch(setSpatialQuerySelection({ reset: true }));
    setOperation("");
  }, [engine, dispatch]);

  // ---- Minimized ----
  if (isMinimized) return <div style={{ width: "280px" }} />;

  // ---- Derived UI ----
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
      <Space direction="vertical" style={{ width: "100%" }} size={"small"}>
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
                  <Text strong style={{ fontSize: 12 }}>
                    Results ({engine.resultRows.length} matches)
                  </Text>
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
      </Space>
  );
}

export default SpatialQuery;