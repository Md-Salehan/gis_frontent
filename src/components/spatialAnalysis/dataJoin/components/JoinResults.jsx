import React from 'react';
import { Button, Space, Typography, Tag, Alert, Row, Col, Statistic } from 'antd';
import { CheckOutlined, ClearOutlined, FileOutlined } from '@ant-design/icons';

const { Text } = Typography;

function JoinResults({
  statistics,
  resultLayerId,
  onClear,
}) {
  if (!statistics) return null;

  const {
    targetCount = 0,
    matchedCount = 0,
    unmatchedCount = 0,
    matchRate = 0,
    duplicateKeyCount = 0,
    invalidTargetKeyCount = 0,
    processingTimeMs = 0,
    cacheHit = false,
    resultCount = 0,
    fieldCollisions = [],
  } = statistics;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={6}>
      <Alert
        message={
          <Space>
            <CheckOutlined style={{ color: '#52c41a' }} />
            <Text strong style={{ color: '#52c41a' }}>
              Join Complete
            </Text>
          </Space>
        }
        description={
          <Row gutter={[8, 8]}>
            <Col span={8}>
              <Statistic
                title="Matched"
                value={matchedCount}
                valueStyle={{ fontSize: 14 }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Unmatched"
                value={unmatchedCount}
                valueStyle={{ fontSize: 14 }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Match Rate"
                value={typeof matchRate === 'number' ? matchRate.toFixed(1) : '0.0'}
                suffix="%"
                valueStyle={{ fontSize: 14 }}
              />
            </Col>
          </Row>
        }
        type="success"
        showIcon={false}
        style={{ fontSize: 12, padding: '4px 8px' }}
      />

      <Space size={4} wrap>
        {duplicateKeyCount > 0 && (
          <Tag color="warning" style={{ fontSize: 11 }}>
            {duplicateKeyCount} duplicate join keys
          </Tag>
        )}

        {invalidTargetKeyCount > 0 && (
          <Tag color="warning" style={{ fontSize: 11 }}>
            {invalidTargetKeyCount} invalid target keys
          </Tag>
        )}

        {fieldCollisions && fieldCollisions.length > 0 && (
          <Tag color="orange" style={{ fontSize: 11 }}>
            {fieldCollisions.length} field collisions
          </Tag>
        )}

        {/* {cacheHit && (
          <Tag color="green" style={{ fontSize: 11 }}>
            Cache hit
          </Tag>
        )} */}

        <Tag color="blue" style={{ fontSize: 11 }}>
          {resultCount || 0} result features
        </Tag>

        {processingTimeMs > 0 && (
          <Tag color="default" style={{ fontSize: 11 }}>
            {(processingTimeMs / 1000).toFixed(2)}s
          </Tag>
        )}
      </Space>

      <Space style={{ width: '100%' }} direction="vertical" size={4}>
        

        <Button
          danger
          size="small"
          icon={<ClearOutlined />}
          onClick={onClear}
          block
        >
          Clear Results
        </Button>
      </Space>
    </Space>
  );
}

export default JoinResults;