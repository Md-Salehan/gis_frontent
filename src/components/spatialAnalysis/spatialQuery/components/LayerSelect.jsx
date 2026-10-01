// spatialQuery/components/LayerSelect.jsx
import React from "react";
import { Select, Space, Tag, Typography } from "antd";

const { Text } = Typography;

/**
 * Single-layer picker with rich option rendering.
 * `layers`: [{ value, label, type:"main"|"temp", featureCount, geometryTypes:string[] }]
 */
export default function LayerSelect({
  value,
  onChange,
  layers,
  disabled,
  placeholder = "Select layer",
  excludeLayerId = null,
}) {
  const options = (layers || [])
    .filter((l) => l.value !== excludeLayerId)
    .map((layer) => ({
      value: layer.value,
      searchLabel: layer.label,
      label: (
        <Space size={4}>
          <Text>{layer.label}</Text>
          <Tag
            color={layer.type === "main" ? "blue" : "orange"}
            style={{ fontSize: 10, margin: 0, padding: "0 4px" }}
          >
            {layer.type === "main" ? "Main" : "Temp"}
          </Tag>
          <Tag color="green" style={{ fontSize: 10, margin: 0, padding: "0 4px" }}>
            {layer.featureCount}
          </Tag>
          {(layer.geometryTypes || []).map((t) => (
            <Tag
              key={t}
              color="default"
              style={{ fontSize: 9, margin: 0, padding: "0 4px" }}
            >
              {t}
            </Tag>
          ))}
        </Space>
      ),
    }));

  return (
    <Select
      size="small"
      style={{ width: "100%" }}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      showSearch
      allowClear
      optionFilterProp="searchLabel"
      options={options}
    />
  );
}