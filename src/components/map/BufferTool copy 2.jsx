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
  List,
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
  const geoJsonLayers = useSelector((s) => s.map.geoJsonLayers);

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
    Object.entries(geoJsonLayers).forEach(([layerId, data]) => {
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
  }, [geoJsonLayers]);

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
    const layerFeatureMap = {};

    selectedLayerIds.forEach((layerId) => {
      const layerData = geoJsonLayers[layerId];
      if (layerData?.geoJsonData?.features) {
        const features = layerData.geoJsonData.features.map(
          (feature, index) => ({
            feature,
            layerId,
            featureIndex: index,
          }),
        );
        allFeatures.push(...features);
        layerFeatureMap[layerId] = features.length;
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

    const totalFeatures = allFeatures.length;
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

      const endIndex = Math.min(startIndex + CHUNK_SIZE, totalFeatures);
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
      const progress = Math.round((processed / totalFeatures) * 100);
      setAnalysisState((prev) => ({
        ...prev,
        progress,
        processedCount: processed,
        matchedFeatures: matched,
      }));

      // Process next chunk if not complete
      if (processed < totalFeatures && !isAborted) {
        setTimeout(() => processChunk(endIndex), 10000);
      } else if (!isAborted) {
        // Analysis complete
        const results = {
          totalFeatures,
          matchedCount: matched.length,
          layers: selectedLayerIds.map((id) => ({
            layerId: id,
            layerName: geoJsonLayers[id]?.metaData?.layer?.layer_nm || id,
            totalFeatures: layerFeatureMap[id] || 0,
            matchedFeatures: matched.filter((m) => m.layerId === id).length,
          })),
          matchedFeatures: matched,
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
    geoJsonLayers,
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
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        {/* Buffer Creation Section */}
        <div>
          <Text strong>Selected features:</Text>{" "}
          <Text type="secondary">
            {selectedFeatures.length}
          </Text>
          {/* <div style={{ marginTop: 6 }}>
            <Text type="secondary">
              {selectedFeatures.length} feature(s) selected
            </Text>
          </div> */}
        </div>

        <div>
          <Text strong>Buffer Distance</Text>
          <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
            <InputNumber
              min={0}
              value={distance}
              onChange={(v) => setDistance(v)}
              style={{ width: 140 }}
            />
            <Select
              options={UNITS}
              value={unit}
              onChange={(v) => setUnit(v)}
              style={{ width: 160 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Button
            type="primary"
            onClick={createBuffer}
            disabled={!hasSelection}
          >
            Create Buffer
          </Button>
          <Button onClick={clearAllBuffers} danger>
            Clear All
          </Button>
        </div>

        <Divider />

        {/* Layer Selection Section */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text strong>Select Layers for Analysis</Text>
            <div>
              <Button
                size="small"
                onClick={selectAllLayers}
                disabled={!hasBuffer || !availableLayers.length}
              >
                Select All
              </Button>
              <Button
                size="small"
                onClick={deselectAllLayers}
                disabled={!hasBuffer}
                style={{ marginLeft: 4 }}
              >
                Clear
              </Button>
            </div>
          </div>

          {!hasBuffer ? (
            <Alert
              message="Create a buffer first to enable layer selection"
              type="info"
              showIcon
              style={{ marginTop: 8 }}
            />
          ) : availableLayers.length === 0 ? (
            <Alert
              message="No layers available for analysis"
              type="warning"
              showIcon
              style={{ marginTop: 8 }}
            />
          ) : (
            <div
              style={{
                maxHeight: 150,
                overflow: "auto",
                border: "1px solid #d9d9d9",
                borderRadius: 4,
                padding: 8,
              }}
            >
              {availableLayers.map((layer) => (
                <div key={layer.id} style={{ padding: "4px 0" }}>
                  <Checkbox
                    checked={selectedLayerIds.includes(layer.id)}
                    onChange={(e) =>
                      handleLayerSelection(layer.id, e.target.checked)
                    }
                  >
                    <Text>{layer.name}</Text>
                    <Text
                      type="secondary"
                      style={{ marginLeft: 8, fontSize: 12 }}
                    >
                      ({layer.featureCount} features)
                    </Text>
                  </Checkbox>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Start Analysis / Cancel Buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            type="primary"
            onClick={performAnalysis}
            disabled={!hasBuffer || !hasSelectedLayers || isAnalyzing}
            loading={isAnalyzing}
            style={{ flex: 1 }}
          >
            {isAnalyzing ? "Analyzing..." : "Start Analysis"}
          </Button>
          {isAnalyzing && (
            <Button onClick={cancelAnalysis} danger>
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
            <Text type="secondary" style={{ fontSize: 12 }}>
              Buffer active: {Object.keys(bufferLayers).join(", ")}
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
                analysisState.status === "complete"
                  ? "Complete"
                  : analysisState.status === "analyzing"
                    ? "Analyzing"
                    : "Ready"
              }
            />
          </div>
        )}

        {/* Results Component */}
        <BufferAnalysisResults
          analysisState={analysisState}
          geoJsonLayers={geoJsonLayers}
          selectedLayerIds={selectedLayerIds}
          onClear={handleClearResults}
        />

        {/* Created buffers list */}
        <div>
          <Text strong>Created Buffers</Text>
          <List
            size="small"
            bordered
            style={{ marginTop: 8, maxHeight: 100, overflow: "auto" }}
            dataSource={[...createdIds].reverse()}
            locale={{ emptyText: "No buffers created" }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button size="small" onClick={() => removeBuffer(item)}>
                    Remove
                  </Button>,
                ]}
              >
                <Text code>{item}</Text>
              </List.Item>
            )}
          />
        </div>
      </Space>
    </>
  );
}

export default memo(BufferTool);
