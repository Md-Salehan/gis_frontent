// QueryBuilderAdvance.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  Select,
  Space,
  Button,
  Input,
  Alert,
  Tag,
  Tooltip,
  Divider,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  CheckOutlined,
  ClearOutlined,
  PlusOutlined,
  CodeOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { message } from "antd";
import {
  evaluateCondition,
  getColumnInfo,
  getDistinctValues,
} from "../../../utils";

const { TextArea } = Input;
const { Text } = Typography;

// Operator definitions matching QGIS style
const OPERATORS = {
  comparison: [
    { label: "=", value: "=", type: "comparison", description: "Equal to" },
    {
      label: "≠",
      value: "!=",
      type: "comparison",
      description: "Not equal to",
    },
    { label: ">", value: ">", type: "comparison", description: "Greater than" },
    { label: "<", value: "<", type: "comparison", description: "Less than" },
    {
      label: "≥",
      value: ">=",
      type: "comparison",
      description: "Greater than or equal",
    },
    {
      label: "≤",
      value: "<=",
      type: "comparison",
      description: "Less than or equal",
    },
  ],
  logical: [
    {
      label: "AND",
      value: " AND ",
      type: "logical",
      description: "Logical AND",
    },
    { label: "OR", value: " OR ", type: "logical", description: "Logical OR" },
    {
      label: "NOT",
      value: " NOT ",
      type: "logical",
      description: "Logical NOT",
    },
  ],
  other: [
    {
      label: "LIKE",
      value: " LIKE ",
      type: "other",
      description: "Pattern matching",
    },
    { label: "IN", value: " IN ", type: "other", description: "Value in set" },
    {
      label: "IS NULL",
      value: " IS NULL",
      type: "other",
      description: "Check for null",
    },
    {
      label: "IS NOT NULL",
      value: " IS NOT NULL",
      type: "other",
      description: "Check for not null",
    },
  ],
  parentheses: [
    {
      label: "(",
      value: "( ",
      type: "parentheses",
      description: "Open parenthesis",
    },
    {
      label: ")",
      value: " )",
      type: "parentheses",
      description: "Close parenthesis",
    },
  ],
};

// Expression validator
const validateExpression = (expression) => {
  const errors = [];

  if (!expression || expression.trim() === "") {
    errors.push("Expression cannot be empty");
    return { isValid: false, errors };
  }

  // Check for unbalanced parentheses
  let parenthesesCount = 0;
  for (let char of expression) {
    if (char === "(") parenthesesCount++;
    else if (char === ")") parenthesesCount--;
    if (parenthesesCount < 0) {
      errors.push(
        "Unbalanced parentheses: closing parenthesis without opening",
      );
      break;
    }
  }
  if (parenthesesCount !== 0) {
    errors.push(
      `Unbalanced parentheses: ${parenthesesCount} unmatched opening parentheses`,
    );
  }

  // Check for missing quotes around string values (basic check)
  const stringPattern = /=\s*([^'"\s][^\s)]+)/gi;
  let match;
  while ((match = stringPattern.exec(expression)) !== null) {
    const value = match[1];
    if (
      !value.match(/^['"].*['"]$/) &&
      !value.match(/^\d+$/) &&
      value !== "NULL" &&
      value !== "null"
    ) {
      errors.push(
        `Value "${value}" might need quotes. Use '${value}' or "${value}"`,
      );
    }
  }

  // Check for LIKE operator syntax
  if (expression.includes("LIKE") && !expression.match(/LIKE\s+['"].+['"]/i)) {
    errors.push(
      "LIKE operator requires a quoted pattern (e.g., LIKE '%value%')",
    );
  }

  return { isValid: errors.length === 0, errors };
};

const QueryBuilderAdvance = ({ activeTab, layerData, onApplyFilters }) => {
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [selectedValue, setSelectedValue] = useState(null);
  const [expression, setExpression] = useState("");
  const [validation, setValidation] = useState({ isValid: true, errors: [] });
  const [searchValue, setSearchValue] = useState("");

  // Extract features and column info
  const features = useMemo(() => {
    return layerData?.geoJsonData?.features || [];
  }, [layerData]);

  const columns = useMemo(() => {
    return getColumnInfo(features);
  }, [features]);

  // Current column details
  const currentColumn = useMemo(() => {
    if (!selectedColumn) return null;
    return columns.find((col) => col.name === selectedColumn);
  }, [columns, selectedColumn]);

  // Get column type for proper formatting
  const getColumnType = useCallback(
    (columnName) => {
      const col = columns.find((c) => c.name === columnName);
      return col?.type || "string";
    },
    [columns],
  );

  // Insert text at cursor position
  const insertAtCursor = useCallback(
    (text) => {
      const textarea = document.querySelector(".expression-textarea");

      if (!textarea) {
        setExpression((prev) => prev + text);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue =
        expression.substring(0, start) + text + expression.substring(end);
      setExpression(newValue);

      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + text.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 10);
    },
    [expression],
  );

  // Insert quoted field name
  const insertField = useCallback(() => {
    if (!selectedColumn) {
      message.warning("Please select a column first");
      return;
    }
    insertAtCursor(`"${selectedColumn}"`);
  }, [selectedColumn, insertAtCursor]);

  const insertFieldValue = useCallback(() => {
    if (!selectedColumn) {
      message.warning("Please select a column first");
      return;
    }
    if (!selectedValue) {
      message.warning("Please select a value first");
      return;
    }

    const columnType = getColumnType(selectedColumn);
    let formattedValue = selectedValue;

    if (columnType === "string") {
      formattedValue = `'${selectedValue.replace(/'/g, "\\'")}'`;
    } else if (columnType === "date") {
      formattedValue = `'${selectedValue}'`;
    }

    insertAtCursor(formattedValue);
  }, [selectedColumn, selectedValue, insertAtCursor, getColumnType]);

  // Insert operator
  const insertOperator = useCallback(
    (operator) => {
      insertAtCursor(operator);
    },
    [insertAtCursor],
  );

  // Handle column change
  const handleColumnChange = useCallback((value) => {
    setSelectedColumn(value);
    setSelectedValue(null);
  }, []);

  // Handle value selection
  const handleValueChange = useCallback((value) => {
    setSelectedValue(value);
  }, []);

  // Clear all
  const handleClearAll = useCallback(() => {
    setExpression("");
    setSelectedColumn(null);
    setSelectedValue(null);
    setValidation({ isValid: true, errors: [] });
    setSearchValue("");
    message.info("Query builder cleared");
  }, []);

  // Apply filter
  const handleApply = useCallback(() => {
    const validationResult = validateExpression(expression);
    setValidation(validationResult);

    if (!validationResult.isValid) {
      message.error("Invalid expression. Please fix errors before applying.");
      return;
    }

    if (onApplyFilters) {
      onApplyFilters(expression, activeTab);
      message.success("Filter applied successfully");
    }
  }, [expression, onApplyFilters, activeTab]);

  const loadExample = useCallback((exampleValue) => {
    setExpression(exampleValue);
    setValidation({ isValid: true, errors: [] });
  }, []);

  // Auto-validate on expression change
  useEffect(() => {
    if (expression) {
      const validationResult = validateExpression(expression);
      setValidation(validationResult);
    } else {
      setValidation({ isValid: true, errors: [] });
    }
  }, [expression]);

  // Load distinct values for current column
  const distinctValues = useMemo(() => {
    if (!currentColumn) return [];
    return currentColumn.distinctValues || [];
  }, [currentColumn]);

  // Filtered distinct values based on search
  const filteredDistinctValues = useMemo(() => {
    if (!searchValue) return distinctValues.slice(0, 100); // Limit to first 100 for performance
    return distinctValues
      .filter((v) => v.toLowerCase().includes(searchValue.toLowerCase()))
      .slice(0, 100);
  }, [distinctValues, searchValue]);

  return (
    <div className="query-builder">
      {/* Column and Value Selection */}
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ display: "block", marginBottom: 8 }}>
          Fields & Values
        </Text>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Select
              placeholder="Select column"
              style={{ width: "70%" }}
              value={selectedColumn}
              onChange={handleColumnChange}
              showSearch
              optionFilterProp="children"
              allowClear
              options={columns.map((col) => ({
                label: (
                  <Space>
                    <span>{col.name}</span>
                    <Tag
                      color={col.type === "number" ? "green" : "blue"}
                      style={{ fontSize: 10 }}
                    >
                      {col.type}
                    </Tag>
                  </Space>
                ),
                value: col.name,
              }))}
            />
            <Button
              size="medium"
              onClick={insertField}
              disabled={!selectedColumn}
              icon={<CodeOutlined />}
            >
              Insert
            </Button>
          </div>

          {currentColumn && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Select
                placeholder="Select or search value"
                style={{ width: "70%" }}
                value={selectedValue}
                onChange={handleValueChange}
                onSearch={setSearchValue}
                showSearch
                filterOption={false}
                allowClear
                popupRender={(menu) => (
                  <>
                    {searchValue && (
                      <div style={{ padding: "8px 12px" }}>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => handleValueChange(searchValue)}
                          icon={<PlusOutlined />}
                        >
                          Use "{searchValue}"
                        </Button>
                        <Divider style={{ margin: "8px 0" }} />
                      </div>
                    )}
                    {menu}
                    {distinctValues.length > 100 && (
                      <div style={{ padding: "8px 12px", textAlign: "center" }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Showing first 100 of {distinctValues.length} values
                        </Text>
                      </div>
                    )}
                  </>
                )}
                options={filteredDistinctValues.map((v) => ({
                  label: v.length > 50 ? `${v.substring(0, 47)}...` : v,
                  value: v,
                }))}
              />

              <Button
                size="medium"
                onClick={insertFieldValue}
                disabled={!selectedColumn || !selectedValue}
                icon={<CodeOutlined />}
              >
                Insert
              </Button>
            </div>
          )}
        </Space>
      </div>

      {/* Operator Buttons */}
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ display: "block", marginBottom: 8 }}>
          Operators
        </Text>

        {/* Comparison Operators */}
        <div style={{ marginBottom: 12 }}>
          <Text
            type="secondary"
            style={{ fontSize: 12, display: "block", marginBottom: 4 }}
          >
            Comparison
          </Text>
          <Space wrap size="small">
            {OPERATORS.comparison.map((op) => (
              <Tooltip key={op.value} title={op.description}>
                <Button
                  size="small"
                  onClick={() => insertOperator(op.value)}
                  style={{ fontFamily: "monospace", minWidth: 50 }}
                >
                  {op.label}
                </Button>
              </Tooltip>
            ))}
          </Space>
        </div>

        {/* Logical Operators */}
        <div style={{ marginBottom: 12 }}>
          <Text
            type="secondary"
            style={{ fontSize: 12, display: "block", marginBottom: 4 }}
          >
            Logical
          </Text>
          <Space wrap size="small">
            {OPERATORS.logical.map((op) => (
              <Tooltip key={op.value} title={op.description}>
                <Button
                  size="small"
                  onClick={() => insertOperator(op.value)}
                  style={{
                    fontFamily: "monospace",
                    backgroundColor: "#e6f7ff",
                  }}
                >
                  {op.label}
                </Button>
              </Tooltip>
            ))}
          </Space>
        </div>

        {/* Other Operators */}
        <div style={{ marginBottom: 12 }}>
          <Text
            type="secondary"
            style={{ fontSize: 12, display: "block", marginBottom: 4 }}
          >
            Other
          </Text>
          <Space wrap size="small">
            {OPERATORS.other.map((op) => (
              <Tooltip key={op.value} title={op.description}>
                <Button
                  size="small"
                  onClick={() => insertOperator(op.value)}
                  style={{ fontFamily: "monospace" }}
                >
                  {op.label}
                </Button>
              </Tooltip>
            ))}
          </Space>
        </div>

        {/* Parentheses */}
        <div>
          <Text
            type="secondary"
            style={{ fontSize: 12, display: "block", marginBottom: 4 }}
          >
            Grouping
          </Text>
          <Space wrap size="small">
            {OPERATORS.parentheses.map((op) => (
              <Tooltip key={op.value} title={op.description}>
                <Button
                  size="small"
                  onClick={() => insertOperator(op.value)}
                  style={{ fontFamily: "monospace", fontWeight: "bold" }}
                >
                  {op.label}
                </Button>
              </Tooltip>
            ))}
          </Space>
        </div>
      </div>

      {/* Expression Editor */}
      <div style={{ marginBottom: 16, flex: 1 }}>
        <Space
          style={{
            justifyContent: "space-between",
            width: "100%",
            marginBottom: 8,
          }}
        >
          <Text strong>Expression Editor</Text>
          <Tooltip title="Clear expression">
            <Button
              type="text"
              size="small"
              icon={<ClearOutlined />}
              onClick={() => setExpression("")}
              danger
            />
          </Tooltip>
        </Space>

        <TextArea
          className="expression-textarea"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder='Build your query expression here...&#10;&#10;Example:&#10;"district" = &#39;Patna&#39; AND "population" > 5000'
          rows={6}
          style={{
            fontFamily: "monospace",
            fontSize: "13px",
            backgroundColor: "#1e1e1e",
            color: "#d4d4d4",
            resize: "vertical",
          }}
        />

        {/* Validation Errors */}
        {!validation.isValid && validation.errors.length > 0 && (
          <Alert
            message="Validation Errors"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validation.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
            style={{ marginTop: 12 }}
            size="small"
          />
        )}

        {expression && validation.isValid && (
          <Alert
            message="Expression is valid"
            type="success"
            showIcon
            style={{ marginTop: 12 }}
            size="small"
          />
        )}
      </div>

      {/* Action Buttons */}
      <Divider style={{ margin: "12px 0" }} />

      <Space
        style={{ width: "100%", justifyContent: "flex-end", paddingBottom: 8 }}
      >
        <Button onClick={handleClearAll} icon={<DeleteOutlined />}>
          Clear
        </Button>
        <Button
          type="primary"
          onClick={handleApply}
          icon={<CheckOutlined />}
          disabled={!expression.trim()}
        >
          Apply Filter
        </Button>
      </Space>
    </div>
  );
};

export default QueryBuilderAdvance;
