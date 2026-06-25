// src/components/SpatialAnalysis/CountPointsInPolygon.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Input,
  Form,
  Row,
  Col,
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
  PlusOutlined,
  WarningOutlined,
  NumberOutlined,
} from "@ant-design/icons";
import * as turf from "@turf/turf";
import { setTempGeoJsonLayer } from "../../store/slices/mapSlice";
const { Panel } = Collapse;

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

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

function CountPointsInPolygon() {
  const dispatch = useDispatch();
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers || {});
  const tempGeoJsonLayers = useSelector(
    (state) => state.map.tempGeoJsonLayers || {},
  );

  const [form] = Form.useForm();
  const [polygonLayerId, setPolygonLayerId] = useState(null);
  const [pointLayerId, setPointLayerId] = useState(null);
  const [countFieldName, setCountFieldName] = useState("COUNT");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLayerGenerated, setIsLayerGenerated] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [validationErrors, setValidationErrors] = useState([]);
  const [resultStatistics, setResultStatistics] = useState(null);

  // Get polygon layer options
  const polygonOptions = useMemo(() => {
    const options = [];

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

    return options;
  }, [geoJsonLayers, tempGeoJsonLayers]);

  // Get point layer options
  const pointOptions = useMemo(() => {
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
        });
      }
    });

    return options;
  }, [geoJsonLayers, tempGeoJsonLayers]);

  // Validate inputs
  const validateInputs = useCallback(() => {
    const errors = [];

    if (!polygonLayerId) {
      errors.push("Please select a polygon layer");
    }

    if (!pointLayerId) {
      errors.push("Please select a point layer");
    }

    if (!countFieldName || countFieldName.trim() === "") {
      errors.push("Please enter a count field name");
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(countFieldName)) {
      errors.push(
        "Field name must start with a letter or underscore and contain only letters, numbers, and underscores",
      );
    }

    // Check if field already exists in polygon layer
    if (polygonLayerId && countFieldName) {
      const polygonData = polygonOptions.find(
        (opt) => opt.value === polygonLayerId,
      );
      if (polygonData) {
        const features = polygonData.data.geoJsonData.features || [];
        if (features.length > 0) {
          const firstFeature = features[0];
          if (
            firstFeature.properties &&
            firstFeature.properties[countFieldName] !== undefined
          ) {
            errors.push(
              `Field "${countFieldName}" already exists in the polygon layer. Please use a different name.`,
            );
          }
        }
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [polygonLayerId, pointLayerId, countFieldName, polygonOptions]);

  // Add result layer to map
  const addToMap = useCallback(
    (resultLayer) => {
      if (!resultLayer) {
        message.warning("No results to add");
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

        message.success(
          `Count layer "${metaData.layer_nm}" added to map with ${metaData.feature_count} features!`,
        );

        setIsLayerGenerated(true);
      } catch (error) {
        console.error("Error adding layer to map:", error);
        message.error(`Failed to add layer: ${error.message}`);
      }
    },
    [dispatch],
  );

  // Count points in polygons
  const countPointsInPolygons = useCallback(async () => {
    if (!validateInputs()) {
      message.error("Please fix validation errors");
      return;
    }

    setIsProcessing(true);
    setIsLayerGenerated(false);
    setProgressPercent(0);
    setResultStatistics(null);

    try {
      const polygonData = polygonOptions.find(
        (opt) => opt.value === polygonLayerId,
      );
      const pointData = pointOptions.find((opt) => opt.value === pointLayerId);

      if (!polygonData || !pointData) {
        throw new Error("Selected layers not found");
      }

      const polygonFeatures = polygonData.data.geoJsonData.features || [];
      const pointFeatures = pointData.data.geoJsonData.features || [];

      if (polygonFeatures.length === 0) {
        message.warning("Polygon layer contains no features");
        setIsProcessing(false);
        return;
      }

      if (pointFeatures.length === 0) {
        message.warning("Point layer contains no features");
        setIsProcessing(false);
        return;
      }

      // Create spatial index for points (optimization)
      const pointIndex = turf.featureCollection(pointFeatures);

      // Count points in each polygon
      const resultFeatures = [];
      let pointsCounted = 0;
      let polygonsWithPoints = 0;

      const totalPolygons = polygonFeatures.length;
      let processed = 0;

      // Process polygons in chunks for better performance and UI feedback
      const chunkSize = 10;
      for (let i = 0; i < polygonFeatures.length; i += chunkSize) {
        const chunk = polygonFeatures.slice(i, i + chunkSize);

        const chunkResults = chunk.map((polygon, chunkIndex) => {
          const featureIndex = i + chunkIndex;
          const progress = ((featureIndex + 1) / totalPolygons) * 100;
          setProgressPercent(Math.round(progress));

          try {
            // Extract polygon geometry
            let geometry = polygon.geometry;
            if (geometry.type === "GeometryCollection") {
              const polyGeom = geometry.geometries.find(
                (g) => g.type === "Polygon" || g.type === "MultiPolygon",
              );
              if (!polyGeom) return null;
              geometry = polyGeom;
            }

            // Create polygon feature for Turf.js
            const polygonFeature = turf.feature(
              geometry,
              polygon.properties || {},
            );

            // Count points within polygon using pointsWithinPolygon
            const pointsWithin = turf.pointsWithinPolygon(
              pointIndex,
              polygonFeature,
            );
            const count = pointsWithin.features.length;

            pointsCounted += count;
            if (count > 0) polygonsWithPoints++;

            // Create result feature with original properties + count field
            const resultFeature = {
              type: "Feature",
              geometry: geometry,
              properties: {
                ...polygon.properties,
                [countFieldName]: count,
              },
            };

            return resultFeature;
          } catch (error) {
            console.warn(
              `Error processing polygon ${featureIndex + 1}:`,
              error,
            );
            return null;
          }
        });

        // Filter out null results and add to resultFeatures
        const validResults = chunkResults.filter((f) => f !== null);
        resultFeatures.push(...validResults);

        // Small delay to allow UI to update
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      if (resultFeatures.length === 0) {
        message.warning("No polygons could be processed");
        setIsProcessing(false);
        return;
      }

      // Create GeoJSON FeatureCollection
      const resultCollection = {
        type: "FeatureCollection",
        features: resultFeatures,
      };

      // Calculate statistics
      const counts = resultFeatures.map(
        (f) => f.properties[countFieldName] || 0,
      );
      const totalPoints = counts.reduce((a, b) => a + b, 0);
      const minCount = Math.min(...counts);
      const maxCount = Math.max(...counts);
      const avgCount = totalPoints / counts.length;

      setResultStatistics({
        totalPolygons: resultFeatures.length,
        totalPoints: totalPoints,
        polygonsWithPoints: polygonsWithPoints,
        polygonsWithoutPoints: resultFeatures.length - polygonsWithPoints,
        minCount: minCount,
        maxCount: maxCount,
        avgCount: avgCount.toFixed(2),
      });

      // Store result
      const layerName = `Count Points (${pointData.label}) in ${polygonData.label}`;
      const layerId = `count_${Date.now()}`;

      // Add to map
      addToMap({
        layerId: layerId,
        geoJsonData: resultCollection,
        metaData: {
          layer: {
            layer_nm: layerName,
            original_polygon_layer: polygonLayerId,
            original_point_layer: pointLayerId,
            count_field: countFieldName,
            feature_count: resultFeatures.length,
            total_polygons: polygonFeatures.length,
            total_points_counted: totalPoints,
            created: new Date().toISOString(),
            type: "count_result",
            success_rate: `${Math.round((resultFeatures.length / polygonFeatures.length) * 100)}%`,
          },
          style: {
            geom_typ: "G",
          },
        },
      });

      message.success(
        `Counted ${totalPoints} points in ${resultFeatures.length} polygons successfully!`,
      );
    } catch (error) {
      console.error("Error counting points:", error);
      message.error(`Failed to count points: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProgressPercent(100);
    }
  }, [
    polygonLayerId,
    pointLayerId,
    countFieldName,
    polygonOptions,
    pointOptions,
    validateInputs,
    addToMap,
  ]);

  // Clear all selections and results
  const clearAll = useCallback(() => {
    form.resetFields();
    setPolygonLayerId(null);
    setPointLayerId(null);
    setCountFieldName("COUNT");
    setIsLayerGenerated(false);
    setProgressPercent(0);
    setValidationErrors([]);
    setResultStatistics(null);
    message.info("Cleared all selections");
  }, [form]);

  // Handle polygon layer change
  const handlePolygonChange = useCallback((value) => {
    setPolygonLayerId(value);
    setValidationErrors([]);
  }, []);

  // Handle point layer change
  const handlePointChange = useCallback((value) => {
    setPointLayerId(value);
    setValidationErrors([]);
  }, []);

  // Render layer option with badge
  const renderLayerOption = (option) => ({
    label: (
      <Space size={4}>
        <Badge
          status={option.type === "main" ? "processing" : "default"}
          text={option.label}
        />
        <Tag
          color={option.type === "main" ? "blue" : "orange"}
          style={{ fontSize: 10, margin: 0 }}
        >
          {option.type === "main" ? "Main" : "Temp"}
        </Tag>
        <Tag color="green" style={{ fontSize: 10, margin: 0 }}>
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
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={4}>
      {/* Input Section */}
      <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
        <Form form={form} layout="vertical">
          <Form.Item
            label={<Text style={{ fontSize: 12 }}>Polygon Layer</Text>}
            required
            style={{ marginBottom: 6 }}
            validateStatus={
              validationErrors.some((e) => e.includes("polygon")) ? "error" : ""
            }
          >
            <Select
              placeholder="Choose polygon layer"
              style={{ width: "100%" }}
              value={polygonLayerId}
              onChange={handlePolygonChange}
              disabled={isProcessing}
              size="small"
              showSearch
              allowClear
              optionFilterProp="label"
              filterOption={filterOption}
              options={polygonOptions.map(renderLayerOption)}
            />
            {polygonOptions.length === 0 && (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space direction="vertical" align="center" size={2}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      No polygon layers found
                    </Text>
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      Add a polygon layer to use this tool
                    </Text>
                  </Space>
                }
                style={{ marginTop: 8 }}
              />
            )}
          </Form.Item>

          <Form.Item
            label={<Text style={{ fontSize: 12 }}>Point Layer</Text>}
            required
            style={{ marginBottom: 6 }}
            validateStatus={
              validationErrors.some((e) => e.includes("point")) ? "error" : ""
            }
          >
            <Select
              placeholder="Choose point layer"
              style={{ width: "100%" }}
              value={pointLayerId}
              onChange={handlePointChange}
              disabled={isProcessing}
              size="small"
              showSearch
              allowClear
              optionFilterProp="label"
              filterOption={filterOption}
              options={pointOptions.map(renderLayerOption)}
            />
          </Form.Item>

          <Form.Item
            label={<Text style={{ fontSize: 12 }}>Count Field</Text>}
            required
            style={{ marginBottom: 4 }}
            validateStatus={
              validationErrors.some(
                (e) => e.includes("field") || e.includes("name"),
              )
                ? "error"
                : ""
            }
            help={
              validationErrors.some(
                (e) => e.includes("field") || e.includes("name"),
              ) ? (
                <Text type="danger" style={{ fontSize: 10 }}>
                  {validationErrors.find(
                    (e) => e.includes("field") || e.includes("name"),
                  )}
                </Text>
              ) : null
            }
          >
            <Input
              prefix={<NumberOutlined />}
              placeholder="e.g., COUNT"
              value={countFieldName}
              onChange={(e) => {
                setCountFieldName(e.target.value);
                setValidationErrors([]);
              }}
              disabled={isProcessing}
              size="small"
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Form>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert
          message={<Text style={{ fontSize: 12 }}>Validation Errors</Text>}
          description={
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          }
          type="error"
          showIcon
          icon={<WarningOutlined style={{ fontSize: 12 }} />}
          closable
          style={{ padding: "4px 8px" }}
        />
      )}

      {/* Actions Section */}
      <Card size="small" bodyStyle={{ padding: "6px 12px" }}>
        <Flex gap={4}>
          <Button
            type="primary"
            // icon={<CalculatorOutlined />}
            onClick={countPointsInPolygons}
            loading={isProcessing}
            disabled={
              !polygonLayerId ||
              !pointLayerId ||
              !countFieldName ||
              isProcessing ||
              validationErrors.length > 0
            }
            size="small"
            style={{ flex: 1 }}
          >
            {isProcessing ? "Processing..." : "Count"}
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={clearAll}
            disabled={!polygonLayerId && !pointLayerId && !isLayerGenerated}
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
                  <Text style={{ fontSize: 11 }}>{percent}%</Text>
                </Space>
              )}
            />
          </div>
        )}
      </Card>

      {/* Statistics Section */}
      {resultStatistics && (
        <Card
          size="small"
          bodyStyle={{ padding: "6px 12px" }}
          title={
            <Space size={4}>
              <CheckOutlined style={{ color: "#52c41a", fontSize: 12 }} />
              <Text strong style={{ fontSize: 12 }}>
                Results
              </Text>
              <Tag color="green" style={{ fontSize: 10, margin: 0 }}>
                {resultStatistics.totalPoints} pts
              </Tag>
            </Space>
          }
        >
          <Row gutter={[4, 2]}>
            <Col span={8}>
              <Statistic
                title={<Text style={{ fontSize: 10 }}>Polygons</Text>}
                value={resultStatistics.totalPolygons}
                valueStyle={{ fontSize: 14 }}
                prefix={<DatabaseOutlined style={{ fontSize: 11 }} />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={<Text style={{ fontSize: 10 }}>With Points</Text>}
                value={resultStatistics.polygonsWithPoints}
                valueStyle={{ fontSize: 14 }}
                suffix={
                  <Text style={{ fontSize: 10, color: "#8c8c8c" }}>
                    /{resultStatistics.totalPolygons}
                  </Text>
                }
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={<Text style={{ fontSize: 10 }}>Without</Text>}
                value={resultStatistics.polygonsWithoutPoints}
                valueStyle={{ fontSize: 14 }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={<Text style={{ fontSize: 10 }}>Min</Text>}
                value={resultStatistics.minCount}
                valueStyle={{ fontSize: 14, color: "#3f8600" }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={<Text style={{ fontSize: 10 }}>Max</Text>}
                value={resultStatistics.maxCount}
                valueStyle={{ fontSize: 14, color: "#cf1322" }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={<Text style={{ fontSize: 10 }}>Avg</Text>}
                value={resultStatistics.avgCount}
                valueStyle={{ fontSize: 14 }}
              />
            </Col>
          </Row>
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
              "Select a polygon layer (target polygons)",
              "Select a point layer (points to count)",
              "Enter a name for the count field (e.g., NUMPOINTS)",
              'Click "Count Points" to perform the spatial join',
              "The result will be a new polygon layer with count field",
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

export default CountPointsInPolygon;
