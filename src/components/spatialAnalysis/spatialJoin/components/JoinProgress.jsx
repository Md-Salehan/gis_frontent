import React from "react";
import { Progress, Button, Space, Typography, Tag } from "antd";
import { CloseOutlined, CheckOutlined } from "@ant-design/icons";

const { Text } = Typography;

function JoinProgress({ progress, processed, total, matches, onCancel }) {
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={4}>
      <Progress
        percent={percent}
        status="active"
        strokeColor={{
          from: "#108ee9",
          to: "#87d068",
        }}
        size="small"
        format={() => (
          <Space size={4}>
            <Text style={{ fontSize: 11 }}>{percent}%</Text>
          </Space>
        )}
      />

      <Space size={8} style={{ width: "100%", justifyContent: "space-between" }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {processed.toLocaleString()} / {total.toLocaleString()} features
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

export default JoinProgress;