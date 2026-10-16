// spatialQuery/components/FeaturePicker.jsx
import React, { useMemo, useState } from "react";
import { Table, Input, Space, Button, Typography, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Text } = Typography;

/**
 * Compact paginated feature picker.
 * Selection is a list of indices; caller owns the source of truth.
 * Never renders the full layer.
 *
 * Columns are derived dynamically from feature properties keys.
 */
export default function FeaturePicker({
  features,
  selectedIndices,
  onChangeSelectedIndices,
  disabled,
  height = 200,
}) {
  const [query, setQuery] = useState("");

  // Collect the union of all property keys across features (preserving order).
  const propertyKeys = useMemo(() => {
    if (!features?.length) return [];
    const seen = new Set();
    const keys = [];
    for (const f of features) {
      const props = f?.properties;
      if (!props) continue;
      for (const k of Object.keys(props)) {
        if (!seen.has(k)) {
          seen.add(k);
          keys.push(k);
        }
      }
    }
    return keys;
  }, [features]);

  const rows = useMemo(() => {
    if (!features?.length) return [];
    const q = query.trim().toLowerCase();
    const out = [];

    for (let i = 0; i < features.length; i++) {
      const props = features[i]?.properties || {};

      if (q) {
        let hit = false; // Check if the query matches any property value
        for (const k of Object.keys(props)) {
          const v = props[k];
          if (v != null && String(v).toLowerCase().includes(q)) {
            hit = true;
            break;
          }
        }
        // Also allow matching the row index, e.g. "3"
        if (!hit && String(i).includes(q)) hit = true;
        if (!hit) continue;
      }

      // Build a flat row: { key, index, __props: {...} }
      const row = { key: i, index: i+1 };
      for (const k of propertyKeys) {
        const v = props[k];
        row[k] = v === null || v === undefined ? "" : v;
      }
      out.push(row);
    }
    return out;
  }, [features, query, propertyKeys]);

  const columns = useMemo(() => {
    const cols = [
      {
        title: "#",
        dataIndex: "index",
        key: "index",
        width: 60,
        fixed: "left",
        render: (v) => <Text type="secondary">{v}</Text>,
      },
    ];

    for (const k of propertyKeys) {
      cols.push({
        title: k,
        dataIndex: k,
        key: k,
        ellipsis: true,
        width: 140,
        render: (v) => {
          if (v === null || v === undefined || v === "") {
            return <Text type="secondary">—</Text>;
          }
          const s = String(v);
          return <span title={s}>{s}</span>;
        },
        sorter: (a, b) => {
          const av = a[k];
          const bv = b[k];
          if (av === bv) return 0;
          if (av === null || av === undefined) return -1;
          if (bv === null || bv === undefined) return 1;
          if (typeof av === "number" && typeof bv === "number") {
            return av - bv;
          }
          return String(av).localeCompare(String(bv));
        },
      });
    }

    return cols;
  }, [propertyKeys]);

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

  const scrollX = useMemo(
    () => 60 + propertyKeys.length * 140,
    [propertyKeys.length],
  );

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
          // maxHeight: height+5,
          overflow: "auto",
          scrollbarWidth: "none"
        }}
      >
        <Table
          size="small"
          rowKey="key"
          pagination={{
            pageSize: 10,
            hideOnSinglePage: true,
            size: "small",
            showSizeChanger: false,
          }}
          columns={columns}
          dataSource={rows}
          rowSelection={rowSelection}
          scroll={{ x: scrollX, y: height - 40 }}
        />
      </div>

      <Tag
        color={selectedIndices?.length ? "blue" : "default"}
        style={{ fontSize: 11 }}
      >
        {selectedIndices?.length || 0} selected
        {propertyKeys.length > 0 && ` · ${rows.length} features`}
      </Tag>
    </Space>
  );
}