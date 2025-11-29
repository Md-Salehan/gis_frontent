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
import { setGeoJsonLayer } from "../../../../store/slices/mapSlice";
import { setLoadingMessage } from "../../../../store/slices/uiSlice";

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
          {option.label} | {option.value}
        </span>
      </Space>

      <Space size="small">
        {/* <Text type="secondary" style={{ fontSize: 12 }}>
          {option.orderNo}
        </Text> */}
        {disabled && <Spin size="small" />}
      </Space>
    </Space>
  </Checkbox>
));
LayerCheckbox.displayName = "LayerCheckbox";

const LayerPanel = memo(({ layers = [] }) => {
  const dispatch = useDispatch();
  const { portalId } = useSelector((state) => state.map);
  const loadingMessage = useSelector((state) => state.ui.loadingMessage);

  const [checkedState, setCheckedState] = useState({
    checkedLayers: [],
    loadingLayers: new Set(),
    pendingRequests: new Map(),
  });

  const [getLayerObjects] = useGetLayerObjectsMutation();

  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers || {});

  const [searchTerm, setSearchTerm] = useState("");

  // Memoized layer options - single source of truth
  const layerOptions = useMemo(() => {
    const unsortedList = layers.filter((item) => item?.layer_order_no === "0");
    const sortedList = layers
      .filter((item) => item?.layer_order_no !== "0")
      .sort((a, b) => {
        const orderA = Number(a.layer_order_no);
        const orderB = Number(b.layer_order_no);
        return orderA - orderB;
      });

    const sortedLayers = [...sortedList, ...unsortedList];
    return (
      sortedLayers?.map((item, idx) => ({
        label: item.layer_mst.layer_nm,
        value: item.layer_mst.layer_id,
        styleInfo: {
          geom_typ: item.geomStyle_mst.geom_typ,
          fill_color: item.geomStyle_mst.fill_color,
          stroke_color: item.geomStyle_mst.stroke_color,
          marker_fa_icon_name: item.geomStyle_mst.marker_fa_icon_name,
          marker_color: item.geomStyle_mst.marker_color,
          marker_size: item.geomStyle_mst.marker_size,
        },
        orderNo: idx.toString(),
      })) || []
    );
  }, [layers]);

  // filtered options for search UI
  const filteredOptions = useMemo(() => {
    const s = (searchTerm || "").trim().toLowerCase();
    if (!s) return layerOptions;
    return layerOptions.filter((o) =>
      (o.label || "").toLowerCase().includes(s)
    );
  }, [layerOptions, searchTerm]);

  // Sync with Redux state using layerOptions
  useEffect(() => {
    if (!layerOptions?.length) return;

    const activeIds = layerOptions
      .map((item) => item.value)
      .filter((id) => !!geoJsonLayers[id]);

    setCheckedState((prev) => ({
      ...prev,
      checkedLayers: activeIds,
    }));
  }, [layerOptions, geoJsonLayers]);

  const handleLayerToggle = useCallback(
    (layerId, geoJsonData, metaData, isActive, orderNo) => {
      dispatch(
        setGeoJsonLayer({
          layerId,
          geoJsonData,
          metaData,
          isActive,
          orderNo,
        })
      );
    },
    [dispatch]
  );

  const fetchLayerData = useCallback(
    async (layerId) => {
      setCheckedState((prev) => ({
        ...prev,
        loadingLayers: new Set([...prev.loadingLayers, layerId]),
      }));

      try {
        const response = await getLayerObjects({ layerId, portalId }).unwrap();
        setCheckedState((prev) => {
          if (!prev.checkedLayers.includes(layerId)) return prev;

          const layerMetaData = response?.metaData || {};
          const orderNo =
            layerOptions.find((opt) => opt.value === layerId)?.orderNo || "0";

          handleLayerToggle(
            layerId,
            response.geojson,
            layerMetaData,
            true,
            orderNo
          );
          const newLoading = new Set(prev.loadingLayers);
          newLoading.delete(layerId);

          return {
            ...prev,
            loadingLayers: newLoading,
          };
        });
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error(`Error fetching layer ${layerId}:`, error);
        }

        setCheckedState((prev) => {
          const newLoading = new Set(prev.loadingLayers);
          newLoading.delete(layerId);
          return {
            ...prev,
            loadingLayers: newLoading,
          };
        });
      }
    },
    [getLayerObjects, handleLayerToggle, portalId, layerOptions]
  );

  const onChange = useCallback(
    async (checkedValues) => {
      const previous = new Set(checkedState.checkedLayers);
      const current = new Set(checkedValues);

      const toFetch = checkedValues.filter(
        (id) => !previous.has(id) && !geoJsonLayers[id]
      );

      const toRemove = [...previous].filter((id) => !current.has(id));

      setCheckedState((prev) => ({
        ...prev,
        checkedLayers: checkedValues,
      }));

      toFetch.forEach(fetchLayerData);

      toRemove.forEach((layerId) => {
        handleLayerToggle(layerId, null, {}, false, "0");
      });
    },
    [
      checkedState.checkedLayers,
      fetchLayerData,
      handleLayerToggle,
      geoJsonLayers,
    ]
  );

  // Load default layers using layerOptions
  useEffect(() => {
    const loadDefaultLayers = async () => {
      if (!layerOptions?.length) return;

      const defaultLayers = layerOptions.filter((opt) => {
        const originalLayer = layers.find(
          (l) => l.layer_mst.layer_id === opt.value
        );
        return originalLayer?.default_view_flg === "Y";
      });

      if (!defaultLayers.length) return;

      dispatch(setLoadingMessage("Loading default layers..."));

      try {
        const promises = defaultLayers.map((layer) =>
          getLayerObjects({
            layerId: layer.value,
            portalId,
          }).unwrap()
        );

        const results = await Promise.all(promises);

        results.forEach((response, index) => {
          const layerId = defaultLayers[index].value;
          const layerMetaData = response?.metaData || {};
          const orderNo = defaultLayers[index].orderNo || "0";

          handleLayerToggle(
            layerId,
            response.geojson,
            layerMetaData,
            true,
            orderNo
          );
        });

        setCheckedState((prev) => ({
          ...prev,
          checkedLayers: [
            ...prev.checkedLayers,
            ...defaultLayers.map((l) => l.value),
          ],
        }));
      } catch (error) {
        console.error("Error loading default layers:", error);
      } finally {
        dispatch(setLoadingMessage(null));
      }
    };

    loadDefaultLayers();
  }, [
    layerOptions,
    layers,
    dispatch,
    getLayerObjects,
    handleLayerToggle,
    portalId,
  ]);

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
      (id) => !visibleSet.has(id)
    );
    onChange(remaining);
  }, [filteredOptions, checkedState.checkedLayers, onChange]);

  // Number of active layers (selected)
  const activeCount = (checkedState.checkedLayers || []).length;

  return (
    <Card
      size="small"
      bordered={false}
      bodyStyle={{ padding: 12 }}
      style={{ width: "100%" }}
      title={
        <Row align="middle" justify="space-between" style={{ gap: 8 }}>
          <Col>
            <Text strong style={{ fontSize: 16 }}>
              Layers
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
              {/* <Tooltip title="Select visible">
                <Button
                  type="text"
                  size="small"
                  icon={<SelectOutlined />}
                  onClick={selectAllVisible}
                />
              </Tooltip> */}
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
      {loadingMessage && (
        <Modal
          title="Loading"
          open={!!loadingMessage}
          footer={null}
          closable={false}
        >
          <Space>
            <Spin />
            <span>{loadingMessage}</span>
          </Space>
        </Modal>
      )}

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
            style={{  overflow: "auto" }}
          />
        )}
      </Checkbox.Group>
    </Card>
  );
});

LayerPanel.displayName = "LayerPanel";
export default LayerPanel;
