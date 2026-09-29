import React, { useMemo, useCallback, useState, memo } from "react";
import {
  Tabs,
  Table,
  Checkbox,
  Button,
  Input,
  Space,
  Tag,
  Empty,
  Tooltip,
  Badge,
} from "antd";
import {
  SearchOutlined,
  EnvironmentOutlined,
  DeleteOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  setMultiSelectedFeatures,
  toggleMultiSelectedFeatures,
  setSelectedFeature,
} from "../../store/slices/mapSlice";
import { MAP_FIT_OPTIONS } from "../../constants";
import Movable from "../common/Movable";
import { Link } from "lucide-react";

// ============================================
// Helpers
// ============================================
const rowKeyOf = (layerId, featureIndex) => `${layerId}-${featureIndex}`;

const isArrayOfStrings = (v) =>
  Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string");

const renderCellValue = (value) => {
  if (isArrayOfStrings(value)) {
    return (
      <Space direction="vertical" size={0}>
        {value.map((url, i) => (
          <Button
            key={i}
            type="link"
            size="small"
            style={{ padding: 0, height: "auto" }}
            onClick={(e) => {
              e.stopPropagation();
              if (!url) return;
              window.open(
                url.startsWith("http") ? url : `https://${url}`,
                "_blank",
                "noopener,noreferrer",
              );
            }}
          >
            {url.length > 40 ? `${url.substring(0, 37)}...` : url}
          </Button>
        ))}
      </Space>
    );
  }
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const buildPropertyColumns = (properties) => {
  if (!properties) return [];
  return Object.keys(properties).map((key) => ({
    title: key.charAt(0).toUpperCase() + key.slice(1),
    dataIndex: key,
    key,
    ellipsis: true,
    render: (v) => renderCellValue(v),
  }));
};

// ============================================
// Per-layer tab content
// ============================================
const LayerTab = memo(function LayerTab({ layerId, features, layerName }) {
  const dispatch = useDispatch();
  const map = useMap();
  const [search, setSearch] = useState("");

  // Row-key Set for O(1) checkbox lookups
  const selectedKeys = useMemo(() => {
    const s = new Set();
    features.forEach((f) => s.add(rowKeyOf(f.layerId, f.featureIndex)));
    return s;
  }, [features]);

  // Filtered rows (search across property values)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return features;
    return features.filter((f) => {
      const props = f.feature?.properties || {};
      for (const k of Object.keys(props)) {
        const v = props[k];
        if (v != null && String(v).toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [features, search]);

  const columns = useMemo(() => {
    const selectCol = {
      title: (
        <Tooltip title="Uncheck to deselect">
          <Checkbox
            checked={
              filtered.length > 0 &&
              filtered.every((f) =>
                selectedKeys.has(rowKeyOf(f.layerId, f.featureIndex)),
              )
            }
            indeterminate={
              filtered.some((f) =>
                selectedKeys.has(rowKeyOf(f.layerId, f.featureIndex)),
              ) &&
              !filtered.every((f) =>
                selectedKeys.has(rowKeyOf(f.layerId, f.featureIndex)),
              )
            }
            onChange={(e) => {
              const checked = e.target.checked;
              if (!checked) {
                // Remove all visible features of this layer
                filtered.forEach((f) =>
                  dispatch(
                    toggleMultiSelectedFeatures({
                      layerId: f.layerId,
                      featureIndex: f.featureIndex,
                      feature: f.feature,
                      metaData: f.metaData,
                    }),
                  ),
                );
              }
              // "Check all" is intentionally a no-op here since every row
              // in this table is already selected by definition.
            }}
          />
        </Tooltip>
      ),
      key: "select",
      width: 44,
      fixed: "left",
      render: (_, record) => {
        const key = rowKeyOf(record.layerId, record.featureIndex);
        return (
          <Checkbox
            checked={selectedKeys.has(key)}
            onChange={() =>
              dispatch(
                toggleMultiSelectedFeatures({
                  layerId: record.layerId,
                  featureIndex: record.featureIndex,
                  feature: record.feature,
                  metaData: record.metaData,
                }),
              )
            }
          />
        );
      },
    };

    const findCol = {
      title: "",
      key: "find",
      width: 44,
      fixed: "left",
      render: (_, record) => (
        <Tooltip title="Locate on map">
          <Button
            size="small"
            icon={<EnvironmentOutlined />}
            onClick={() => {
              dispatch(
                setSelectedFeature({
                  feature: [record.feature],
                  metaData: {
                    ...record.metaData,
                    selectedKeys: [
                      rowKeyOf(record.layerId, record.featureIndex),
                    ],
                  },
                }),
              );
              if (map) {
                try {
                  const bounds = L.geoJSON(record.feature).getBounds();
                  if (bounds?.isValid?.()) {
                    map.flyToBounds(bounds, MAP_FIT_OPTIONS);
                  }
                } catch (err) {
                  // ignore invalid geometry
                }
              }
            }}
          />
        </Tooltip>
      ),
    };

    return [
      selectCol,
      findCol,
      ...buildPropertyColumns(features[0]?.feature?.properties),
    ];
  }, [features, filtered, selectedKeys, dispatch, map]);

  const dataSource = useMemo(
    () =>
      filtered.map((f) => ({
        key: rowKeyOf(f.layerId, f.featureIndex),
        layerId: f.layerId,
        featureIndex: f.featureIndex,
        feature: f.feature,
        metaData: f.metaData,
        ...(f.feature?.properties || {}),
      })),
    [filtered],
  );

  const clearLayer = () => {
    features.forEach((f) =>
      dispatch(
        toggleMultiSelectedFeatures({
          layerId: f.layerId,
          featureIndex: f.featureIndex,
          feature: f.feature,
          metaData: f.metaData,
        }),
      ),
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Space size={6} style={{ marginBottom: 4 }}>
        <Input
          size="small"
          placeholder={`Search ${layerName}…`}
          prefix={<SearchOutlined style={{ color: "#bbb" }} />}
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 240 }}
        />
        <Tag color="blue" style={{ margin: 0 }}>
          {features.length} selected
        </Tag>
        <Button size="small" icon={<DeleteOutlined />} onClick={clearLayer}>
          Clear layer
        </Button>
      </Space>

      {filtered.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: "#999" }}>
          No matching features
        </div>
      ) : (
        <Table
          rowKey="key"
          size="small"
          columns={columns}
          dataSource={dataSource}
          pagination={{
            pageSize: 10,
            size: "small",
            hideOnSinglePage: true,
            showSizeChanger: false,
          }}
          scroll={{ x: true, y: 240 }}
        />
      )}
    </div>
  );
});

// ============================================
// Main Panel
// ============================================
function SelectedFeaturesPanel() {
  const dispatch = useDispatch();
  const multiSelectedFeatures = useSelector((s) => s.map.multiSelectedFeatures);
  const { isSelectedFeaturePanelOpen } = useSelector((state) => state.ui);

  // Group by layerId — pure derivation, no local state
  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of multiSelectedFeatures || []) {
      const { layerId, featureIndex, feature, metaData } = item;
      if (!layerId || featureIndex == null) continue;
      if (!map.has(layerId)) {
        map.set(layerId, {
          layerId,
          layerName: metaData?.layer?.layer_nm || layerId,
          features: [],
        });
      }
      map.get(layerId).features.push(item);
    }
    return Array.from(map.values());
  }, [multiSelectedFeatures]);

  const clearAll = useCallback(() => {
    dispatch(setMultiSelectedFeatures([]));
  }, [dispatch]);

  if (grouped.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafafa",
        }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: "#888" }}>
              No features selected.
              <br />
              Select features on the map or in the Attribute Table.
            </span>
          }
        />
      </div>
    );
  }

  const tabs = grouped.map(({ layerId, layerName, features }) => ({
    key: layerId,
    label: (
      <span>
        {layerName}&nbsp;
        <Badge
          count={features.length}
          size="small"
          style={{ backgroundColor: "#1677ff" }}
        />
      </span>
    ),
    children: (
      <LayerTab layerId={layerId} layerName={layerName} features={features} />
    ),
  }));

  if (isSelectedFeaturePanelOpen)
    return (
      <Movable
        id="selectedFeature"
        isMovable={true}
        title="Selected Feature"
        icon={<Link />}
        titleFontSize={14}
        // onPositionChange={handlePositionChange}
        // initialPosition={position}
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          height: "auto",
          width: "550px",
        }}
        onClose={(e) => {
          dispatch(
            handleMinimizeGlobalComp({
              id: "selectedFeature",
              status: false,
            }),
          );
          dispatch(toggleSelectedFeaturePanel({ state: false }));
        }}
        isMinimizable={true}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            padding: 8,
            background: "#fff",
            boxSizing: "border-box",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 8px 8px",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <Space size={8}>
              <strong style={{ fontSize: 14 }}>Selected Features</strong>
              <Tag color="blue" style={{ margin: 0 }}>
                {multiSelectedFeatures.length} total
              </Tag>
            </Space>
            <Button
              size="small"
              danger
              icon={<ClearOutlined />}
              onClick={clearAll}
            >
              Clear all
            </Button>
          </div>

          {/* Tabs */}
          <Tabs
            type="card"
            size="small"
            items={tabs}
            style={{ flex: 1, minHeight: 0 }}
            tabBarStyle={{ marginBottom: 6 }}
            destroyOnHidden={false}
            animated={false}
          />
        </div>
      </Movable>
    );
  else return "";
}

export default memo(SelectedFeaturesPanel);
