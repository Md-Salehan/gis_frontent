import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Descriptions,
} from "antd";
import {
  CalculatorOutlined,
  CloseOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  FileOutlined,
  DatabaseOutlined,
  AimOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import * as turf from "@turf/turf";
import { setTempGeoJsonLayer } from "../../store/slices/mapSlice";

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

function Centroid() {
  const dispatch = useDispatch();
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers || {});
  const tempGeoJsonLayers = useSelector(
    (state) => state.map.tempGeoJsonLayers || {},
  );

  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLayerGenerated, setIsLayerGenerated] = useState(false);
  const [layerOptions, setLayerOptions] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);

  // Extract polygon layers from Redux state
  useEffect(() => {
    const options = [];

    // Check main geoJsonLayers
    Object.entries(geoJsonLayers).forEach(([layerId, layerData]) => {
      if (layerData?.geoJsonData && isPolygonLayer(layerData.geoJsonData)) {
        options.push({
          value: layerId,
          label: layerData.metaData?.layer?.layer_nm || layerId,
          type: "main",
          data: layerData,
          feature_count: layerData.geoJsonData.features?.length || 0,
        });
      }
    });

    // Check temp layers
    Object.entries(tempGeoJsonLayers).forEach(([layerId, layerData]) => {
      if (layerData?.geoJsonData && isPolygonLayer(layerData.geoJsonData)) {
        options.push({
          value: layerId,
          label: layerData.metaData?.layer?.layer_nm || layerId,
          type: "temp",
          data: layerData,
          feature_count: layerData.geoJsonData.features?.length || 0,
        });
      }
    });

    setLayerOptions(options);
  }, [geoJsonLayers, tempGeoJsonLayers]);

  // Helper to check if layer contains polygons
  const isPolygonLayer = (geoJsonData) => {
    if (!geoJsonData) return false;

    const features = geoJsonData.features || [];
    if (features.length === 0) return false;

    return features.some((feature) => {
      const geomType = feature.geometry?.type;
      return (
        geomType === "Polygon" ||
        geomType === "MultiPolygon" ||
        (geomType === "GeometryCollection" &&
          feature.geometry?.geometries?.some(
            (g) => g.type === "Polygon" || g.type === "MultiPolygon",
          ))
      );
    });
  };

  // Add centroid layer to map
  const addToMap = useCallback(
    (resultLayer) => {
      if (!resultLayer) {
        message.warning("No centroid results to add");
        return;
      }

      try {
        const { layerId, geoJsonData, metaData } = resultLayer;

        dispatch(
          setTempGeoJsonLayer({
            layerId: layerId,
            geoJsonData: geoJsonData,
            metaData: metaData,
            isActive: true,
          }),
        );

        message.success(`Centroid layer "${metaData.layer_nm}" added to map!`);

        setIsLayerGenerated(null);
      } catch (error) {
        console.error("Error adding layer to map:", error);
        message.error(`Failed to add layer: ${error.message}`);
      }
    },
    [dispatch],
  );

  // Calculate centroids for a single feature
  const calculateFeatureCentroid = (feature, layerMetaData, index) => {
    try {
      let geometry = feature.geometry;
      if (geometry.type === "GeometryCollection") {
        const polyGeom = geometry.geometries.find(
          (g) => g.type === "Polygon" || g.type === "MultiPolygon",
        );
        if (!polyGeom) return null;
        geometry = polyGeom;
      }

      const centroid = turf.centroid({
        type: "Feature",
        geometry: geometry,
        properties: feature.properties || {},
      });

      centroid.properties = {
        ...feature.properties,
        _centroid_from: layerMetaData?.layer?.layer_nm || "Unknown",
        _centroid_id: `Centroid_${Date.now()}` + index,
      };

      return centroid;
    } catch (error) {
      console.warn("Error calculating centroid for feature:", error);
      return null;
    }
  };

  // Calculate centroids for entire layer
  const calculateCentroids = useCallback(async () => {
    if (!selectedLayerId) {
      message.warning("Please select a polygon layer first");
      return;
    }

    setIsProcessing(true);
    setIsLayerGenerated(null);
    setProgressPercent(0);

    try {
      const layerData = layerOptions.find(
        (opt) => opt.value === selectedLayerId,
      );
      if (!layerData) {
        throw new Error("Layer not found");
      }

      const geoJsonData = layerData?.data?.geoJsonData || null;
      const layerMetaData = layerData?.data?.metaData || {};

      // Calculate centroids for each feature with progress
      const features = geoJsonData?.features || [];
      const centroids = [];
      const chunkSize = 5;

      if (features.length === 0) {
        message.warning("Selected layer contains no features");
        setIsProcessing(false);
        return;
      }

      for (let i = 0; i < features.length; i += chunkSize) {
        const chunk = features.slice(i, i + chunkSize);
        // Update progress
        setProgressPercent(Math.round(((i + 1) / features.length) * 100));

        const chunkResults = chunk.map((feature, index) => {
          const centroid = calculateFeatureCentroid(
            feature,
            layerMetaData,
            index,
          );
          if (centroid) {
            return centroid;
          } else {
            return null;
          }
        });

        // Filter out null results and add to resultFeatures
        const validResults = chunkResults.filter((f) => f !== null);
        centroids.push(...validResults);

        // Small delay to allow UI to update
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      if (centroids.length === 0) {
        message.warning(
          "No centroids could be calculated from the selected layer",
        );
        setIsProcessing(false);
        return;
      }

      // Create GeoJSON FeatureCollection
      const centroidCollection = {
        type: "FeatureCollection",
        features: centroids,
      };

      // Store result
      setIsLayerGenerated(true);
      addToMap({
        layerId: `centroid_${Date.now()}`,
        geoJsonData: centroidCollection,
        metaData: {
          layer: {
            layer_nm: `Centroids of ${layerData.label}`,
            original_layer: selectedLayerId,
            original_layer_nm: layerData.label,
            feature_count: centroids.length,
            total_features: features.length,
            created: new Date().toISOString(),
            type: "centroid_result",
            success_rate: `${Math.round((centroids.length / features.length) * 100)}%`,
          },
          style: {
            geom_typ: "P",
          },
        },
      });
      message.success(`Generated ${centroids.length} centroids successfully!`);
    } catch (error) {
      console.error("Error calculating centroids:", error);
      message.error(`Failed to calculate centroids: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProgressPercent(100);
    }
  }, [selectedLayerId, layerOptions, addToMap]);

  // Clear current selection and results
  const clearAll = useCallback(() => {
    setSelectedLayerId(null);
    setIsLayerGenerated(null);
    setProgressPercent(0);
    message.info("Cleared all data");
  }, []);

  // Handle layer selection change
  const handleLayerChange = useCallback((value) => {
    setSelectedLayerId(value);
  }, []);

  // Render layer option with badge (used for select options)
  const renderLayerOption = (option) => ({
    label: (
      <Space size={4}>
        <Badge
          status={option.type === "main" ? "processing" : "default"}
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

  return (
    <Space direction="vertical" style={{ width: "280px" }} size="small">
      {/* Layer Selection Section */}
      <Card
        size="small"
        type="inner"
        styles={{ body: { padding: "8px 12px" } }}
        title={
          <Space size={4}>
            <DatabaseOutlined style={{ fontSize: 14 }} />
            <Text strong style={{ fontSize: 13 }}>
              Select Layer
            </Text>
          </Space>
        }
      >
        <Select
          placeholder="Choose polygon layer"
          style={{ width: "100%" }}
          value={selectedLayerId}
          onChange={handleLayerChange}
          disabled={isProcessing}
          size="small"
          showSearch
          allowClear
          optionFilterProp="label"
          filterOption={(input, option) => {
            const labelText =
              option?.label?.props?.children
                ?.map((child) => {
                  if (typeof child === "string") return child;
                  if (child?.props?.text) return child.props.text;
                  if (child?.props?.children) {
                    if (Array.isArray(child.props.children)) {
                      return child.props.children
                        .map((c) => {
                          if (typeof c === "string") return c;
                          if (c?.props?.text) return c.props.text;
                          return "";
                        })
                        .join(" ");
                    }
                    return child.props.children;
                  }
                  return "";
                })
                ?.join(" ") || "";

            return labelText.toLowerCase().includes(input.toLowerCase());
          }}
          options={layerOptions.map(renderLayerOption)}
        />

        {layerOptions.length === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary" style={{ fontSize: 12 }}>
                No polygon layers found
              </Text>
            }
            style={{ marginTop: 8, marginBottom: 4 }}
          />
        )}
      </Card>

      {/* Actions Section */}
      <Card
        size="small"
        type="inner"
        styles={{ body: { padding: "8px 12px" } }}
      >
        <Flex gap={6}>
          <Button
            type="primary"
            icon={<CalculatorOutlined />}
            onClick={calculateCentroids}
            loading={isProcessing}
            disabled={!selectedLayerId || isProcessing}
            size="small"
            style={{ flex: 1 }}
          >
            {isProcessing ? "Processing" : "Calculate"}
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={clearAll}
            disabled={!selectedLayerId && !isLayerGenerated}
            size="small"
          >
            Clear
          </Button>
        </Flex>

        {isProcessing && (
          <div style={{ marginTop: 6 }}>
            <Progress
              percent={progressPercent}
              status="active"
              strokeColor={{
                from: "#108ee9",
                to: "#87d068",
              }}
              size="small"
              format={(percent) => (
                <Space size={4}>
                  <Spin indicator={<LoadingOutlined spin />} size="small" />
                  <Text style={{ fontSize: 12 }}>{percent}%</Text>
                </Space>
              )}
            />
          </div>
        )}
      </Card>

      {/* Results Section */}
      {isLayerGenerated && (
        <Card
          size="small"
          styles={{ body: { padding: "6px 12px" } }}
          style={{ borderColor: "#52c41a" }}
        >
          <Space size={4}>
            <CheckOutlined style={{ color: "#52c41a", fontSize: 14 }} />
            <Text strong style={{ color: "#52c41a", fontSize: 13 }}>
              Centroids Generated
            </Text>
          </Space>
        </Card>
      )}

      {/* Help Section */}
      <Collapse
        ghost
        size="small"
        defaultActiveKey={[]}
        style={{ background: "transparent" }}
      >
        <Panel
          header={
            <Space size={4}>
              <InfoCircleOutlined style={{ fontSize: 12 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Help
              </Text>
            </Space>
          }
          key="help"
        >
          <List
            size="small"
            dataSource={["Select polygon layer", "Click Calculate"]}
            renderItem={(item) => (
              <List.Item style={{ padding: "2px 0" }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  • {item}
                </Text>
              </List.Item>
            )}
          />
        </Panel>
      </Collapse>
    </Space>
  );
}

export default Centroid;
