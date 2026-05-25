// QueryBuilder.jsx
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

const { TextArea } = Input;
const {  Text } = Typography;

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

// Helper function to get distinct values from features
const getDistinctValues = (features, columnName) => {
  if (!features || !features.length) return [];

  const values = new Set();
  features.forEach((feature) => {
    const value = feature.properties?.[columnName];
    if (value !== undefined && value !== null && value !== "") {
      values.add(String(value));
    }
  });

  return Array.from(values).sort();
};

// Helper function to get column types and info from features
const getColumnInfo = (features) => {
  if (!features || !features.length) return [];

  const sampleFeature = features[0];
  const columns = Object.keys(sampleFeature.properties || {});

  return columns.map((col) => {
    let type = "string";
    let sampleValue = sampleFeature.properties[col];

    if (typeof sampleValue === "number") {
      type = "number";
    } else if (typeof sampleValue === "boolean") {
      type = "boolean";
    } else if (sampleValue instanceof Date) {
      type = "date";
    } else if (!isNaN(parseFloat(sampleValue)) && isFinite(sampleValue)) {
      type = "number";
    }

    return {
      name: col,
      type,
      distinctValues: getDistinctValues(features, col),
    };
  });
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

// ✅ NEW: Function to evaluate a single condition against a feature
const evaluateCondition = (field, operator, value, featureProperties) => {
  const fieldValue = featureProperties[field];

  // Handle NULL checks
  if (operator === "IS NULL") {
    return fieldValue === null || fieldValue === undefined;
  }
  if (operator === "IS NOT NULL") {
    return fieldValue !== null && fieldValue !== undefined;
  }

  // Handle IN operator
  if (operator === "IN") {
    if (!Array.isArray(value)) return false;
    return value.includes(fieldValue);
  }

  // Handle LIKE operator
  if (operator === "LIKE") {
    if (typeof fieldValue !== "string") return false;
    const pattern = value.replace(/%/g, ".*");
    const regex = new RegExp(`^${pattern}$`, "i");
    return regex.test(fieldValue);
  }

  // Handle comparison operators
  if (fieldValue === null || fieldValue === undefined) return false;

  switch (operator) {
    case "=":
      return fieldValue == value;
    case "!=":
      return fieldValue != value;
    case ">":
      return fieldValue > value;
    case "<":
      return fieldValue < value;
    case ">=":
      return fieldValue >= value;
    case "<=":
      return fieldValue <= value;
    default:
      return false;
  }
};

// ✅ NEW: Parse and evaluate a complete query expression
export const evaluateQuery = (expression, feature) => {
  if (!expression || expression.trim() === "") return true;

  // Tokenize the expression (simple parser for basic SQL-like syntax)
  // This handles: field = 'value', field > 100, field LIKE '%text%', etc.

  // Handle parentheses and AND/OR logic
  const tokens = [];
  let currentToken = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];

    if (!inQuotes && (char === "'" || char === '"')) {
      inQuotes = true;
      quoteChar = char;
      currentToken += char;
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false;
      currentToken += char;
    } else if (!inQuotes && (char === " " || char === "(" || char === ")")) {
      if (currentToken.trim()) {
        tokens.push(currentToken.trim());
      }
      if (char === "(" || char === ")") {
        tokens.push(char);
      }
      currentToken = "";
    } else {
      currentToken += char;
    }
  }

  if (currentToken.trim()) {
    tokens.push(currentToken.trim());
  }

  // Parse conditions (simplified: looks for patterns like "field operator value")
  const parseCondition = (tokenStr) => {
    // Pattern: field operator value
    const patterns = [
      { regex: /^"([^"]+)"\s*(!=|>=|<=|=|>|<)\s*'([^']+)'$/, operator: "$2" },
      { regex: /^"([^"]+)"\s*(!=|>=|<=|=|>|<)\s*"([^"]+)"$/, operator: "$2" },
      { regex: /^"([^"]+)"\s*(!=|>=|<=|=|>|<)\s*(\d+\.?\d*)$/, operator: "$2" },
      { regex: /^"([^"]+)"\s*(LIKE)\s*'([^']+)'$/i, operator: "$2" },
      { regex: /^"([^"]+)"\s*(IS NULL)$/i, operator: "$2" },
      { regex: /^"([^"]+)"\s*(IS NOT NULL)$/i, operator: "$2" },
      { regex: /^"([^"]+)"\s*(IN)\s*\(([^)]+)\)$/i, operator: "$2" },
    ];

    for (const pattern of patterns) {
      const match = tokenStr.match(pattern.regex);
      if (match) {
        const field = match[1];
        const operator = match[2].toUpperCase();
        let value = match[3];

        // Parse value based on type
        if (operator === "IN") {
          value = value.split(",").map((v) => v.trim().replace(/['"]/g, ""));
        } else if (operator !== "IS NULL" && operator !== "IS NOT NULL") {
          // Remove quotes if present
          value = value.replace(/^['"]|['"]$/g, "");
          // Try to convert to number if it looks like a number
          if (!isNaN(value) && value !== "") {
            value = parseFloat(value);
          }
        }

        return { field, operator, value };
      }
    }
    return null;
  };

  // Build the condition string by joining tokens
  const conditionStr = tokens.join(" ");

  // For complex expressions with AND/OR, we need to evaluate step by step
  // Split by AND/OR while respecting parentheses
  const evaluateComplexExpression = (expr) => {
    // Remove outer parentheses if present
    expr = expr.trim();
    if (expr.startsWith("(") && expr.endsWith(")")) {
      expr = expr.slice(1, -1).trim();
    }

    // Check for OR first (lower precedence)
    let orIndex = -1;
    let parenCount = 0;
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === "(") parenCount++;
      if (expr[i] === ")") parenCount--;
      if (
        parenCount === 0 &&
        i > 0 &&
        expr.substring(i).toUpperCase().startsWith("OR")
      ) {
        orIndex = i;
        break;
      }
    }

    if (orIndex !== -1) {
      const left = expr.substring(0, orIndex);
      const right = expr.substring(orIndex + 2);
      return (
        evaluateComplexExpression(left) || evaluateComplexExpression(right)
      );
    }

    // Check for AND (higher precedence)
    let andIndex = -1;
    parenCount = 0;
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === "(") parenCount++;
      if (expr[i] === ")") parenCount--;
      if (
        parenCount === 0 &&
        i > 0 &&
        expr.substring(i).toUpperCase().startsWith("AND")
      ) {
        andIndex = i;
        break;
      }
    }

    if (andIndex !== -1) {
      const left = expr.substring(0, andIndex);
      const right = expr.substring(andIndex + 3);
      return (
        evaluateComplexExpression(left) && evaluateComplexExpression(right)
      );
    }

    // Handle NOT
    if (expr.trim().toUpperCase().startsWith("NOT")) {
      const inner = expr.substring(3).trim();
      return !evaluateComplexExpression(inner);
    }

    // Base case: single condition
    const condition = parseCondition(expr);
    if (condition) {
      return evaluateCondition(
        condition.field,
        condition.operator,
        condition.value,
        feature.properties,
      );
    }

    return false;
  };

  try {
    return evaluateComplexExpression(expression);
  } catch (error) {
    console.error("Error evaluating query:", error);
    return false;
  }
};

const QueryBuilder = ({ activeTab, layerData, onApplyFilters }) => {
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
  const handleClear = useCallback(() => {
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
    <div
      className="query-builder"
      style={{
        width: "25%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f5f5f5",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <Card
        title={
          <Space>
            <DatabaseOutlined />
            <span>Query Builder</span>
            {activeTab && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {layerData?.metaData?.layer?.layer_nm || activeTab}
              </Tag>
            )}
          </Space>
        }
        size="small"
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
        bodyStyle={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
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
                  dropdownRender={(menu) => (
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
                        <div
                          style={{ padding: "8px 12px", textAlign: "center" }}
                        >
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

        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button onClick={handleClear} icon={<DeleteOutlined />}>
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
      </Card>
    </div>
  );
};

export default QueryBuilder;
