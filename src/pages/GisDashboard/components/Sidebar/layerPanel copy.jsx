import React, { memo, useCallback, useMemo, useState, useEffect, useRef } from "react";
import { Checkbox, Col, Row } from "antd";
import { useGetLayerObjectsMutation } from "../../../../store/api/layerApi";
import { useSelector } from "react-redux";

const LayerPanel = memo(({ layers = [], handleLayerToggle }) => {
  const [checkedLayers, setCheckedLayers] = useState([]);
  const [loadingLayers, setLoadingLayers] = useState(new Set());

  const [getLayerObjects] = useGetLayerObjectsMutation();

  // refs to keep latest values inside async handlers
  const pendingRequestsRef = useRef(new Map()); // layerId -> promise
  const checkedRef = useRef(new Set());

  // Get active layers from Redux store (geoJsonLayers keyed by id)
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers || {});

  // initialize checkedLayers from redux active layers when layers prop or geoJsonLayers changes
  useEffect(() => {
    if (!layers) return;
    const activeIds = layers
      .map((item) => item.layer_mst.layer_id)
      .filter((id) => !!geoJsonLayers[id]);
    setCheckedLayers(activeIds);
    checkedRef.current = new Set(activeIds);
  }, [layers, geoJsonLayers]);

  const fetchLayerData = useCallback(
    async (layerId) => {
      // mark loading
      setLoadingLayers((prev) => {
        const s = new Set(prev);
        s.add(layerId);
        return s;
      });

      // trigger mutation and keep promise so we can abort later
      const promise = getLayerObjects(layerId );
      pendingRequestsRef.current.set(layerId, promise);

      try {
        const response = await promise.unwrap();

        // only add layer if still checked
        if (checkedRef.current.has(layerId)) {
          // assume response.geojson contains geojson
          handleLayerToggle(layerId, response.geojson, true);
        } else {
          // user unchecked while loading -> do not add
        }
      } catch (error) {
        // ignore abort errors, log others
        if (error?.name === "AbortError") {
          // aborted by user action
        } else {
          console.error(`Error fetching GeoJSON for layer ${layerId}:`, error);
        }
      } finally {
        pendingRequestsRef.current.delete(layerId);
        setLoadingLayers((prev) => {
          const s = new Set(prev);
          s.delete(layerId);
          return s;
        });
      }
    },
    [getLayerObjects, handleLayerToggle]
  );

  const onChange = useCallback(
    async (checkedValues) => {
      const previous = new Set(checkedLayers);
      const now = new Set(checkedValues);

      // update state + ref immediately so fetch callbacks can check latest
      setCheckedLayers(checkedValues);
      checkedRef.current = new Set(checkedValues);

      // newly checked -> fetch (if not already loaded)
      for (const layerId of checkedValues) {
        if (!previous.has(layerId) && !geoJsonLayers[layerId]) {
          fetchLayerData(layerId);
        }
      }

      // unchecked -> abort pending and remove from map
      for (const layerId of previous) {
        if (!now.has(layerId)) {
          // abort any pending request
          const pending = pendingRequestsRef.current.get(layerId);
          if (pending && typeof pending.abort === "function") {
            try {
              pending.abort();
            } catch {}
            pendingRequestsRef.current.delete(layerId);
          }
          // clear loading state if present
          setLoadingLayers((prev) => {
            const s = new Set(prev);
            s.delete(layerId);
            return s;
          });
          // remove layer from map
          handleLayerToggle(layerId, null, false);
        }
      }
    },
    [checkedLayers, fetchLayerData, handleLayerToggle, geoJsonLayers]
  );

  const layerOptions = useMemo(
    () =>
      layers?.map((item) => {
        const id = item.layer_mst.layer_id;
        return {
          label: item.layer_mst.layer_nm,
          value: id,
          disabled: loadingLayers.has(id),
        };
      }) || [],
    [layers, loadingLayers]
  );

  return (
    <div className="layer-panel">
      <h2 className="panel-title">Layers</h2>
      <Checkbox.Group onChange={onChange} value={checkedLayers} style={{ width: "100%" }}>
        <Row gutter={[8, 8]}>
          {layerOptions.map((option) => (
            <Col span={24} key={option.value}>
              <Checkbox value={option.value} disabled={option.disabled}>
                {option.label}
                {option.disabled && " (Loading...)"}
              </Checkbox>
            </Col>
          ))}
        </Row>
      </Checkbox.Group>
    </div>
  );
});

LayerPanel.displayName = "LayerPanel";
export default LayerPanel;