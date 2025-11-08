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

// const renderLayerIcon = (iconInfo) => {
//   let geom_typ = iconInfo?.geom_typ;
//   let iconType = "unknown-layer-icon";
//   let style = {
//     backgroundColor: iconInfo?.fill_color || "transparent",
//     borderColor: iconInfo?.stroke_color || "black",
//   };

//   if (geom_typ === "G") {
//     iconType = "polygon-icon";
//   } else if (geom_typ === "P") iconType = "point-icon";
//   else if (geom_typ === "L") iconType = "line-icon";

//   return <div className={iconType} style={style}></div>;
// };

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
  const loadingMessage = useSelector((state) => state.ui.loadingMessage);

  // Single source of truth for checked state
  const [checkedState, setCheckedState] = useState({
    checkedLayers: [],
    loadingLayers: new Set(),
    pendingRequests: new Map(),
  });

  const [getLayerObjects] = useGetLayerObjectsMutation();

  // Get active layers from Redux store
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers || {});

  // Sync with Redux state
  useEffect(() => {
    if (!layers?.length) return;

    const activeIds = layers
      .map((item) => item.layer_mst.layer_id)
      .filter((id) => !!geoJsonLayers[id]);

    setCheckedState((prev) => ({
      ...prev,
      checkedLayers: activeIds,
    }));
  }, [layers, geoJsonLayers]);

  const handleLayerToggle = useCallback(
    (layerId, geoJsonData, metaData, isActive) => {
      dispatch(setGeoJsonLayer({ layerId, geoJsonData, metaData, isActive }));
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
        const response = await getLayerObjects(layerId).unwrap();

        // Only update if still mounted and checked
        setCheckedState((prev) => {
          if (!prev.checkedLayers.includes(layerId)) return prev;

          const layerMetaData = response?.metaData || {};

          handleLayerToggle(layerId, response.geojson, layerMetaData, true);
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

        // Cleanup loading state
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
    [getLayerObjects, handleLayerToggle]
  );

  const onChange = useCallback(
    async (checkedValues) => {
      const previous = new Set(checkedState.checkedLayers);
      const current = new Set(checkedValues);

      // Handle newly checked layers
      const toFetch = checkedValues.filter(
        (id) => !previous.has(id) && !geoJsonLayers[id]
      );

      // Handle unchecked layers
      const toRemove = [...previous].filter((id) => !current.has(id));

      setCheckedState((prev) => ({
        ...prev,
        checkedLayers: checkedValues,
      }));

      // Start new fetches
      toFetch.forEach(fetchLayerData);

      // Remove unchecked layers
      toRemove.forEach((layerId) => {
        handleLayerToggle(layerId, null, {}, false);
      });
    },
    [
      checkedState.checkedLayers,
      fetchLayerData,
      handleLayerToggle,
      geoJsonLayers,
    ]
  );

  const layerOptions = useMemo(
    () =>
      layers?.map((item) => ({
        label: item.layer_mst.layer_nm,
        value: item.layer_mst.layer_id,
        styleInfo: {
          geom_typ: item.geomStyle_mst.geom_typ,
          fill_color: item.geomStyle_mst.fill_color,
          stroke_color: item.geomStyle_mst.stroke_color,
        },
      })) || [],
    [layers]
  );

  // Load default layers on initial mount
  useEffect(() => {
    const loadDefaultLayers = async () => {
      if (!layers?.length) return;

      const defaultLayers = layers.filter(
        (layer) => layer.default_view_flg === "Y"
      );
      if (!defaultLayers.length) return;

      dispatch(setLoadingMessage("Loading default layers..."));

      try {
        // Load all default layers in parallel
        const promises = defaultLayers.map((layer) =>
          getLayerObjects(layer.layer_mst.layer_id).unwrap()
        );

        const results = await Promise.all(promises);

        // Update state for each loaded layer
        results.forEach((response, index) => {
          const layerId = defaultLayers[index].layer_mst.layer_id;
          const layerMetaData = response?.metaData || {};
          handleLayerToggle(layerId, response.geojson, layerMetaData, true);
        });

        // Update checked state
        setCheckedState((prev) => ({
          ...prev,
          checkedLayers: [
            ...prev.checkedLayers,
            ...defaultLayers.map((l) => l.layer_mst.layer_id),
          ],
        }));
      } catch (error) {
        console.error("Error loading default layers:", error);
      } finally {
        dispatch(setLoadingMessage(null));
      }
    };

    loadDefaultLayers();
  }, [layers, dispatch, getLayerObjects, handleLayerToggle]);

  return (
    <div className="layer-panel">
      <h2 className="panel-title">Layers</h2>
      {loadingMessage && (
        <Modal
          title="Loading"
          visible={!!loadingMessage}
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
