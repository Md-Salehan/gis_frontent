// spatialQuery/components/SourceSelector.jsx
import React from "react";
import { Space, Radio, Typography } from "antd";
import LayerSelect from "./LayerSelect";
import FeaturePicker from "./FeaturePicker";

const { Text } = Typography;

export default function SourceSelector({
  layers,
  layerId,
  mode, // "layer" | "features"
  onLayerChange,
  onModeChange,
  features,
  selectedIndices,
  onSelectedIndicesChange,
  disabled,
}) {
  return (
    <Space direction="vertical" size={6} style={{ width: "100%" }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        Source ( layer / features )
      </Text>

      <Radio.Group
        size="small"
        value={mode}
        onChange={(e) => onModeChange(e.target.value)}
        disabled={disabled}
      >
        <Radio.Button value="layer">Whole Layer</Radio.Button>
        <Radio.Button value="features">Selected Features</Radio.Button>
      </Radio.Group>

      <LayerSelect
        value={layerId}
        onChange={onLayerChange}
        layers={layers}
        disabled={disabled}
        placeholder="Select source layer"
      />

      {mode === "features" && layerId && (
        <div style={{ width: "20vw", scrollbarWidth: "none" }}>
          <FeaturePicker
            features={features}
            selectedIndices={selectedIndices}
            onChangeSelectedIndices={onSelectedIndicesChange}
            disabled={disabled}
          />
        </div>
      )}
    </Space>
  );
}
