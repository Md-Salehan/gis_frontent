import React, { useMemo } from 'react';
import {
  Select,
  Space,
  InputNumber,
  Typography,
  Collapse,
  Alert,
  Divider,
} from 'antd';
import {
  JOIN_TYPES,
  JOIN_TYPE_LABELS,
  MATCH_STRATEGIES,
  MATCH_STRATEGY_LABELS,
  AGGREGATION_TYPES,
  AGGREGATION_LABELS,
  COLLISION_STRATEGIES,
  COLLISION_STRATEGY_LABELS,
} from '../constants';

const { Text } = Typography;
const { Panel } = Collapse;

function JoinConfigSection({
  joinType = JOIN_TYPES.LEFT,
  matchStrategy = MATCH_STRATEGIES.FIRST,
  aggregation = null,
  collisionStrategy = COLLISION_STRATEGIES.PREFIX_JOIN,
  fieldPrefix = 'join_',
  showAggregation = false,
  onJoinTypeChange,
  onMatchStrategyChange,
  onAggregationChange,
  onCollisionStrategyChange,
  onFieldPrefixChange,
  disabled = false,
}) {
  const shouldShowAggregation = useMemo(() => {
    return matchStrategy === MATCH_STRATEGIES.AGGREGATE || showAggregation;
  }, [matchStrategy, showAggregation]);

  return (
    
        <Space direction="vertical" style={{ width: '100%' }} size={6}>
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
              style={{ width: '100%' }}
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
              style={{ width: '100%' }}
              options={Object.entries(MATCH_STRATEGY_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
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
                style={{ width: '100%' }}
                placeholder="Select aggregation method"
                options={Object.entries(AGGREGATION_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </div>
          )}

          <Divider style={{ margin: '4px 0' }} />

          {/* Collision Strategy */}
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Field Collision
            </Text>
            <Select
              value={collisionStrategy}
              onChange={onCollisionStrategyChange}
              disabled={disabled}
              size="small"
              style={{ width: '100%' }}
              options={Object.entries(COLLISION_STRATEGY_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </div>

          {/* Field Prefix */}
          {collisionStrategy === COLLISION_STRATEGIES.PREFIX_JOIN && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Join Field Prefix
              </Text>
              <Select
                value={fieldPrefix}
                onChange={onFieldPrefixChange}
                disabled={disabled}
                size="small"
                style={{ width: '100%' }}
                options={[
                  { value: 'join_', label: 'join_' },
                  { value: 'j_', label: 'j_' },
                  { value: 'from_', label: 'from_' },
                  { value: '', label: 'None' },
                ]}
              />
            </div>
          )}
        </Space>
      
  );
}

export default JoinConfigSection;