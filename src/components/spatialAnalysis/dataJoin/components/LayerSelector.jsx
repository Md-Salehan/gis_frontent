import React, { useMemo } from 'react';
import { Select, Space, Tag, Typography, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

function LayerSelector({
  value,
  onChange,
  layers = [],
  label = 'Layer',
  placeholder = 'Select layer',
  disabled = false,
  excludeLayer = null,
  showFeatureCount = true,
}) {
  const filteredLayers = useMemo(() => {
    if (!excludeLayer) return layers;
    return layers.filter((layer) => layer.value !== excludeLayer);
  }, [layers, excludeLayer]);

  const renderLayerOption = (layer) => ({
    label: (
      <Space size={4}>
        <Text>{layer.label}</Text>
        <Tag
          color={layer.type === 'main' ? 'blue' : 'orange'}
          style={{ fontSize: 10, margin: 0, padding: '0 4px' }}
        >
          {layer.type === 'main' ? 'Main' : 'Temp'}
        </Tag>
        {showFeatureCount && (
          <Tag
            color="green"
            style={{ fontSize: 10, margin: 0, padding: '0 4px' }}
          >
            {layer.featureCount || 0}
          </Tag>
        )}
      </Space>
    ),
    value: layer.value,
    disabled: layer.value === excludeLayer,
  });

  return (
    <div>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {label}
        {filteredLayers.length === 0 && (
          <Tooltip title="No layers available">
            <InfoCircleOutlined style={{ marginLeft: 4, color: '#faad14' }} />
          </Tooltip>
        )}
      </Text>
      <Select
        placeholder={placeholder}
        style={{ width: '100%' }}
        value={value}
        onChange={onChange}
        disabled={disabled || filteredLayers.length === 0}
        size="small"
        showSearch
        allowClear
        optionFilterProp="label"
        options={filteredLayers.map(renderLayerOption)}
      />
    </div>
  );
}

export default LayerSelector;