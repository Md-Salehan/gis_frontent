// BufferTool.jsx
import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  Form,
  InputNumber,
  Select,
  Button,
  Space,
  Divider,
  Card,
  Tag,
  List,
  Typography,
  Alert,
  Spin,
  message,
  Row,
  Col,
  Switch,
  Slider,
  Collapse
} from "antd";
import CustomDrawer from "../common/CustomDrawer";
import { useDispatch, useSelector } from "react-redux";
import * as turf from "@turf/turf";
import { toggleBuffer } from "../../store/slices/uiSlice";
import { setMultiSelectedFeatures } from "../../store/slices/mapSlice";
import { GeoJSON } from "react-leaflet";
import { DownloadOutlined, FilterOutlined, InfoCircleOutlined } from "@ant-design/icons";

const { Option } = Select;
const { Text, Title } = Typography;
const { Panel } = Collapse;

// Debounce utility function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

function BufferTool() {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.ui.isBufferOpen);
  const selectedFeature = useSelector((state) => state.map.selectedFeature);
  const multiSelectedFeatures = useSelector((state) => state.map.multiSelectedFeatures);
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  
  const [form] = Form.useForm();
  const [bufferLayer, setBufferLayer] = useState(null);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [bufferOptions, setBufferOptions] = useState({
    mergeBuffers: true,
    highPrecision: false,
    steps: 8
  });
  const [filterCriteria, setFilterCriteria] = useState({
    layer: 'all',
    distanceRange: [0, 10000],
    geometryType: 'all'
  });

  // Buffer configuration
  const units = [
    { value: "meters", label: "Meters", conversion: 1 },
    { value: "kilometers", label: "Kilometers", conversion: 1000 },
    { value: "miles", label: "Miles", conversion: 1609.34 },
    { value: "feet", label: "Feet", conversion: 0.3048 }
  ];

  // Get all features from active layers for analysis
  const allFeatures = useMemo(() => {
    const features = [];
    Object.values(geoJsonLayers).forEach(layerData => {
      if (layerData?.geoJsonData?.features) {
        layerData.geoJsonData.features.forEach(feature => {
          features.push({
            ...feature,
            layerId: layerData.metaData?.layerId,
            layerName: layerData.metaData?.name || 'Unknown Layer'
          });
        });
      }
    });
    return features;
  }, [geoJsonLayers]);

  // Helper function to get source features
  const getSourceFeatures = useCallback(() => {
    const singleFeatures = selectedFeature.feature?.length > 0 
      ? selectedFeature.feature 
      : [];
    
    const multiFeatures = multiSelectedFeatures.length > 0
      ? multiSelectedFeatures.map(f => f.feature)
      : [];
    
    return [...singleFeatures, ...multiFeatures].filter(Boolean);
  }, [selectedFeature, multiSelectedFeatures]);

  // Get source feature info for display
  const getSourceFeatureInfo = useCallback(() => {
    const sourceFeatures = getSourceFeatures();
    
    if (sourceFeatures.length === 0) {
      return { count: 0, types: [] };
    }
    
    const types = [...new Set(sourceFeatures.map(f => f.geometry?.type))].filter(Boolean);
    
    return {
      count: sourceFeatures.length,
      types: types
    };
  }, [getSourceFeatures]);

  // Input validation
  const validateInputs = useCallback((values) => {
    const { distance, unit } = values;
    
    if (distance <= 0) {
      throw new Error("Buffer distance must be greater than 0");
    }
    
    if (distance > 1000000) {
      throw new Error("Buffer distance is too large. Maximum is 1,000,000");
    }
    
    return true;
  }, []);

  // Generate buffer
  const generateBuffer = useCallback(async (values) => {
    setIsGenerating(true);
    try {
      // Validate inputs
      validateInputs(values);
      
      const { distance, unit } = values;
      const selectedUnit = units.find(u => u.value === unit);
      const distanceInMeters = distance * selectedUnit.conversion;

      // Get source features
      const sourceFeatures = getSourceFeatures();
      
      if (!sourceFeatures || sourceFeatures.length === 0) {
        throw new Error("Please select one or more features on the map");
      }

      // Validate geometry types
      const validGeometries = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
      const invalidFeatures = sourceFeatures.filter(feature => 
        !validGeometries.includes(feature.geometry?.type)
      );
      
      if (invalidFeatures.length > 0) {
        throw new Error(`Unsupported geometry types: ${invalidFeatures.map(f => f.geometry?.type).join(', ')}`);
      }

      // Create buffers with options
      const buffers = sourceFeatures.map(feature => {
        try {
          return turf.buffer(feature, distanceInMeters / 1000, { 
            units: 'kilometers',
            steps: bufferOptions.highPrecision ? 64 : bufferOptions.steps
          });
        } catch (error) {
          console.warn("Failed to create buffer for feature:", error);
          return null;
        }
      }).filter(Boolean);

      if (buffers.length === 0) {
        throw new Error("Could not generate buffer from selected features");
      }

      // Combine buffers based on option
      let combinedBuffer;
      if (buffers.length > 1 && bufferOptions.mergeBuffers) {
        combinedBuffer = turf.union(...buffers);
      } else if (buffers.length > 1) {
        combinedBuffer = {
          type: "FeatureCollection",
          features: buffers
        };
      } else {
        combinedBuffer = buffers[0];
      }

      // Calculate buffer statistics
      const bufferArea = turf.area(combinedBuffer);
      const bufferPerimeter = turf.length(combinedBuffer, { units: 'kilometers' }) * 1000;

      const styledBuffer = {
        ...combinedBuffer,
        properties: {
          ...combinedBuffer.properties,
          bufferDistance: distance,
          bufferUnit: unit,
          bufferArea,
          bufferPerimeter,
          isBuffer: true,
          featureCount: sourceFeatures.length,
          style: {
            color: "#ff0000",
            weight: 2,
            opacity: 0.8,
            fillColor: "#ff0000",
            fillOpacity: 0.3
          }
        }
      };

      setBufferLayer(styledBuffer);
      performProximityAnalysis(styledBuffer, distanceInMeters);

    } catch (error) {
      console.error("Buffer generation failed:", error);
      message.error(`Buffer generation failed: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedFeature, multiSelectedFeatures, units, bufferOptions, getSourceFeatures]);

  // Perform proximity analysis
  const performProximityAnalysis = useCallback((bufferGeometry, distanceInMeters) => {
    const results = [];
    const sourceFeatures = getSourceFeatures();
    
    allFeatures.forEach(feature => {
      try {
        // Skip if feature is part of the buffer or source features
        if (feature.properties?.isBuffer || sourceFeatures.includes(feature)) return;
        
        // Check intersection
        const intersects = turf.booleanIntersects(feature, bufferGeometry);
        
        if (intersects) {
          // Calculate precise distance
          let minDistance = Infinity;
          
          sourceFeatures.forEach(source => {
            try {
              const distance = turf.distance(source, feature, { units: 'kilometers' }) * 1000;
              if (distance < minDistance) {
                minDistance = distance;
              }
            } catch (e) {
              // Use center points for incompatible geometries
              try {
                const sourceCenter = turf.center(source);
                const featureCenter = turf.center(feature);
                const distance = turf.distance(sourceCenter, featureCenter, { units: 'kilometers' }) * 1000;
                if (distance < minDistance) minDistance = distance;
              } catch (centerError) {
                console.warn("Distance calculation failed:", centerError);
              }
            }
          });

          // Categorize by distance
          const distanceCategory = minDistance <= distanceInMeters * 0.3 ? 'Very Close' :
                                 minDistance <= distanceInMeters * 0.6 ? 'Close' :
                                 'Within Buffer';
          
          results.push({
            feature,
            layerName: feature.layerName,
            distance: minDistance,
            distanceCategory,
            properties: feature.properties,
            geometryType: feature.geometry?.type,
            area: feature.geometry?.type === 'Polygon' ? 
                  turf.area(feature) : null
          });
        }
      } catch (error) {
        console.warn("Error analyzing feature:", error);
      }
    });

    // Sort and categorize results
    const sortedResults = results.sort((a, b) => a.distance - b.distance);
    setAnalysisResults(sortedResults);
    
    // Update distance range filter
    if (sortedResults.length > 0) {
      const maxDistance = Math.ceil(sortedResults[sortedResults.length - 1].distance);
      setFilterCriteria(prev => ({
        ...prev,
        distanceRange: [0, maxDistance]
      }));
    }
  }, [allFeatures, getSourceFeatures]);

  // Debounced analysis for performance
  const debouncedAnalysis = useMemo(() => 
    debounce((bufferGeometry, distanceInMeters) => {
      performProximityAnalysis(bufferGeometry, distanceInMeters);
    }, 500),
    [performProximityAnalysis]
  );

  // Clear buffer and results
  const clearBuffer = useCallback(() => {
    setBufferLayer(null);
    setAnalysisResults([]);
    form.resetFields();
  }, [form]);

  // Highlight features in analysis results
  const highlightFeatures = useCallback(() => {
    const featuresToHighlight = analysisResults.map(result => ({
      feature: result.feature,
      metaData: { 
        layerId: result.feature.layerId,
        name: result.feature.layerName 
      }
    }));
    
    dispatch(setMultiSelectedFeatures(featuresToHighlight));
    message.success(`Highlighted ${featuresToHighlight.length} features`);
  }, [analysisResults, dispatch]);

  // Export analysis results
  const exportAnalysisResults = useCallback(() => {
    if (analysisResults.length === 0) {
      message.info("No analysis results to export");
      return;
    }

    const headers = ['Name', 'Layer', 'Geometry Type', 'Distance (m)', 'Category', 'Area (ha)'];
    const csvData = analysisResults.map(result => [
      result.properties?.name || result.properties?.id || 'Unknown',
      result.layerName,
      result.geometryType,
      result.distance.toFixed(2),
      result.distanceCategory,
      result.area ? (result.area / 10000).toFixed(2) : 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buffer-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    message.success(`Exported ${analysisResults.length} features to CSV`);
  }, [analysisResults]);

  // Filtered results
  const filteredResults = useMemo(() => {
    return analysisResults.filter(result => {
      const layerMatch = filterCriteria.layer === 'all' || 
                        result.layerName === filterCriteria.layer;
      const distanceMatch = result.distance >= filterCriteria.distanceRange[0] && 
                           result.distance <= filterCriteria.distanceRange[1];
      const geometryMatch = filterCriteria.geometryType === 'all' || 
                           result.geometryType === filterCriteria.geometryType;
      
      return layerMatch && distanceMatch && geometryMatch;
    });
  }, [analysisResults, filterCriteria]);

  // Get unique layers and geometry types for filters
  const availableLayers = useMemo(() => {
    return [...new Set(analysisResults.map(r => r.layerName))];
  }, [analysisResults]);

  const availableGeometryTypes = useMemo(() => {
    return [...new Set(analysisResults.map(r => r.geometryType))];
  }, [analysisResults]);

  // Buffer Statistics Component
  const BufferStatistics = useMemo(() => {
    if (!bufferLayer) return null;

    return (
      <Card size="small" title="Buffer Statistics" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>Area:</Text>
            <Text strong>{(bufferLayer.properties.bufferArea / 1000000).toFixed(2)} km²</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>Perimeter:</Text>
            <Text strong>{bufferLayer.properties.bufferPerimeter.toFixed(2)} m</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>Features in Buffer:</Text>
            <Text strong>{analysisResults.length}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>Source Features:</Text>
            <Text strong>{bufferLayer.properties.featureCount}</Text>
          </div>
        </Space>
      </Card>
    );
  }, [bufferLayer, analysisResults]);

  // Render buffer layer as GeoJSON
  const renderBufferLayer = useCallback(() => {
    if (!bufferLayer) return null;

    return (
      <GeoJSON
        key="buffer-layer"
        data={bufferLayer}
        style={{
          color: "#ff0000",
          weight: 2,
          opacity: 0.8,
          fillColor: "#ff0000",
          fillOpacity: 0.3
        }}
        interactive={false}
        pane="pane-selected-features"
      />
    );
  }, [bufferLayer]);

  const hasSelectedFeatures = getSourceFeatures().length > 0;
  const sourceInfo = getSourceFeatureInfo();

  return (
    <>
      <CustomDrawer
        title="Buffer Analysis Tool"
        placement="right"
        onClose={() => dispatch(toggleBuffer())}
        open={isOpen}
        width={450}
        mask={false}
      >
        {!hasSelectedFeatures && (
          <Alert
            message="No Features Selected"
            description="Please select one or more features on the map to create a buffer."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {hasSelectedFeatures && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Selected Features:</Text>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Count:</Text>
                <Tag color="blue">{sourceInfo.count}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Geometry Types:</Text>
                <div>
                  {sourceInfo.types.map(type => (
                    <Tag key={type} size="small" style={{ marginLeft: 4 }}>
                      {type}
                    </Tag>
                  ))}
                </div>
              </div>
            </Space>
          </Card>
        )}

        <Card size="small" title="Buffer Configuration" style={{ marginBottom: 16 }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={generateBuffer}
            initialValues={{ distance: 100, unit: "meters" }}
          >
            <Form.Item
              label="Buffer Distance"
              name="distance"
              rules={[{ required: true, message: "Please enter buffer distance" }]}
            >
              <InputNumber
                min={0}
                max={1000000}
                step={10}
                style={{ width: "100%" }}
                placeholder="Enter distance"
              />
            </Form.Item>

            <Form.Item
              label="Unit"
              name="unit"
              rules={[{ required: true, message: "Please select unit" }]}
            >
              <Select style={{ width: "100%" }}>
                {units.map(unit => (
                  <Option key={unit.value} value={unit.value}>
                    {unit.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Collapse size="small" ghost>
              <Panel header="Advanced Options" key="1">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>Merge Buffers</Text>
                    <Switch
                      size="small"
                      checked={bufferOptions.mergeBuffers}
                      onChange={(checked) => setBufferOptions(prev => ({ ...prev, mergeBuffers: checked }))}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>High Precision</Text>
                    <Switch
                      size="small"
                      checked={bufferOptions.highPrecision}
                      onChange={(checked) => setBufferOptions(prev => ({ ...prev, highPrecision: checked }))}
                    />
                  </div>
                  {!bufferOptions.highPrecision && (
                    <div>
                      <Text>Buffer Smoothness</Text>
                      <Slider
                        min={4}
                        max={32}
                        step={4}
                        value={bufferOptions.steps}
                        onChange={(value) => setBufferOptions(prev => ({ ...prev, steps: value }))}
                        marks={{
                          4: 'Low',
                          16: 'Medium',
                          32: 'High'
                        }}
                      />
                    </div>
                  )}
                </Space>
              </Panel>
            </Collapse>

            <Form.Item style={{ marginTop: 16 }}>
              <Space style={{ width: "100%" }} direction="vertical">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isGenerating}
                  disabled={!hasSelectedFeatures}
                  block
                >
                  Generate Buffer
                </Button>
                <Button
                  onClick={clearBuffer}
                  disabled={!bufferLayer}
                  block
                >
                  Clear Buffer
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {BufferStatistics}

        {filteredResults.length > 0 && (
          <Card 
            size="small" 
            title={
              <Space>
                <FilterOutlined />
                <span>Proximity Analysis</span>
                <Tag color="blue">{filteredResults.length} features</Tag>
              </Space>
            }
            extra={
              <Space>
                <Button 
                  size="small" 
                  icon={<DownloadOutlined />}
                  onClick={exportAnalysisResults}
                >
                  Export
                </Button>
                <Button size="small" onClick={highlightFeatures}>
                  Highlight
                </Button>
              </Space>
            }
          >
            {/* Filter Controls */}
            <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
              <Select
                size="small"
                value={filterCriteria.layer}
                onChange={(value) => setFilterCriteria({ ...filterCriteria, layer: value })}
                style={{ width: '100%' }}
                placeholder="Filter by layer"
              >
                <Option value="all">All Layers</Option>
                {availableLayers.map(layer => (
                  <Option key={layer} value={layer}>{layer}</Option>
                ))}
              </Select>
              
              <Select
                size="small"
                value={filterCriteria.geometryType}
                onChange={(value) => setFilterCriteria({ ...filterCriteria, geometryType: value })}
                style={{ width: '100%' }}
                placeholder="Filter by geometry type"
              >
                <Option value="all">All Geometry Types</Option>
                {availableGeometryTypes.map(type => (
                  <Option key={type} value={type}>{type}</Option>
                ))}
              </Select>

              <div>
                <Text style={{ fontSize: 12 }}>Distance Range: {filterCriteria.distanceRange[0].toFixed(0)} - {filterCriteria.distanceRange[1].toFixed(0)} meters</Text>
                <Slider
                  range
                  min={0}
                  max={filterCriteria.distanceRange[1]}
                  value={filterCriteria.distanceRange}
                  onChange={(value) => setFilterCriteria({ ...filterCriteria, distanceRange: value })}
                />
              </div>
            </Space>

            {/* Results List */}
            <List
              size="small"
              dataSource={filteredResults.slice(0, 100)}
              renderItem={(item, index) => (
                <List.Item
                  actions={[
                    <Tag 
                      color={
                        item.distanceCategory === 'Very Close' ? 'red' : 
                        item.distanceCategory === 'Close' ? 'orange' : 'green'
                      }
                      size="small"
                    >
                      {item.distanceCategory}
                    </Tag>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Text ellipsis>
                        {item.properties?.name || item.properties?.id || `Feature ${index + 1}`}
                      </Text>
                    }
                    description={
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.layerName} • {item.geometryType}
                        </Text>
                        <Text style={{ fontSize: 12 }}>
                          Distance: {item.distance.toFixed(2)} meters
                          {item.area && ` • Area: ${(item.area / 10000).toFixed(2)} ha`}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
            {filteredResults.length > 100 && (
              <Text type="secondary" style={{ fontSize: 12, textAlign: "center", display: "block", marginTop: 8 }}>
                Showing first 100 of {filteredResults.length} features
              </Text>
            )}
          </Card>
        )}

        {isGenerating && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <Spin tip="Generating buffer and analyzing features..." />
          </div>
        )}
      </CustomDrawer>

      {/* Render buffer on map */}
      {bufferLayer && renderBufferLayer()}
    </>
  );
}

export default BufferTool;