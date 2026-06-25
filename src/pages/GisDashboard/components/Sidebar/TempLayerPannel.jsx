import React, { memo, useCallback, useMemo, useState, useEffect } from "react";
import {
  Checkbox,
  Col,
  Row,
  Space,
  Spin,
  Modal,
  Card,
  Input,
  Button,
  Divider,
  List,
  Tooltip,
  Typography,
  Empty,
} from "antd";
import {
  SearchOutlined,
  SelectOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { useGetLayerObjectsMutation } from "../../../../store/api/layerApi";
import { useDispatch, useSelector } from "react-redux";
import { LeyerIcon } from "../../../../components";
import { toggleTempGeoJsonLayer } from "../../../../store/slices/mapSlice";

const { Text } = Typography;

const LayerCheckbox = memo(({ option, disabled }) => (
  <Checkbox value={option.value} disabled={disabled} style={{ width: "100%" }}>
    <Space style={{ width: "100%", justifyContent: "space-between" }}>
      <Space>
        <LeyerIcon iconInfo={option?.styleInfo} />
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {option.label}
        </span>
      </Space>

      <Space size="small">{disabled && <Spin size="small" />}</Space>
    </Space>
  </Checkbox>
));
LayerCheckbox.displayName = "LayerCheckbox";

const TempLayerPannel = memo(({ layers = [] }) => {
  const dispatch = useDispatch();
  const { portalId } = useSelector((state) => state.portal);

  const [checkedState, setCheckedState] = useState({
    checkedLayers: [],
    loadingLayers: new Set(),
    pendingRequests: new Map(),
  });

  const [getLayerObjects] = useGetLayerObjectsMutation();

  const tempGeoJsonLayers = useSelector(
    (state) => state.map.tempGeoJsonLayers || {},
  );

  const [searchTerm, setSearchTerm] = useState("");

  // Memoized layer options - single source of truth
  const layerOptions = useMemo(() => {
    let list = [];
    for (const [key, value] of Object.entries(tempGeoJsonLayers)) {
      list.push({
        label: value.metaData?.layer?.layer_nm || "unknown",
        value: key,
        styleInfo: value.metaData?.style || {},
        isActive: value?.isActive,
      });
    }
    return list;
  }, [tempGeoJsonLayers]);

  // filtered options for search UI
  const filteredOptions = useMemo(() => {
    const s = (searchTerm || "").trim().toLowerCase();
    if (!s) return layerOptions;
    return layerOptions.filter((o) =>
      (o.label || "").toLowerCase().includes(s),
    );
  }, [layerOptions, searchTerm]);

  // Sync with Redux state using layerOptions
  useEffect(() => {
    if (!layerOptions?.length) return;

    const activeIds = layerOptions
      .filter((item) => item.isActive)
      .map((item) => item.value);

    setCheckedState((prev) => ({
      ...prev,
      checkedLayers: activeIds,
    }));
  }, [layerOptions, tempGeoJsonLayers]);

  const handleLayerToggle = useCallback(
    (layerId, isActive) => {
      dispatch(
        toggleTempGeoJsonLayer({
          layerId,
          isActive,
        }),
      );
    },
    [dispatch],
  );

  const onChange = useCallback(
    async (checkedValues) => {
      const previous = new Set(checkedState.checkedLayers);
      const current = new Set(checkedValues);
      console.log("onChange called");

      console.log("log3", { previous, current });

      const toFetch = checkedValues.filter((id) => !previous.has(id));

      const toRemove = [...previous].filter((id) => !current.has(id));

      setCheckedState((prev) => ({
        ...prev,
        checkedLayers: checkedValues,
      }));

      console.log("log4", { toFetch, toRemove });

      toFetch.forEach((layerId) => {
        handleLayerToggle(layerId, true);
      });
      toRemove.forEach((layerId) => {
        handleLayerToggle(layerId, false);
      });
    },
    [checkedState.checkedLayers, handleLayerToggle, layerOptions],
  );

  // Select all visible options (keep others intact)
  const selectAllVisible = useCallback(() => {
    const visibleIds = filteredOptions.map((o) => o.value);
    const current = new Set(checkedState.checkedLayers || []);
    visibleIds.forEach((id) => current.add(id));
    onChange(Array.from(current));
  }, [filteredOptions, checkedState.checkedLayers, onChange]);

  // Deselect all visible options
  const deselectAllVisible = useCallback(() => {
    const visibleSet = new Set(filteredOptions.map((o) => o.value));
    const remaining = (checkedState.checkedLayers || []).filter(
      (id) => !visibleSet.has(id),
    );
    onChange(remaining);
  }, [filteredOptions, checkedState.checkedLayers, onChange]);

  // Number of active layers (selected)
  const activeCount = (checkedState.checkedLayers || []).length;

  return (
    <Card
      size="small"
      variant={false}
      styles={{ body: { padding: 12 } }}
      style={{ width: "100%", marginTop: 8 }}
      title={
        <Row align="middle" justify="space-between" style={{ gap: 8 }}>
          <Col>
            <Text strong style={{ fontSize: 16 }}>
              Temporary Layers
            </Text>
            <div
              style={{ fontSize: 12, color: "var(--muted, rgba(0,0,0,0.45))" }}
            >
              <Text type="secondary" style={{ marginRight: 8 }}>
                {activeCount} active
              </Text>
              <Text type="secondary">{layerOptions.length} available</Text>
            </div>
          </Col>

          <Col>
            <Space>
              <Tooltip title="Select visible">
                <Button
                  type="text"
                  size="small"
                  icon={<SelectOutlined />}
                  onClick={selectAllVisible}
                />
              </Tooltip>
              <Tooltip title="Deselect visible">
                <Button
                  type="text"
                  size="small"
                  icon={<ClearOutlined />}
                  onClick={deselectAllVisible}
                />
              </Tooltip>
            </Space>
          </Col>
        </Row>
      }
    >
      <Input
        prefix={<SearchOutlined />}
        placeholder="Search layers..."
        allowClear
        size="middle"
        onChange={(e) => setSearchTerm(e.target.value)}
        value={searchTerm}
        style={{ marginBottom: 8 }}
      />

      <Divider style={{ margin: "8px 0" }} />

      <Checkbox.Group
        onChange={onChange}
        value={checkedState.checkedLayers}
        style={{ width: "100%" }}
      >
        {filteredOptions.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No layers" />
        ) : (
          <List
            size="small"
            dataSource={filteredOptions}
            split={false}
            renderItem={(option) => {
              const isLoading = checkedState.loadingLayers.has(option.value);
              return (
                <List.Item key={option.value} style={{ padding: "6px 0" }}>
                  <LayerCheckbox option={option} disabled={isLoading} />
                </List.Item>
              );
            }}
            style={{ overflow: "auto" }}
          />
        )}
      </Checkbox.Group>
    </Card>
  );
});

TempLayerPannel.displayName = "TempLayerPannel";
export default TempLayerPannel;
