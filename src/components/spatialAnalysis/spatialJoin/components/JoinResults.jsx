import React from "react";
import { Button, Space, Typography, Tag, Alert } from "antd";
import { CheckOutlined, ClearOutlined } from "@ant-design/icons";

const { Text } = Typography;

function JoinResults({ results, matches, onClear }) {
  const featureCount = results?.features?.length || 0;

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={6}>
      <Alert
        message={
          <Space>
            <CheckOutlined style={{ color: "#52c41a" }} />
            <Text strong style={{ color: "#52c41a" }}>
              Join Complete
            </Text>
          </Space>
        }
        description={
          <Space size={8}>
            <Tag color="green">{featureCount} features</Tag>
            <Tag color="blue">{matches} matches found</Tag>
          </Space>
        }
        type="success"
        showIcon={false}
        style={{ fontSize: 12, padding: "4px 8px" }}
      />

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
  );
}

export default JoinResults;