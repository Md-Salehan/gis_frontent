// spatialQuery/components/FeaturePicker.jsx
import React, { useMemo, useState } from "react";
import { Table, Input, Space, Button, Typography, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Text } = Typography;

/**
 * Compact paginated feature picker.
 * Selection is a list of indices; caller owns the source of truth.
 * Never renders the full layer.
 */
export default function FeaturePicker({
  features,
  selectedIndices,
  onChangeSelectedIndices,
  disabled,
  height = 200,
}) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    if (!features?.length) return [];
    const q = query.trim().toLowerCase();
    const out = [];
    for (let i = 0; i < features.length; i++) {
      const props = features[i]?.properties || {};
      const labelCandidate =
        props.name ??
        props.NAME ??
        props.label ??
        props.id ??
        props.feature_id ??
        props.fid ??
        props.OBJECTID ??
        null;
      const label =
        labelCandidate !== null && labelCandidate !== undefined
          ? String(labelCandidate)
          : `Feature #${i}`;

      if (q) {
        let hit = label.toLowerCase().includes(q);
        if (!hit) {
          for (const k of Object.keys(props)) {
            const v = props[k];
            if (v != null && String(v).toLowerCase().includes(q)) {
              hit = true;
              break;
            }
          }
        }
        if (!hit) continue;
      }

      out.push({ key: i, index: i, label });
    }
    return out;
  }, [features, query]);

  const columns = useMemo(
    () => [
      { title: "Feature", dataIndex: "label", key: "label", ellipsis: true },
      {
        title: "#",
        dataIndex: "index",
        key: "index",
        width: 60,
        render: (v) => <Text type="secondary">{v}</Text>,
      },
    ],
    [],
  );

  const rowSelection = {
    selectedRowKeys: selectedIndices || [],
    onChange: (keys) => {
      if (disabled) return;
      onChangeSelectedIndices(keys.map((k) => Number(k)));
    },
    getCheckboxProps: () => ({ disabled }),
  };

  const onSelectAll = () => {
    const all = rows.map((r) => r.index);
    const set = new Set([...(selectedIndices || []), ...all]);
    onChangeSelectedIndices([...set]);
  };
  const onClear = () => onChangeSelectedIndices([]);

  return (
    <Space direction="vertical" size={4} style={{ width: "100%" }}>
      <Space size={4} style={{ width: "100%" }}>
        <Input
          size="small"
          prefix={<SearchOutlined />}
          placeholder="Search features..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          allowClear
          disabled={disabled}
        />
        <Button size="small" onClick={onSelectAll} disabled={disabled}>
          Select All
        </Button>
        <Button size="small" onClick={onClear} disabled={disabled}>
          Clear
        </Button>
      </Space>

      <div
        style={{
          border: "1px solid #d9d9d9",
          borderRadius: 4,
          maxHeight: height,
          overflow: "auto",
        }}
      >
        <Table
          size="small"
          rowKey="key"
          pagination={{ pageSize: 10, hideOnSinglePage: true, size: "small" }}
          columns={columns}
          dataSource={rows}
          rowSelection={rowSelection}
          scroll={{ y: height - 40 }}
        />
      </div>

      <Tag color={selectedIndices?.length ? "blue" : "default"} style={{ fontSize: 11 }}>
        {selectedIndices?.length || 0} selected
      </Tag>
    </Space>
  );
}