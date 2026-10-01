// spatialQuery/components/QueryProgress.jsx
import React from "react";
import { Progress, Button, Space, Typography, Tag } from "antd";
import { CloseOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function QueryProgress({
  progress,
  processed,
  total,
  matches,
  onCancel,
}) {
  const percent =
    total > 0 ? Math.round((processed / total) * 100) : Math.round(progress || 0);

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={4}>
      <Progress
        percent={percent}
        status="active"
        strokeColor={{ from: "#108ee9", to: "#87d068" }}
        size="small"
      />

      <Space size={8} style={{ width: "100%", justifyContent: "space-between" }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {processed.toLocaleString()} / {total.toLocaleString()} source features
        </Text>
        <Tag color="blue" style={{ fontSize: 11 }}>
          {matches} matches
        </Tag>
      </Space>

      <Button
        danger
        size="small"
        icon={<CloseOutlined />}
        onClick={onCancel}
        style={{ width: "100%" }}
      >
        Cancel
      </Button>
    </Space>
  );
}