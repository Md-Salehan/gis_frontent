import React, { useState } from "react";
import { Checkbox, Space, Tag, Input, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Text } = Typography;

function FieldSelector({ fields, selectedFields, onChange, disabled }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredFields = fields.filter((field) =>
    field.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = (checked) => {
    if (checked) {
      onChange([...fields]);
    } else {
      onChange([]);
    }
  };

  const isAllSelected = selectedFields.length === fields.length && fields.length > 0;

  return (
    <div style={{ width: "100%" }}>
      <Input
        prefix={<SearchOutlined />}
        placeholder="Search fields..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        size="small"
        style={{ marginBottom: 4 }}
        disabled={disabled}
      />

      <div
        style={{
          maxHeight: 100,
          overflowY: "auto",
          border: "1px solid #d9d9d9",
          borderRadius: 4,
          padding: "4px 8px",
        }}
      >
        <Checkbox
          checked={isAllSelected}
          indeterminate={selectedFields.length > 0 && !isAllSelected}
          onChange={(e) => handleSelectAll(e.target.checked)}
          disabled={disabled}
          style={{ width: "100%", padding: "2px 0" }}
        >
          <Text type="secondary" style={{ fontSize: 11 }}>
            Select All ({fields.length})
          </Text>
        </Checkbox>

        <Checkbox.Group
          value={selectedFields}
          onChange={onChange}
          style={{ width: "100%" }}
          disabled={disabled}
        >
          <Space direction="vertical" size={0} style={{ width: "100%" }}>
            {filteredFields.map((field) => (
              <Checkbox
                key={field}
                value={field}
                style={{ width: "100%", padding: "2px 0" }}
              >
                <Text style={{ fontSize: 12 }}>{field}</Text>
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>

        {filteredFields.length === 0 && (
          <Text type="secondary" style={{ fontSize: 11 }}>
            No matching fields
          </Text>
        )}
      </div>

      {selectedFields.length > 0 && (
        <div style={{ marginTop: 2 }}>
          <Text type="secondary" style={{ fontSize: 10 }}>
            {selectedFields.length} field{selectedFields.length > 1 ? "s" : ""} selected
          </Text>
        </div>
      )}
    </div>
  );
}

export default FieldSelector;