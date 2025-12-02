import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  InputNumber,
  Select,
  Space,
  message,
  Typography,
  List,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import * as turf from "@turf/turf";
import { setBufferLayer } from "../../store/slices/mapSlice";

const { Text } = Typography;
const UNITS = [
  { value: "meters", label: "Meters" },
  { value: "kilometers", label: "Kilometers" },
  { value: "miles", label: "Miles" },
  { value: "feet", label: "Feet" },
];

function BufferTool({ clearDataOnClose = true, open = false }) {
  const dispatch = useDispatch();

  const multiSelected = useSelector((s) => s.map.multiSelectedFeatures);
  const bufferOrder = useSelector((s) => s.map.bufferOrder || []);
  // Use bufferLayers if needed in future: const bufferLayers = useSelector((s) => s.map.bufferLayers);

  const [distance, setDistance] = useState(100); // default 100 meters
  const [unit, setUnit] = useState("meters");

  const selectedFeatures = useMemo(() => {
    const multi = Array.isArray(multiSelected) ? multiSelected : [];
    if (multi.length > 0) {
      return multi.map((m) => ({ ...m }));
    }
    return [];
  }, [multiSelected]);

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

      // Use bufferOrder length to create a readable layer name
      const layerLabel = `Buffer ${bufferOrder.length + 1}`;

      dispatch(
        setBufferLayer({
          layerId: id,
          geoJsonData: fc,
          metaData: {
            layer: { layer_nm: layerLabel },
            style: {
              geom_typ: "polygon",
              stroke_color: "#ff0000",
              fill_color: "#ff0000",
              fill_opacity: 0.25,
              stroke_width: 2,
            },
          },
          isActive: true,
        })
      );

      message.success("Buffer created");
    } catch (err) {
      console.error("Buffer error:", err);
      message.error("Error creating buffer");
    }
  }, [
    dispatch,
    hasSelection,
    distance,
    unit,
    selectedFeatures,
    bufferOrder.length,
  ]);

  const clearAllBuffers = useCallback(() => {
    const ids = Array.isArray(bufferOrder) ? [...bufferOrder] : [];
    ids.forEach((id) => {
      dispatch(setBufferLayer({ layerId: id, isActive: false }));
    });
    message.success("Cleared buffers");
  }, [dispatch, bufferOrder]);

  const removeBuffer = useCallback(
    (id) => {
      if (!id) return;
      dispatch(setBufferLayer({ layerId: id, isActive: false }));
      message.success("Buffer removed");
    },
    [dispatch]
  );

  // When drawer is closed and clearDataOnClose is true, clear buffers
  useEffect(() => {
    if (clearDataOnClose && !open) {
      clearAllBuffers();
    }
  }, [clearDataOnClose, open, clearAllBuffers]);

  return (
    <>
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
            dataSource={[...(bufferOrder || [])].reverse()}
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
    </>
  );
}

export default memo(BufferTool);
