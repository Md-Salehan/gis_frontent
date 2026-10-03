// spatialQuery/components/QueryResultsTable.jsx
import React, { useMemo } from "react";
import { Table, Tag, Typography, Tooltip } from "antd";
import { AimOutlined } from "@ant-design/icons";

const { Text } = Typography;

function labelOf(feature, fallbackId) {
  const p = feature?.properties || {};
  const v =
    p.name ?? p.NAME ?? p.label ?? p.id ?? p.feature_id ?? p.OBJECTID ?? null;
  return v !== null && v !== undefined ? String(v) : fallbackId;
}

/**
 * One row per SOURCE feature. Matched targets are shown in an expanded
 * sub-table (or as a count when collapsed).
 */
export default function QueryResultsTable({
  rows,
  onFocusSource,
  onFocusTarget,
  maxHeight = 280,
}) {
  const data = useMemo(
    () =>
      (rows || []).map((r, i) => ({
        key: `${r.source.layerId}::${r.source.featureId}::${i}`,
        _index: i,
        sourceLayer: r.source.layerId,
        sourceLabel: labelOf(r.source.feature, r.source.featureId),
        targetLayer: r.matchedTargets[0]?.layerId || "",
        targetCount: r.matchedTargets.length,
        operation: r.operation,
        distance: r.distance,
        _raw: r,
      })),
    [rows],
  );

  const columns = useMemo(
    () => [
      {
        title: "#",
        dataIndex: "_index",
        key: "_index",
        width: 44,
        render: (v) => (
          <Text type="secondary" style={{ fontSize: 11 }}>
            {v + 1}
          </Text>
        ),
      },
      {
        title: "Source Layer",
        dataIndex: "sourceLayer",
        key: "sourceLayer",
        ellipsis: true,
      },
      {
        title: "Source Feature",
        dataIndex: "sourceLabel",
        key: "sourceLabel",
        ellipsis: true,
        render: (v, rec) => (
          <Tooltip title="Focus source feature">
            <a onClick={() => onFocusSource?.(rec._raw.source)}>
              <AimOutlined style={{ marginRight: 4 }} />
              {v}
            </a>
          </Tooltip>
        ),
      },
      {
        title: "Target Layer",
        dataIndex: "targetLayer",
        key: "targetLayer",
        ellipsis: true,
      },
      {
        title: "Matches",
        dataIndex: "targetCount",
        key: "targetCount",
        width: 80,
        render: (v) => (
          <Tag color="blue" style={{ fontSize: 11 }}>
            {v}
          </Tag>
        ),
      },
      {
        title: "Op",
        dataIndex: "operation",
        key: "operation",
        width: 110,
        render: (v) => (
          <Tag color="geekblue" style={{ fontSize: 10 }}>
            {v}
          </Tag>
        ),
      },
      {
        title: "Dist (m)",
        dataIndex: "distance",
        key: "distance",
        width: 80,
        render: (v) =>
          v !== null && v !== undefined ? (
            Math.round(v)
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
    ],
    [onFocusSource],
  );

  const expandedRowRender = (rec) => {
    const targets = rec._raw.matchedTargets || [];
    return (
      <Table
        size="small"
        rowKey={(t, i) => `${t.layerId}::${t.featureId}::${i}`}
        pagination={false}
        columns={[
          {
            title: "Target Layer",
            dataIndex: "layerId",
            key: "layerId",
            width: 140,
            ellipsis: true,
          },
          {
            title: "Target Feature",
            key: "label",
            ellipsis: true,
            render: (_, t) => (
              <Tooltip title="Focus target feature">
                <a onClick={() => onFocusTarget?.(t)}>
                  {labelOf(t.feature, t.featureId)}
                </a>
              </Tooltip>
            ),
          },
          {
            title: "Dist (m)",
            key: "distance",
            width: 80,
            render: (_, t) =>
              t.distance != null ? (
                Math.round(t.distance)
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
        ]}
        dataSource={targets}
      />
    );
  };

  return (
    <div
      style={{
        border: "1px solid #f0f0f0",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <Table
        size="small"
        rowKey="key"
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 10, size: "small", hideOnSinglePage: false }}
        scroll={{ y: maxHeight }}
        expandable={{
          expandedRowRender,
          rowExpandable: (rec) => (rec._raw.matchedTargets || []).length > 0,
        }}
      />
    </div>
  );
}