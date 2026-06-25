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
          label: layerData.metaData?.layer_nm || layerId,
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
  const calculateFeatureCentroid = (feature, index) => {
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
        _centroid_from: feature.properties?.layer_nm || "Unknown",
        _centroid_id: `Centroid_${Date.now()}`+index,
      };

      return centroid;
    } catch (error) {
      console.warn("Error calculating centroid for feature:", error);
      return null;
    }
  };

  // Calculate centroids for entire layer
  const calculateCentroids = useCallback(() => {
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

      const geoJsonData = layerData.data.geoJsonData;
      const features = geoJsonData.features || [];

      if (features.length === 0) {
        message.warning("Selected layer contains no features");
        setIsProcessing(false);
        return;
      }

      // Calculate centroids for each feature with progress
      const centroids = [];

      features.forEach((feature, index) => {
        const centroid = calculateFeatureCentroid(feature, index);
        if (centroid) {
          centroids.push(centroid);
        }

        // Update progress
        setProgressPercent(Math.round(((index + 1) / features.length) * 100));
      });

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
            geom_typ: "P"
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
  }, [selectedLayerId, layerOptions]);

  // Clear current selection and results
  const clearAll = useCallback(() => {
    setSelectedLayerId(null);
    setIsLayerGenerated(null);
    setProgressPercent(0);
    message.info("Cleared all data");
  }, []);

  // Render layer option with badge
  const renderLayerOption = (option) => (
    <Space>
      <Badge
        status={option.type === "main" ? "processing" : "default"}
        text={option.label}
      />
      <Tag
        color={option.type === "main" ? "blue" : "orange"}
        style={{ fontSize: 10 }}
      >
        {option.type === "main" ? "Main" : "Temp"}
      </Tag>
      <Tag color="green" style={{ fontSize: 10 }}>
        {option.feature_count} features
      </Tag>
    </Space>
  );

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      {/* Layer Selection Section */}
      <Card
        size="small"
        type="inner"
        title={
          <Space>
            <DatabaseOutlined />
            <Text strong>Select Input Layer</Text>
          </Space>
        }
      >
        <Select
          placeholder={
            <Space>
              <FileOutlined />
              Choose a polygon layer
            </Space>
          }
          style={{ width: "100%" }}
          value={selectedLayerId}
          onChange={setSelectedLayerId}
          disabled={isProcessing}
          size="large"
          showSearch
          filterOption={(input, option) =>
            option.children.props?.text
              ?.toLowerCase()
              .includes(input.toLowerCase())
          }
        >
          {layerOptions.map((option) => (
            <Option key={option.value} value={option.value}>
              {renderLayerOption(option)}
            </Option>
          ))}
        </Select>

        {layerOptions.length === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" align="center">
                <Text type="secondary">No polygon layers found</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Add a polygon layer to use the centroid tool
                </Text>
              </Space>
            }
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {/* Actions Section */}
      <Card size="small" type="inner">
        <Flex gap="small" wrap>
          <Button
            type="primary"
            icon={<CalculatorOutlined />}
            onClick={calculateCentroids}
            loading={isProcessing}
            disabled={!selectedLayerId || isProcessing}
            size="large"
            style={{ flex: 1 }}
          >
            {isProcessing ? "Processing..." : "Calculate Centroids"}
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={clearAll}
            disabled={!selectedLayerId && !isLayerGenerated}
            size="large"
          >
            Clear
          </Button>
        </Flex>

        {isProcessing && (
          <div style={{ marginTop: 12 }}>
            <Progress
              percent={progressPercent}
              status="active"
              strokeColor={{
                from: "#108ee9",
                to: "#87d068",
              }}
              format={(percent) => (
                <Space>
                  <Spin indicator={<LoadingOutlined spin />} size="small" />
                  <Text>{percent}%</Text>
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
          // type="inner"
          style={{ borderColor: "#52c41a" }}
        >
          <Space>
            <CheckOutlined style={{ color: "#52c41a" }} />
            <Text strong style={{ color: "#52c41a" }}>
              Results Generated
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
              "Select a polygon layer from the dropdown",
              'Click "Calculate Centroids" to generate centroids',
              "Preview results before adding to map",
              'Click "Add to Map" to display centroids as a temporary layer',
            ]}
            renderItem={(item) => (
              <List.Item style={{ padding: "4px 0" }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
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
