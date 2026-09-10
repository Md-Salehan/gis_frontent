import React from 'react';
import { Progress, Button, Space, Typography, Tag, Alert } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

const { Text } = Typography;

function JoinProgress({
  progress,
  processed = 0,
  total = 0,
  matches = 0,
  onCancel,
  statistics = null,
}) {
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={4}>
      <Progress
        percent={percent}
        status="active"
        strokeColor={{
          from: '#108ee9',
          to: '#87d068',
        }}
        size="small"
      />

      <Space size={8} style={{ width: '100%', justifyContent: 'space-between' }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {processed.toLocaleString()} / {total.toLocaleString()} features
        </Text>
        {matches > 0 && (
          <Tag color="blue" style={{ fontSize: 11 }}>
            {matches} matches
          </Tag>
        )}
      </Space>

      <Button
        danger
        size="small"
        icon={<CloseOutlined />}
        onClick={onCancel}
        style={{ width: '100%' }}
      >
        Cancel
      </Button>
    </Space>
  );
}

export default JoinProgress;