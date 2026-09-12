// DataJoinPanel.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Space,
  Button,
  Divider,
  Typography,
  Alert,
  message,
  Select,
  Row,
  Col,
  Card,
  Tag,
} from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import useIsCompMinimized from "../../../../hooks/useIsCompMinimized";
import { useDataJoin } from "../hooks/useDataJoin";
import { useDataJoinValidation } from "../hooks/useDataJoinValidation";
import { getFieldNames } from "../utils/fieldUtils";
import {
  JOIN_STATUS,
  JOIN_TYPES,
  MATCH_STRATEGIES,
  COLLISION_STRATEGIES,
} from "../constants";
import LayerSelector from "./LayerSelector";
import FieldSelector from "./FieldSelector";
import JoinConfigSection from "./JoinConfigSection";
import JoinProgress from "./JoinProgress";
import JoinResults from "./JoinResults";

const { Text } = Typography;

function DataJoinPanel({ id }) {
  const dispatch = useDispatch();
  const isMinimized = useIsCompMinimized(id);

  // Redux state
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers || {});
  const tempGeoJsonLayers = useSelector(
    (state) => state.map.tempGeoJsonLayers || {},
  );

  // Local state
  const [targetLayerId, setTargetLayerId] = useState(null);
  const [joinLayerId, setJoinLayerId] = useState(null);
  const [targetFields, setTargetFields] = useState([]);
  const [joinFields, setJoinFields] = useState([]);
  const [selectedJoinFields, setSelectedJoinFields] = useState([]);
  const [joinType, setJoinType] = useState(JOIN_TYPES.LEFT);
  const [matchStrategy, setMatchStrategy] = useState(MATCH_STRATEGIES.FIRST);
  const [aggregation, setAggregation] = useState(null);
  const [collisionStrategy, setCollisionStrategy] = useState(null);
  const [collisionAffix, setCollisionAffix] = useState("");
  const [normalizeOptions] = useState({
    trim: true,
    caseSensitive: false,
    preserveLeadingZeros: true,
  });

  // Collision detection state
  const [collisionFields, setCollisionFields] = useState([]);

  // Hooks
  const {
    status,
    progress,
    processed,
    total,
    statistics,
    resultLayerId,
    error,
    isProcessing,
    isCompleted,
    performJoin,
    cancelJoin,
    reset,
  } = useDataJoin();

  const {
    validationErrors,
    validateJoinConfig,
    clearValidation,
  } = useDataJoinValidation();

  // Get available layers
  const availableLayers = useMemo(() => {
    const layers = [];

    const processLayer = (layerId, layerData, type) => {
      if (!layerData?.geoJsonData) return;

      const features = layerData.geoJsonData.features || [];
      if (features.length === 0) return;

      layers.push({
        value: layerId,
        label: layerData.metaData?.layer?.layer_nm || layerId,
        type: type,
        data: layerData,
        featureCount: features.length,
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

  // Get target layer data
  const targetLayer = useMemo(
    () => availableLayers.find((l) => l.value === targetLayerId),
    [availableLayers, targetLayerId],
  );

  const joinLayer = useMemo(
    () => availableLayers.find((l) => l.value === joinLayerId),
    [availableLayers, joinLayerId],
  );

  // Get available fields
  const targetAvailableFields = useMemo(() => {
    if (!targetLayer) return [];
    const features = targetLayer.data?.geoJsonData?.features || [];
    return getFieldNames(features);
  }, [targetLayer]);

  const joinAvailableFields = useMemo(() => {
    if (!joinLayer) return [];
    const features = joinLayer.data?.geoJsonData?.features || [];
    return getFieldNames(features);
  }, [joinLayer]);

  // Detect field collisions
  const detectCollisions = useCallback((fields) => {
    if (!targetLayer || !joinLayer) {
      setCollisionFields([]);
      return [];
    }

    const targetFeatures = targetLayer.data?.geoJsonData?.features || [];
    const targetFieldNames = getFieldNames(targetFeatures);

    // Determine which join fields will be added
    const fieldsToAdd =
      fields.length > 0
        ? fields
        : [];

    // Find collisions
    const collisions = fieldsToAdd.filter((field) =>
      targetFieldNames.includes(field),
    );

    setCollisionFields(collisions);
    return collisions;
  }, [targetLayer, joinLayer, selectedJoinFields]);

  // Validate configuration when it changes
  useEffect(() => {
    if (
      targetLayerId &&
      joinLayerId &&
      targetFields.length > 0 &&
      joinFields.length > 0
    ) {
      const config = {
        targetLayer,
        joinLayer,
        targetFields,
        joinFields,
        selectedJoinFields,
        joinType,
        matchStrategy,
        aggregation,
        collisionStrategy,
        collisionAffix,
        normalizeOptions,
      };
      validateJoinConfig(config);

      // Detect collisions
      // detectCollisions();
    } else {
      clearValidation();
      // setCollisionFields([]);
    }
  }, [
    targetLayerId,
    joinLayerId,
    targetFields,
    joinFields,
    selectedJoinFields,
    joinType,
    matchStrategy,
    aggregation,
    collisionStrategy,
    collisionAffix,
    normalizeOptions,
    targetLayer,
    joinLayer,
    validateJoinConfig,
    clearValidation,
    // detectCollisions,
  ]);

  // Reset collision state when collisions are resolved / fields change
  useEffect(() => {
    if (collisionFields.length === 0) {
      setCollisionStrategy(null);
      setCollisionAffix("");
    } else {
      // Default to PREFIX when a collision is first detected
      setCollisionStrategy((prev) => prev || COLLISION_STRATEGIES.PREFIX);
      setCollisionAffix((prev) => (prev === "" ? "join_" : prev));
    }
  }, [collisionFields]);

  // Handle target layer change
  const handleTargetChange = useCallback(
    (value) => {
      setTargetLayerId(value);
      setTargetFields([]);
      if (value === joinLayerId) {
        setJoinLayerId(null);
        setJoinFields([]);
      }
      setCollisionFields([]);
    },
    [joinLayerId],
  );

  // Handle join layer change
  const handleJoinChange = useCallback(
    (value) => {
      setJoinLayerId(value);
      setJoinFields([]);
      setSelectedJoinFields([]);
      if (value === targetLayerId) {
        setTargetLayerId(null);
        setTargetFields([]);
      }
      setCollisionFields([]);
    },
    [targetLayerId],
  );

  // Check if collision handling is resolved
  const isCollisionResolved = useMemo(() => {
    if (collisionFields.length === 0) return true;
    if (!collisionStrategy) return false;
    if (
      collisionStrategy === COLLISION_STRATEGIES.PREFIX ||
      collisionStrategy === COLLISION_STRATEGIES.SUFFIX
    ) {
      return collisionAffix.trim() !== "";
    }
    return true;
  }, [collisionFields, collisionStrategy, collisionAffix]);

  // Handle run join
  const handleRunJoin = useCallback(async () => {
    if (!targetLayerId || !joinLayerId) {
      message.warning("Please select both target and join layers");
      return;
    }

    if (targetFields.length === 0 || joinFields.length === 0) {
      message.warning("Please select join fields");
      return;
    }

    if (!isCollisionResolved) {
      message.warning("Please resolve the field collision before running the join");
      return;
    }

    const config = {
      targetLayer,
      joinLayer,
      targetFields,
      joinFields,
      selectedJoinFields,
      joinType,
      matchStrategy,
      aggregation,
      collisionStrategy:
        collisionFields.length > 0
          ? collisionStrategy
          : COLLISION_STRATEGIES.NONE,
      collisionAffix,
      normalizeOptions,
    };

    try {
      await performJoin(config);
    } catch (err) {
      // Error handled in hook
    }
  }, [
    targetLayerId,
    joinLayerId,
    targetFields,
    joinFields,
    selectedJoinFields,
    joinType,
    matchStrategy,
    aggregation,
    collisionStrategy,
    collisionAffix,
    normalizeOptions,
    targetLayer,
    joinLayer,
    collisionFields,
    isCollisionResolved,
    performJoin,
  ]);

  // Handle clear
  const handleClear = useCallback(() => {
    reset();
    setTargetLayerId(null);
    setJoinLayerId(null);
    setTargetFields([]);
    setJoinFields([]);
    setSelectedJoinFields([]);
    setCollisionFields([]);
    setCollisionStrategy(null);
    setCollisionAffix("");
    clearValidation();
  }, [reset, clearValidation]);

  if (isMinimized) {
    return <div style={{ width: "280px" }} />;
  }

  return (
    <Card size="small" style={{ width: "100%" }}>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          {/* Layer Selection */}
          <LayerSelector
            value={targetLayerId}
            onChange={handleTargetChange}
            layers={availableLayers}
            label="Target Layer"
            placeholder="Select target layer"
            disabled={isProcessing}
            excludeLayer={joinLayerId}
            showFeatureCount
          />

          <LayerSelector
            value={joinLayerId}
            onChange={handleJoinChange}
            layers={availableLayers}
            label="Join Layer"
            placeholder="Select join layer"
            disabled={isProcessing}
            excludeLayer={targetLayerId}
            showFeatureCount
          />

          {/* Field Selection */}
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Target Field
            </Text>
            <Select
              placeholder="Select target field"
              style={{ width: "100%" }}
              value={targetFields.length > 0 ? targetFields[0] : undefined}
              onChange={(value) => setTargetFields(value ? [value] : [])}
              disabled={
                !targetLayer ||
                isProcessing ||
                targetAvailableFields.length === 0
              }
              size="small"
              showSearch
              allowClear
              options={targetAvailableFields.map((field) => ({
                value: field,
                label: field,
              }))}
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Join Field
            </Text>
            <Select
              placeholder="Select join field"
              style={{ width: "100%" }}
              value={joinFields.length > 0 ? joinFields[0] : undefined}
              onChange={(value) => setJoinFields(value ? [value] : [])}
              disabled={
                !joinLayer || isProcessing || joinAvailableFields.length === 0
              }
              size="small"
              showSearch
              allowClear
              options={joinAvailableFields.map((field) => ({
                value: field,
                label: field,
              }))}
            />
          </div>

          {/* Output Fields */}
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Output Join Fields
              
            </Text>
            <FieldSelector
              fields={joinAvailableFields}
              selectedFields={selectedJoinFields}
              onChange={(fields) => {setSelectedJoinFields(fields); detectCollisions(fields);}}
              disabled={
                isProcessing || !(joinLayer && joinAvailableFields.length > 0)
              }
              label="join fields"
              maxHeight={80}
            />
          </div>

          {/* Collision Warning */}
          {collisionFields.length > 0 && !isProcessing && (
            <Alert
              message={
                <Space>
                  <ExclamationCircleOutlined style={{ color: "#faad14" }} />
                  <Text strong>Field Collisions Detected</Text>
                </Space>
              }
              description={
                <div>
                  <Text>
                    The following fields already exist in the target layer and
                    will conflict:
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    {collisionFields.map((field, index) => (
                      <Tag
                        key={index}
                        color="orange"
                        style={{ marginBottom: 4 }}
                      >
                        {field}
                      </Tag>
                    ))}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Please select a collision handling option on the right.
                  </Text>
                </div>
              }
              type="warning"
              showIcon={false}
              style={{ fontSize: 11, padding: "4px 8px", marginTop: 8 }}
            />
          )}
        </Col>

        <Col span={12}>
          {/* Configuration */}
          <JoinConfigSection
            joinType={joinType}
            matchStrategy={matchStrategy}
            aggregation={aggregation}
            collisionStrategy={collisionStrategy}
            collisionAffix={collisionAffix}
            collisionFields={collisionFields}
            showAggregation={matchStrategy === MATCH_STRATEGIES.AGGREGATE}
            onJoinTypeChange={setJoinType}
            onMatchStrategyChange={setMatchStrategy}
            onAggregationChange={setAggregation}
            onCollisionStrategyChange={setCollisionStrategy}
            onCollisionAffixChange={setCollisionAffix}
            disabled={isProcessing}
          />

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert
              message="Validation Errors"
              description={
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              }
              type="error"
              showIcon
              style={{ fontSize: 11, padding: "4px 8px", marginTop: 8 }}
            />
          )}

          <Divider style={{ margin: "8px 0" }} />

          {/* Actions */}
          <Space style={{ width: "100%" }} direction="vertical" size={6}>
            <Button
              type="primary"
              onClick={handleRunJoin}
              loading={isProcessing}
              disabled={
                isProcessing ||
                !targetLayerId ||
                !joinLayerId ||
                targetFields.length === 0 ||
                joinFields.length === 0 ||
                validationErrors.length > 0 ||
                targetLayerId === joinLayerId ||
                !isCollisionResolved
              }
              block
              size="small"
            >
              {isProcessing ? "Processing..." : "Run Join"}
            </Button>

            {isProcessing && (
              <JoinProgress
                progress={progress}
                processed={processed}
                total={total}
                matches={statistics?.matchedCount || 0}
                onCancel={cancelJoin}
              />
            )}

            {isCompleted && statistics && (
              <JoinResults
                statistics={statistics}
                resultLayerId={resultLayerId}
                onClear={handleClear}
              />
            )}

            {status === JOIN_STATUS.ERROR && error && (
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

            {status === JOIN_STATUS.CANCELLED && (
              <Alert
                message="Join Cancelled"
                type="info"
                showIcon
                closable
                onClose={() => reset()}
                style={{ fontSize: 12 }}
              />
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

export default DataJoinPanel;