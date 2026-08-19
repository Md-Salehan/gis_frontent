import React, { useMemo } from "react";
import {
  Select,
  Space,
  InputNumber,
  Radio,
  Typography,
  Tooltip,
  Divider,
  Tag,
  Alert,
  Checkbox,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { getCompatiblePredicates } from "../utils/compatibilityMatrix";
import FieldSelector from "./FieldSelector";

const { Text } = Typography;
const { Option } = Select;

function JoinConfigPanel({
  targetLayerId,
  joinLayerId,
  predicate,
  distance,
  distanceUnit,
  matchStrategy,
  selectedFields,
  fieldPrefix,
  aggregation,
  availableLayers,
  joinFields,
  isProcessing,
  onTargetChange,
  onJoinChange,
  onPredicateChange,
  onDistanceChange,
  onDistanceUnitChange,
  onMatchStrategyChange,
  onFieldsChange,
  onPrefixChange,
  onAggregationChange,
}) {
  // Get target layer geometry type
  const targetLayer = useMemo(
    () => availableLayers.find((l) => l.value === targetLayerId),
    [availableLayers, targetLayerId]
  );

  const joinLayer = useMemo(
    () => availableLayers.find((l) => l.value === joinLayerId),
    [availableLayers, joinLayerId]
  );

  // Get compatible predicates
  const compatiblePredicates = useMemo(() => {
    if (!targetLayer || !joinLayer) return [];
    
    const targetTypes = targetLayer.geometryTypes || [];
    const joinTypes = joinLayer.geometryTypes || [];
    
    // Use the first geometry type for compatibility check
    const targetType = targetTypes[0] || "Unknown";
    const joinType = joinTypes[0] || "Unknown";
    
    return getCompatiblePredicates(targetType, joinType);
  }, [targetLayer, joinLayer]);

  // Check if current predicate is compatible
  const isPredicateCompatible = useMemo(() => {
    return compatiblePredicates.includes(predicate);
  }, [compatiblePredicates, predicate]);

  // Check if distance is required
  const requiresDistance = useMemo(() => {
    return predicate === "within-distance" || predicate === "nearest";
  }, [predicate]);

  // Check if aggregation is available
  const supportsAggregation = useMemo(() => {
    return matchStrategy === "all" || matchStrategy === "aggregate";
  }, [matchStrategy]);

  // Render layer option
  const renderLayerOption = (layer) => ({
    label: (
      <Space size={4}>
        <Text>{layer.label}</Text>
        <Tag
          color={layer.type === "main" ? "blue" : "orange"}
          style={{ fontSize: 10, margin: 0, padding: "0 4px" }}
        >
          {layer.type === "main" ? "Main" : "Temp"}
        </Tag>
        <Tag
          color="green"
          style={{ fontSize: 10, margin: 0, padding: "0 4px" }}
        >
          {layer.featureCount}
        </Tag>
        {layer.geometryTypes.map((type) => (
          <Tag
            key={type}
            color="default"
            style={{ fontSize: 9, margin: 0, padding: "0 4px" }}
          >
            {type.replace("Multi", "M-")}
          </Tag>
        ))}
      </Space>
    ),
    value: layer.value,
  });

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={8}>
      {/* Target Layer */}
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Target Layer
        </Text>
        <Select
          placeholder="Select target layer"
          style={{ width: "100%" }}
          value={targetLayerId}
          onChange={onTargetChange}
          disabled={isProcessing}
          size="small"
          showSearch
          allowClear
          optionFilterProp="label"
          options={availableLayers.map(renderLayerOption)}
        />
      </div>

      {/* Join Layer */}
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Join Layer
        </Text>
        <Select
          placeholder="Select join layer"
          style={{ width: "100%" }}
          value={joinLayerId}
          onChange={onJoinChange}
          disabled={isProcessing}
          size="small"
          showSearch
          allowClear
          optionFilterProp="label"
          options={availableLayers
            .filter((l) => l.value !== targetLayerId)
            .map(renderLayerOption)}
        />
      </div>

      {/* Relationship / Predicate */}
      <div>
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Relationship
          </Text>
          {!isPredicateCompatible && targetLayer && joinLayer && (
            <Tooltip title="Selected predicate may not be compatible with these geometry types">
              <InfoCircleOutlined style={{ color: "#faad14", fontSize: 12 }} />
            </Tooltip>
          )}
        </Space>
        <Select
          placeholder="Select spatial relationship"
          style={{ width: "100%" }}
          value={predicate}
          onChange={onPredicateChange}
          disabled={isProcessing || !targetLayer || !joinLayer}
          size="small"
        >
          {compatiblePredicates.map((p) => (
            <Option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1).replace("-", " ")}
            </Option>
          ))}
        </Select>
      </div>

      {/* Distance (conditional) */}
      {requiresDistance && (
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Distance
          </Text>
          <Space style={{ width: "100%" }}>
            <InputNumber
              min={0}
              value={distance}
              onChange={onDistanceChange}
              disabled={isProcessing}
              size="small"
              style={{ width: "60%" }}
              addonAfter={
                <Select
                  value={distanceUnit}
                  onChange={onDistanceUnitChange}
                  disabled={isProcessing}
                  size="small"
                  style={{ width: 80 }}
                  options={[
                    { value: "meters", label: "m" },
                    { value: "kilometers", label: "km" },
                    { value: "miles", label: "mi" },
                  ]}
                />
              }
            />
          </Space>
        </div>
      )}

      {/* Match Strategy */}
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Match Strategy
        </Text>
        <Select
          value={matchStrategy}
          onChange={onMatchStrategyChange}
          disabled={isProcessing}
          size="small"
          style={{ width: "100%" }}
          options={[
            { value: "first", label: "First Match" },
            { value: "all", label: "All Matches" },
            { value: "aggregate", label: "Aggregate" },
          ]}
        />
      </div>

      {/* Aggregation (conditional) */}
      {supportsAggregation && matchStrategy === "aggregate" && (
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Aggregation
          </Text>
          <Select
            value={aggregation}
            onChange={onAggregationChange}
            disabled={isProcessing}
            size="small"
            style={{ width: "100%" }}
            placeholder="Select aggregation method"
            options={[
              { value: "count", label: "Count" },
              { value: "sum", label: "Sum" },
              { value: "average", label: "Average" },
              { value: "min", label: "Minimum" },
              { value: "max", label: "Maximum" },
              { value: "concatenate", label: "Concatenate" },
            ]}
          />
        </div>
      )}

      {/* Field Selection */}
      {joinLayer && joinFields.length > 0 && (
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Join Fields
          </Text>
          <FieldSelector
            fields={joinFields}
            selectedFields={selectedFields}
            onChange={onFieldsChange}
            disabled={isProcessing}
          />
          
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Prefix for joined fields:
            </Text>
            <Select
              value={fieldPrefix}
              onChange={onPrefixChange}
              disabled={isProcessing}
              size="small"
              style={{ width: "100%", marginTop: 2 }}
              options={[
                { value: "join_", label: "join_" },
                { value: "target_", label: "target_" },
                { value: "", label: "None (overwrite)" },
              ]}
            />
          </div>
        </div>
      )}

      {/* Compatibility Warning */}
      {targetLayer && joinLayer && !isPredicateCompatible && (
        <Alert
          message="Incompatible Geometry Types"
          description={`Target (${targetLayer.geometryTypes.join(", ")}) and Join (${joinLayer.geometryTypes.join(", ")}) may not work with "${predicate}"`}
          type="warning"
          showIcon
          style={{ fontSize: 11, padding: "4px 8px" }}
        />
      )}

      {/* Same layer warning */}
      {targetLayerId === joinLayerId && targetLayerId && (
        <Alert
          message="Same Layer Selected"
          description="Target and join layers must be different"
          type="error"
          showIcon
          style={{ fontSize: 11, padding: "4px 8px" }}
        />
      )}
    </Space>
  );
}

export default JoinConfigPanel;