import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  Button,
  InputNumber,
  Select,
  Space,
  message,
  Typography,
  Checkbox,
  Alert,
  Divider,
  Badge,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import * as turf from "@turf/turf";
import { resetBuffer, setBufferLayer } from "../../store/slices/mapSlice";
import BufferAnalysisResults from "./BufferAnalysisResults";

const { Text } = Typography;

const UNITS = [
  { value: "meters", label: "Meters" },
  { value: "kilometers", label: "Kilometers" },
  { value: "miles", label: "Miles" },
  { value: "feet", label: "Feet" },
];

// Analysis chunk size for performance
const CHUNK_SIZE = 100;

// Initial analysis state
const initialAnalysisState = {
  status: "idle", // 'idle' | 'analyzing' | 'complete' | 'error'
  progress: 0,
  processedCount: 0,
  totalCount: 0,
  matchedFeatures: [],
  error: null,
  results: null,
};

function BufferTool({ clearDataOnClose = true, open = false }) {
  const dispatch = useDispatch();
  const multiSelected = useSelector((s) => s.map.multiSelectedFeatures);
  const bufferLayers = useSelector((s) => s.map.bufferLayers);
  const bufferOrder = useSelector((s) => s.map.bufferOrder) || [];
  const activeLayers = useSelector((s) => s.map.geoJsonLayers);

  const [distance, setDistance] = useState(100);
  const [unit, setUnit] = useState("meters");
  const [createdIds, setCreatedIds] = useState([]);
  const [selectedLayerIds, setSelectedLayerIds] = useState([]);
  const [analysisState, setAnalysisState] = useState(initialAnalysisState);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analysisAbortRef = useRef(null);

  // Get available layers for selection (excluding buffer layers)
  const availableLayers = useMemo(() => {
    const layers = [];
    Object.entries(activeLayers).forEach(([layerId, data]) => {
      if (data?.geoJsonData) {
        const layerName = data.metaData?.layer?.layer_nm || layerId;
        const featureCount = data.geoJsonData.features?.length || 0;
        layers.push({
          id: layerId,
          name: layerName,
          featureCount,
          data: data,
        });
      }
    });
    return layers;
  }, [activeLayers]);

  const selectedFeatures = useMemo(() => {
    const multi = Array.isArray(multiSelected) ? multiSelected : [];
    if (multi && multi.length > 0) {
      return multi.map((m) => ({ ...m }));
    }
    return [];
  }, [multiSelected]);

  const hasSelection = selectedFeatures.length > 0;
  const hasBuffer = Object.keys(bufferLayers).length > 0;
  const hasSelectedLayers = selectedLayerIds.length > 0;

  // Auto-select all layers when buffer is created
  useEffect(() => {
    if (
      hasBuffer &&
      availableLayers.length > 0 &&
      selectedLayerIds.length === 0
    ) {
      const allLayerIds = availableLayers.map((l) => l.id);
      setSelectedLayerIds(allLayerIds);
      resetAnalysisState();
    }
  }, [hasBuffer, availableLayers]);

  const resetAnalysisState = useCallback(() => {
    setAnalysisState(initialAnalysisState);
    setIsAnalyzing(false);
  }, []);

  const createBuffer = useCallback(() => {
    if (!hasSelection) {
      message.info("No selected features to buffer.");
      return;
    }
    if (!distance || Number(distance) <= 0) {
      message.error("Distance must be a positive number.");
      return;
    }

    try {
      const bufferedFeatures = [];
      selectedFeatures.forEach((sel) => {
        const feat = sel.feature;
        if (!feat || !feat.geometry) return;
        const input = feat.type === "Feature" ? feat : turf.feature(feat);
        const buf = turf.buffer(input, Number(distance), { units: unit });
        if (buf && buf.geometry) bufferedFeatures.push(buf);
      });

      if (bufferedFeatures.length === 0) {
        message.error("Buffer creation failed for selected features.");
        return;
      }

      const fc = turf.featureCollection(bufferedFeatures);
      const id = `buffer-${distance}${unit}-${Date.now()}`;

      dispatch(
        setBufferLayer({
          layerId: id,
          geoJsonData: fc,
          metaData: {
            layer: { layer_nm: `Buffer ${Date.now()}` },
            style: {
              geom_typ: "polygon",
              stroke_color: "#ff0000",
              fill_color: "#ff0000",
              fill_opacity: 0.25,
              stroke_width: 2,
            },
          },
          isActive: true,
        }),
      );

      setCreatedIds([id]);
      resetAnalysisState();
      message.success(
        "Buffer created. Select layers and click 'Start Analysis'.",
      );
    } catch (err) {
      console.error("Buffer error:", err);
      message.error("Error creating buffer");
    }
  }, [
    dispatch,
    hasSelection,
    distance,
    unit,
    selectedFeatures,
    resetAnalysisState,
  ]);

  const handleLayerSelection = useCallback(
    (layerId, checked) => {
      let newSelection;
      if (checked) {
        newSelection = [...selectedLayerIds, layerId];
      } else {
        newSelection = selectedLayerIds.filter((id) => id !== layerId);
      }
      setSelectedLayerIds(newSelection);
      resetAnalysisState();
    },
    [selectedLayerIds, resetAnalysisState],
  );

  const selectAllLayers = useCallback(() => {
    const allIds = availableLayers.map((l) => l.id);
    setSelectedLayerIds(allIds);
    resetAnalysisState();
  }, [availableLayers, resetAnalysisState]);

  const deselectAllLayers = useCallback(() => {
    setSelectedLayerIds([]);
    resetAnalysisState();
  }, [resetAnalysisState]);

  // Analysis engine with chunked processing
  const performAnalysis = useCallback(async () => {
    if (!hasBuffer) {
      message.warning("Please create a buffer first.");
      return;
    }

    if (!hasSelectedLayers) {
      message.warning("Please select at least one layer for analysis.");
      return;
    }

    // Get the buffer geometry
    const bufferEntries = Object.entries(bufferLayers);
    if (bufferEntries.length === 0) {
      message.error("No buffer found.");
      return;
    }

    const [bufferId, bufferData] = bufferEntries[0];
    const bufferGeoJson = bufferData.geoJsonData;

    if (
      !bufferGeoJson ||
      !bufferGeoJson.features ||
      bufferGeoJson.features.length === 0
    ) {
      message.error("Buffer has no valid geometry.");
      return;
    }

    // Get all features from selected layers
    const allFeatures = [];

    selectedLayerIds.forEach((layerId) => {
      const layerData = activeLayers[layerId];
      if (layerData?.geoJsonData?.features) {
        const features = layerData.geoJsonData.features.map(
          (feature, index) => ({
            feature,
            layerId,
            featureIndex: index,
          }),
        );
        allFeatures.push(...features);
      }
    });

    if (allFeatures.length === 0) {
      message.warning("No features found in selected layers.");
      return;
    }

    // Start the analysis
    setIsAnalyzing(true);
    setAnalysisState((prev) => ({
      ...prev,
      status: "analyzing",
      progress: 0,
      processedCount: 0,
      totalCount: allFeatures.length,
      matchedFeatures: [],
      error: null,
    }));

    const totalFeatureCount = allFeatures.length;
    const matched = [];
    let processed = 0;
    let isAborted = false;

    // Store abort function
    analysisAbortRef.current = () => {
      isAborted = true;
    };

    // Process in chunks
    const processChunk = (startIndex) => {
      if (isAborted) {
        setIsAnalyzing(false);
        setAnalysisState((prev) => ({
          ...prev,
          status: "idle",
        }));
        return;
      }

      const endIndex = Math.min(startIndex + CHUNK_SIZE, totalFeatureCount);
      const chunk = allFeatures.slice(startIndex, endIndex);

      // Process chunk synchronously
      for (const item of chunk) {
        try {
          const feature = item.feature;
          if (!feature?.geometry) continue;

          // Check if feature intersects with buffer
          const featureGeoJson =
            feature.type === "Feature" ? feature : turf.feature(feature);

          const intersects = turf.booleanIntersects(
            bufferGeoJson,
            featureGeoJson,
          );

          if (intersects) {
            matched.push({
              ...item,
              geometry: feature.geometry,
            });
          }
        } catch (err) {
          console.warn("Error processing feature:", err);
        }
        processed++;
      }

      // Update progress
      const progress = Math.round((processed / totalFeatureCount) * 100);
      setAnalysisState((prev) => ({
        ...prev,
        progress,
        processedCount: processed,
        matchedFeatures: matched,
      }));

      // Process next chunk if not complete
      if (processed < totalFeatureCount && !isAborted) {
        setTimeout(() => processChunk(endIndex), 0);
      } else if (!isAborted) {
        // Analysis complete
        const results = {
          totalFeatureCount: totalFeatureCount,
          matchedCount: matched.length,
          layers: selectedLayerIds.map((id) => {
            const matchedFeatures = matched.filter((m) => m.layerId === id);
            return {
              layerId: id,
              layerName: activeLayers[id]?.metaData?.layer?.layer_nm || id,
              totalFeatureCount:
                activeLayers[id]?.geoJsonData?.features?.length || 0,
              matchedFeatures,
              matchedFeatureCount: matchedFeatures.length,
            };
          }),
        };

        setIsAnalyzing(false);
        setAnalysisState((prev) => ({
          ...prev,
          status: "complete",
          progress: 100,
          results,
          matchedFeatures: matched,
        }));
        message.success(
          `Analysis complete! Found ${matched.length} matching features.`,
        );
      }
    };

    // Start processing
    setTimeout(() => processChunk(0), 0);
  }, [
    hasBuffer,
    hasSelectedLayers,
    bufferLayers,
    selectedLayerIds,
    activeLayers,
  ]);

  // Cancel analysis
  const cancelAnalysis = useCallback(() => {
    if (analysisAbortRef.current) {
      analysisAbortRef.current();
      analysisAbortRef.current = null;
      setIsAnalyzing(false);
      setAnalysisState((prev) => ({
        ...prev,
        status: "idle",
      }));
      message.info("Analysis cancelled");
    }
  }, []);

  const clearAllBuffers = useCallback(() => {
    if (analysisAbortRef.current) {
      analysisAbortRef.current();
      analysisAbortRef.current = null;
    }
    setCreatedIds([]);
    resetAnalysisState();
    dispatch(resetBuffer());
    message.success("Cleared buffers");
  }, [dispatch, resetAnalysisState]);

  const removeBuffer = useCallback(
    (id) => {
      if (!id) return;
      if (analysisAbortRef.current) {
        analysisAbortRef.current();
        analysisAbortRef.current = null;
      }
      dispatch(setBufferLayer({ layerId: id, isActive: false }));
      setCreatedIds((prev) => prev.filter((x) => x !== id));
      resetAnalysisState();
      message.success("Buffer removed");
    },
    [dispatch, resetAnalysisState],
  );

  // Lifecycle
  // clear createdIds if bufferOrder is empty (on tab change or external clear action call resetBuffers)
  useEffect(() => {
    if (bufferOrder.length === 0) {
      setCreatedIds([]);
      resetAnalysisState();
    }
  }, [bufferOrder, resetAnalysisState]);

  useEffect(() => {
    return () => {
      if (analysisAbortRef.current) {
        analysisAbortRef.current();
        analysisAbortRef.current = null;
      }
      if (clearDataOnClose) {
        clearAllBuffers();
      }
    };
  }, [clearDataOnClose, clearAllBuffers]);

  const handleClearResults = useCallback(() => {
    resetAnalysisState();
  }, [resetAnalysisState]);

  return (
    <>
      <Space direction="vertical" style={{ width: "100%" }} size="small">
        {/* Buffer Creation Section */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text strong style={{ fontSize: 13 }}>
              Selected features:
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {selectedFeatures.length}
            </Text>
          </div>
        </div>

        <div>
          <Text strong style={{ fontSize: 13 }}>
            Buffer Distance
          </Text>
          <div
            style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            <InputNumber
              min={0}
              value={distance}
              onChange={(v) => setDistance(v)}
              style={{ width: 100 }}
              disabled={hasBuffer}
              size="small"
            />
            <Select
              options={UNITS}
              value={unit}
              onChange={(v) => setUnit(v)}
              style={{ width: 120 }}
              disabled={hasBuffer}
              size="small"
            />

            {!hasBuffer ? (
              <Button
                type="primary"
                onClick={createBuffer}
                disabled={!hasSelection}
                size="small"
              >
                Create Buffer
              </Button>
            ) : (
              <Button
                danger
                onClick={clearAllBuffers}
                disabled={isAnalyzing}
                size="small"
              >
                Remove Buffers
              </Button>
            )}
          </div>

          {!hasSelection && !hasBuffer && (
            <Alert
              message="Select features on the map to create a buffer."
              type="info"
              showIcon
              style={{ marginTop: 6, fontSize: 12 }}
              size="small"
            />
          )}
        </div>

        <Divider style={{ margin: "6px 0" }} />

        {/* Layer Selection Section */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <Text strong style={{ fontSize: 13 }}>
              Select Layers
            </Text>
            <div>
              <Button
                size="small"
                onClick={selectAllLayers}
                disabled={!hasBuffer || !availableLayers.length}
                style={{ fontSize: 11 }}
              >
                All
              </Button>
              <Button
                size="small"
                onClick={deselectAllLayers}
                disabled={!hasBuffer}
                style={{ marginLeft: 4, fontSize: 11 }}
              >
                Clear
              </Button>
            </div>
          </div>

          {!hasBuffer ? (
            <Alert
              message="Create a buffer first"
              type="info"
              showIcon
              style={{ marginTop: 4, fontSize: 12 }}
              size="small"
            />
          ) : availableLayers.length === 0 ? (
            <Alert
              message="No layers available"
              type="warning"
              showIcon
              style={{ marginTop: 4, fontSize: 12 }}
              size="small"
            />
          ) : (
            <div
              style={{
                maxHeight: 120,
                overflow: "auto",
                border: "1px solid #d9d9d9",
                borderRadius: 4,
                padding: 6,
              }}
            >
              {availableLayers.map((layer) => (
                <div key={layer.id} style={{ padding: "2px 0" }}>
                  <Checkbox
                    checked={selectedLayerIds.includes(layer.id)}
                    onChange={(e) =>
                      handleLayerSelection(layer.id, e.target.checked)
                    }
                    style={{ fontSize: 12 }}
                  >
                    <Text style={{ fontSize: 12 }}>{layer.name}</Text>
                    <Text
                      type="secondary"
                      style={{ marginLeft: 6, fontSize: 11 }}
                    >
                      ({layer.featureCount})
                    </Text>
                  </Checkbox>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Start Analysis / Cancel Buttons */}
        <div style={{ display: "flex", gap: 6 }}>
          <Button
            type="primary"
            onClick={performAnalysis}
            disabled={!hasBuffer || !hasSelectedLayers || isAnalyzing}
            loading={isAnalyzing}
            style={{ flex: 1 }}
            size="small"
          >
            {isAnalyzing ? "Analyzing..." : "Start Analysis"}
          </Button>
          {isAnalyzing && (
            <Button onClick={cancelAnalysis} danger size="small">
              Cancel
            </Button>
          )}
        </div>

        {hasBuffer && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text type="secondary" style={{ fontSize: 11 }}>
              Buffer: {Object.keys(bufferLayers).join(", ")}
            </Text>
            <Badge
              status={
                analysisState.status === "complete"
                  ? "success"
                  : analysisState.status === "analyzing"
                    ? "processing"
                    : "default"
              }
              text={
                <Text style={{ fontSize: 11 }}>
                  {analysisState.status === "complete"
                    ? "Complete"
                    : analysisState.status === "analyzing"
                      ? "Analyzing"
                      : "Ready"}
                </Text>
              }
            />
          </div>
        )}

        {/* Results Component */}
        <BufferAnalysisResults
          analysisState={analysisState}
          activeLayers={activeLayers}
          selectedLayerIds={selectedLayerIds}
          onClear={handleClearResults}
        />
      </Space>
    </>
  );
}

export default memo(BufferTool);
