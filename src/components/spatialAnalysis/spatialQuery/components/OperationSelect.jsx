// spatialQuery/components/OperationSelect.jsx
import React, { useMemo } from "react";
import { Select, Space, Tooltip, Typography } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import {
  getCompatiblePredicates,
  ALL_PREDICATES,
} from "../../common/utils/compatibilityMatrix";

const { Text } = Typography;

export default function OperationSelect({
  sourceGeometryTypes,
  targetGeometryTypes,
  value,
  onChange,
  disabled,
}) {
  const compatible = useMemo(() => {
    if (!sourceGeometryTypes?.length || !targetGeometryTypes?.length) return [];
    const sets = [];
    for (const s of sourceGeometryTypes) {
      for (const t of targetGeometryTypes) {
        // NOTE: (sourceType, targetType) — matches matrix keying
        sets.push(new Set(getCompatiblePredicates(s, t)));
      }
    }
    if (!sets.length) return [];
    let intersection = [...sets[0]];
    for (let i = 1; i < sets.length; i++) {
      intersection = intersection.filter((p) => sets[i].has(p));
    }
    return intersection;
  }, [sourceGeometryTypes, targetGeometryTypes]);

  const hasLayers =
    !!sourceGeometryTypes?.length && !!targetGeometryTypes?.length;
  const compatibleSet = useMemo(() => new Set(compatible), [compatible]);

  const options = useMemo(
    () =>
      ALL_PREDICATES.filter((p) => compatibleSet.has(p.value)).map((p) => ({
        value: p.value,
        label: p.label,
      })),
    [compatibleSet],
  );

  const isValueCompatible = value ? compatibleSet.has(value) : true;

  return (
    <Space direction="vertical" size={2} style={{ width: "100%" }}>
      <Space size={4}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Spatial Operation
        </Text>
        {hasLayers && value && !isValueCompatible && (
          <Tooltip title="This operation is not supported for the selected geometry types.">
            <InfoCircleOutlined style={{ color: "#faad14", fontSize: 12 }} />
          </Tooltip>
        )}
      </Space>

      <Select
        size="small"
        style={{ width: "100%" }}
        value={isValueCompatible ? value : undefined}
        onChange={onChange}
        disabled={disabled || !hasLayers}
        placeholder={
          hasLayers
            ? compatible.length
              ? "Select operation"
              : "No compatible operations"
            : "Select source & target first"
        }
        options={options}
        showSearch
        optionFilterProp="label"
      />

      {hasLayers && compatible.length === 0 && (
        <Text type="danger" style={{ fontSize: 11 }}>
          ⚠ No compatible spatial operations for the selected layers.
        </Text>
      )}
    </Space>
  );
}