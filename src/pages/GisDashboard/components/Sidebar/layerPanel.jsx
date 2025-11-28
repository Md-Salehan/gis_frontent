import React, {
  memo,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import { Checkbox, Col, Row, Space, Spin, Modal } from "antd";
import { useGetLayerObjectsMutation } from "../../../../store/api/layerApi";
import { useDispatch, useSelector } from "react-redux";
import { LeyerIcon } from "../../../../components";
import { setGeoJsonLayer } from "../../../../store/slices/mapSlice";
import { setLoadingMessage } from "../../../../store/slices/uiSlice";

const LayerCheckbox = memo(({ option, disabled }) => (
  <Col span={24}>
    <Checkbox value={option.value} disabled={disabled}>
      <Space>
        <LeyerIcon iconInfo={option?.styleInfo} />
        {option.label}
        {disabled && <Spin size="small" style={{ marginLeft: 8 }} />}
      </Space>
    </Checkbox>
  </Col>
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

  return (
    <div className="layer-panel">
      <h2 className="panel-title">Layers</h2>
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
      <Checkbox.Group
        onChange={onChange}
        value={checkedState.checkedLayers}
        style={{ width: "100%" }}
      >
        <Row gutter={[8, 8]}>
          {layerOptions.map((option) => (
            <LayerCheckbox
              key={option.value}
              option={option}
              disabled={checkedState.loadingLayers.has(option.value)}
            />
          ))}
        </Row>
      </Checkbox.Group>
    </div>
  );
});

LayerPanel.displayName = "LayerPanel";
export default LayerPanel;
