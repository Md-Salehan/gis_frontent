import React, { useState, useMemo } from 'react';
import { Checkbox, Space, Input, Typography, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Text } = Typography;

function FieldSelector({
  fields = [],
  selectedFields = [],
  onChange,
  disabled = false,
  label = 'Fields',
  showSamples = false,
  fieldSamples = {},
  maxHeight = 120,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFields = useMemo(() => {
    if (!searchTerm) return fields;
    return fields.filter((field) =>
      field.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [fields, searchTerm]);

  const handleSelectAll = (checked) => {
    if (checked) {
      onChange([...fields]);
    } else {
      onChange([]);
    }
  };

  const isAllSelected = selectedFields.length === fields.length && fields.length > 0;

  const renderFieldItem = (field) => {
    const isSelected = selectedFields.includes(field);
    const sample = fieldSamples[field];

    return (
      <div
        key={field}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '2px 4px',
          borderBottom: '1px solid #f0f0f0',
          width: '100%',
        }}
      >
        <Checkbox
          value={field}
          checked={isSelected}
          style={{ flex: 1 }}
          disabled={disabled}
        >
          <Text style={{ fontSize: 12 }}>{field}</Text>
        </Checkbox>
        {showSamples && sample && sample.length > 0 && (
          <Tag size="small" style={{ fontSize: 10, marginLeft: 4 }}>
            {sample.slice(0, 2).map(String).join(', ')}
            {sample.length > 2 && '...'}
          </Tag>
        )}
      </div>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <Input
        prefix={<SearchOutlined />}
        placeholder={`Search ${label.toLowerCase()}...`}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        size="small"
        style={{ marginBottom: 4 }}
        disabled={disabled}
      />

      <div
        style={{
          maxHeight,
          overflowY: 'auto',
          border: '1px solid #d9d9d9',
          borderRadius: 4,
          padding: '2px 4px',
        }}
      >
        {fields.length > 0 && (
          <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 2 }}>
            <Checkbox
              checked={isAllSelected}
              indeterminate={selectedFields.length > 0 && !isAllSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              disabled={disabled}
              style={{ width: '100%' }}
            >
              <Text type="secondary" style={{ fontSize: 11 }}>
                Select All ({fields.length})
              </Text>
            </Checkbox>
          </div>
        )}

        <Checkbox.Group
          value={selectedFields}
          onChange={onChange}
          style={{ width: '100%' }}
          disabled={disabled}
        >
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            {filteredFields.map(renderFieldItem)}
          </Space>
        </Checkbox.Group>

        {filteredFields.length === 0 && (
          <Text type="secondary" style={{ fontSize: 11, padding: '4px 0', display: 'block' }}>
            No matching {label.toLowerCase()}
          </Text>
        )}
      </div>

      {selectedFields.length > 0 && (
        <div style={{ marginTop: 2 }}>
          <Text type="secondary" style={{ fontSize: 10 }}>
            {selectedFields.length} field{selectedFields.length > 1 ? 's' : ''} selected
          </Text>
        </div>
      )}
    </div>
  );
}

export default FieldSelector;