// spatialQuery/components/DistanceInput.jsx
import React from "react";
import { InputNumber, Select, Space, Typography } from "antd";

const { Text } = Typography;

export default function DistanceInput({
  distance,
  distanceUnit,
  onDistanceChange,
  onUnitChange,
  disabled,
}) {
  return (
    <div>
      <Text type="secondary" style={{ fontSize: 12 }}>
        Distance
      </Text>
      <Space.Compact size="small" style={{ width: "100%" }}>
        <InputNumber
          min={0}
          value={distance}
          onChange={(v) => onDistanceChange(v ?? 0)}
          disabled={disabled}
          style={{ width: "60%" }}
        />
        <Select
          value={distanceUnit}
          onChange={onUnitChange}
          disabled={disabled}
          style={{ width: "40%" }}
          options={[
            { value: "meters", label: "m" },
            { value: "kilometers", label: "km" },
            { value: "miles", label: "mi" },
          ]}
        />
      </Space.Compact>
    </div>
  );
}