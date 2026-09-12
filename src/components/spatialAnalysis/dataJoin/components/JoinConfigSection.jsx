// JoinConfigSection.jsx
import React, { useMemo } from "react";
import {
  Select,
  Space,
  Typography,
  Divider,
  Input,
  Radio,
  Tag,
} from "antd";
import {
  JOIN_TYPES,
  JOIN_TYPE_LABELS,
  MATCH_STRATEGIES,
  MATCH_STRATEGY_LABELS,
  AGGREGATION_LABELS,
  COLLISION_STRATEGIES,
} from "../constants";

const { Text } = Typography;

function JoinConfigSection({
  joinType = JOIN_TYPES.LEFT,
  matchStrategy = MATCH_STRATEGIES.FIRST,
  aggregation = null,
  collisionStrategy = null,
  collisionAffix = "",
  collisionFields = [],
  showAggregation = false,
  onJoinTypeChange,
  onMatchStrategyChange,
  onAggregationChange,
  onCollisionStrategyChange,
  onCollisionAffixChange,
  disabled = false,
}) {
  const shouldShowAggregation = useMemo(() => {
    return matchStrategy === MATCH_STRATEGIES.AGGREGATE || showAggregation;
  }, [matchStrategy, showAggregation]);

  const hasCollisions = collisionFields.length > 0;

  const showAffixInput =
    collisionStrategy === COLLISION_STRATEGIES.PREFIX ||
    collisionStrategy === COLLISION_STRATEGIES.SUFFIX;

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={6}>
      {/* Join Type */}
      <div>
        <Text type="secondary" style={{ fontSize: 11 }}>
          Join Type
        </Text>
        <Select
          value={joinType}
          onChange={onJoinTypeChange}
          disabled={disabled}
          size="small"
          style={{ width: "100%" }}
          options={Object.entries(JOIN_TYPE_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </div>

      {/* Match Strategy */}
      <div>
        <Text type="secondary" style={{ fontSize: 11 }}>
          Match Strategy
        </Text>
        <Select
          value={matchStrategy}
          onChange={onMatchStrategyChange}
          disabled={disabled}
          size="small"
          style={{ width: "100%" }}
          options={Object.entries(MATCH_STRATEGY_LABELS).map(
            ([value, label]) => ({
              value,
              label,
            }),
          )}
        />
      </div>

      {/* Aggregation (conditional) */}
      {shouldShowAggregation && (
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Aggregation
          </Text>
          <Select
            value={aggregation?.type || null}
            onChange={(value) => onAggregationChange({ type: value })}
            disabled={disabled}
            size="small"
            style={{ width: "100%" }}
            placeholder="Select aggregation method"
            options={Object.entries(AGGREGATION_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </div>
      )}

      {/* Field Collision Handling (only when collisions exist) */}
      {hasCollisions && (
        <>
          <Divider style={{ margin: "4px 0" }} />
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Field Collision Handling
            </Text>
            <div style={{ marginTop: 4, marginBottom: 6 }}>
              {collisionFields.map((field, index) => (
                <Tag
                  key={index}
                  color="orange"
                  style={{ fontSize: 10, marginBottom: 4 }}
                >
                  {field}
                </Tag>
              ))}
            </div>

            <Radio.Group
              value={collisionStrategy}
              onChange={(e) => onCollisionStrategyChange(e.target.value)}
              disabled={disabled}
              style={{ width: "100%" }}
            >
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Radio value={COLLISION_STRATEGIES.PREFIX} style={{ fontSize: 12 }}>
                  Prefix
                </Radio>
                <Radio value={COLLISION_STRATEGIES.SUFFIX} style={{ fontSize: 12 }}>
                  Suffix
                </Radio>
                <Radio value={COLLISION_STRATEGIES.NONE} style={{ fontSize: 12 }}>
                  None (Overwrite)
                </Radio>
              </Space>
            </Radio.Group>

            {showAffixInput && (
              <div style={{ marginTop: 6 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {collisionStrategy === COLLISION_STRATEGIES.PREFIX
                    ? "Prefix String"
                    : "Suffix String"}
                </Text>
                <Input
                  placeholder={
                    collisionStrategy === COLLISION_STRATEGIES.PREFIX
                      ? "e.g., join_"
                      : "e.g., _join"
                  }
                  value={collisionAffix}
                  onChange={(e) => onCollisionAffixChange(e.target.value)}
                  disabled={disabled}
                  size="small"
                  style={{ width: "100%", marginTop: 4 }}
                />
                <Text type="secondary" style={{ fontSize: 10 }}>
                  {collisionStrategy === COLLISION_STRATEGIES.PREFIX
                    ? `Example: ${collisionAffix || "join_"}fieldname`
                    : `Example: fieldname${collisionAffix || "_join"}`}
                </Text>
              </div>
            )}
          </div>
        </>
      )}
    </Space>
  );
}

export default JoinConfigSection;