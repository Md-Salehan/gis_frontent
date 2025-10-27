import React, {
  memo,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import { Checkbox, Col, Row, Space, Spin } from "antd";
import { useGetLayerObjectsMutation } from "../../../../store/api/layerApi";
import { useSelector } from "react-redux";

const renderLayerIcon = (iconInfo) => {
  let geom_typ = iconInfo?.geom_typ;
  let iconType = "unknown-layer-icon";
  let style = {
    backgroundColor: iconInfo?.fill_color || "transparent",
    borderColor: iconInfo?.stroke_color || "black",
  };

  if (geom_typ === "G") {
    iconType = "polygon-icon";
  } else if (geom_typ === "P") iconType = "point-icon";
  else if (geom_typ === "L") iconType = "line-icon";

  return <div className={iconType} style={style}></div>;
};

const LayerCheckbox = memo(({ option, disabled }) => (
  <Col span={24}>
    <Checkbox value={option.value} disabled={disabled}>
      <Space>
        {renderLayerIcon(option?.styleInfo)}
        {option.label}
        {disabled && <Spin size="small" style={{ marginLeft: 8 }} />}
      </Space>
    </Checkbox>
  </Col>
));

LayerCheckbox.displayName = "LayerCheckbox";

const LayerPanel = memo(({ layers = [], handleLayerToggle }) => {
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

          handleLayerToggle(layerId, response.geojson, true);
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
        handleLayerToggle(layerId, null, false);
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

  return (
    <div className="layer-panel">
      <h2 className="panel-title">Layers</h2>
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
