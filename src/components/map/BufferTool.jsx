import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Button,
  InputNumber,
  Select,
  Space,
  message,
  Typography,
  List,
} from "antd";
import CustomDrawer from "../common/CustomDrawer";
import { useDispatch, useSelector } from "react-redux";
import * as turf from "@turf/turf";
import { setGeoJsonLayer } from "../../store/slices/mapSlice";
import { toggleBuffer } from "../../store/slices/uiSlice";

const { Text } = Typography;
const UNITS = [
  { value: "meters", label: "Meters" },
  { value: "kilometers", label: "Kilometers" },
  { value: "miles", label: "Miles" },
  { value: "feet", label: "Feet" },
];

function BufferTool() {
  const dispatch = useDispatch();
  const isOpen = useSelector((s) => s.ui.isBufferOpen);
  // return the actual state values (no fallback to a new array)
  const multiSelected = useSelector((s) => s.map.multiSelectedFeatures);
  const singleSelected = useSelector((s) => s.map.selectedFeature?.feature);
  const [distance, setDistance] = useState(100); // default 100 meters
  const [unit, setUnit] = useState("meters");

  // Use state so UI updates when buffers are created/removed
  const [createdIds, setCreatedIds] = useState([]);
  const createdIdsRef = useRef(createdIds);
  createdIdsRef.current = createdIds;

  const selectedFeatures = useMemo(() => {
    // normalize inputs to avoid creating new array references inside selector
    const multi = Array.isArray(multiSelected) ? multiSelected : [];
    const singleArr = Array.isArray(singleSelected)
      ? singleSelected
      : singleSelected
      ? [singleSelected]
      : [];

    if (multi && multi.length > 0) {
      // multiSelected items are { layerId, feature, metaData }
      return multi.map((m) => ({ ...m }));
    }
    if (singleArr && singleArr.length > 0) {
      // singleSelected is an array (normalized above) of features
      return singleArr.map((f, idx) => ({
        layerId: `selected-${idx}`,
        feature: f,
        metaData: {},
      }));
    }
    return [];
  }, [multiSelected, singleSelected]);

  const hasSelection = selectedFeatures.length > 0;

  const createBuffer = useCallback(() => {
    if (!hasSelection) {
      message.info("No selected features to buffer.");
      return;
    }
    if (!distance || Number(distance) <= 0) {
      message.error("Distance must be a positive number.");
      return;
    }

    try {
      const bufferedFeatures = [];
      selectedFeatures.forEach((sel) => {
        const feat = sel.feature;
        if (!feat || !feat.geometry) return;
        // turf expects a GeoJSON feature; wrap if necessary
        const input = feat.type === "Feature" ? feat : turf.feature(feat);
        const buf = turf.buffer(input, Number(distance), { units: unit });
        if (buf && buf.geometry) bufferedFeatures.push(buf);
      });

      if (bufferedFeatures.length === 0) {
        message.error("Buffer creation failed for selected features.");
        return;
      }

      const fc = turf.featureCollection(bufferedFeatures);
      const id = `buffer-${distance}${unit}-${Date.now()}`;

      // Add layer via setGeoJsonLayer (will appear on top)
      dispatch(
        setGeoJsonLayer({
          layerId: id,
          geoJsonData: fc,
          metaData: {
            layer: { layer_nm: `Buffer ${createdIdsRef.current.length + 1}` },
            style: {
              geom_typ: "G", // polygon
              stroke_color: "#ff0000",
              fill_color: "#ff0000",
              fill_opacity: 0.25,
              stroke_width: 2,
            },
          },
          isActive: true,
          orderNo: 9999,
        })
      );

      // update local state so UI re-renders
      setCreatedIds((prev) => [...prev, id]);

      message.success("Buffer created");
    } catch (err) {
      console.error("Buffer error:", err);
      message.error("Error creating buffer");
    }
  }, [dispatch, hasSelection, distance, unit, selectedFeatures]);

  const clearAllBuffers = useCallback(() => {
    const ids = [...createdIdsRef.current];
    ids.forEach((id) => {
      dispatch(setGeoJsonLayer({ layerId: id, isActive: false }));
    });
    setCreatedIds([]);
    message.success("Cleared buffers");
  }, [dispatch]);

  const removeBuffer = useCallback(
    (id) => {
      if (!id) return;
      dispatch(setGeoJsonLayer({ layerId: id, isActive: false }));
      setCreatedIds((prev) => prev.filter((x) => x !== id));
      message.success("Buffer removed");
    },
    [dispatch]
  );

  return (
    <CustomDrawer
      title="Buffer Tool"
      placement="right"
      onClose={() => dispatch(toggleBuffer())}
      open={isOpen}
      width={360}
      mask={false}
      afterOpenChange={(open) => {
        if (!open) {
          // keep created buffers (user can clear), but no state reset required
        }
      }}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <div>
          <Text strong>Selected features:</Text>
          <div style={{ marginTop: 6 }}>
            <Text type="secondary">
              {selectedFeatures.length} feature(s) selected
            </Text>
          </div>
        </div>

        <div>
          <Text strong>Distance</Text>
          <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
            <InputNumber
              min={0}
              value={distance}
              onChange={(v) => setDistance(v)}
              style={{ width: 140 }}
            />
            <Select
              options={UNITS}
              value={unit}
              onChange={(v) => setUnit(v)}
              style={{ width: 160 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Button
            type="primary"
            onClick={createBuffer}
            disabled={!hasSelection}
          >
            Create Buffer
          </Button>
          <Button onClick={clearAllBuffers} danger>
            Clear All
          </Button>
        </div>

        <div>
          <Text strong>Created buffers</Text>
          <List
            size="small"
            bordered
            style={{ marginTop: 8, maxHeight: 240, overflow: "auto" }}
            dataSource={[...createdIds].reverse()}
            locale={{ emptyText: "No buffers created" }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button size="small" onClick={() => removeBuffer(item)}>
                    Remove
                  </Button>,
                ]}
              >
                <Text code>{item}</Text>
              </List.Item>
            )}
          />
        </div>
      </Space>
    </CustomDrawer>
  );
}

export default BufferTool;
