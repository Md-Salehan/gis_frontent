// QueryBuilderAdvance.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  Select,
  Button,
  Input,
  Alert,
  Tag,
  Tooltip,
  Divider,
  Typography,
  Space,
  InputNumber,
  message,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  CopyOutlined,
  CheckOutlined,
  ClearOutlined,
} from "@ant-design/icons";

const { Text, Paragraph } = Typography;
const { Option } = Select;

// Operator definitions by column type
const OPERATORS_BY_TYPE = {
  string: [
    { label: "=", value: "=", sql: "=" },
    { label: "≠", value: "!=", sql: "!=" },
    { label: "LIKE", value: "LIKE", sql: "LIKE" },
    { label: "contains", value: "contains", sql: "LIKE", isPattern: true },
    {
      label: "starts with",
      value: "starts_with",
      sql: "LIKE",
      isPattern: true,
    },
    { label: "ends with", value: "ends_with", sql: "LIKE", isPattern: true },
  ],
  number: [
    { label: "=", value: "=", sql: "=" },
    { label: "≠", value: "!=", sql: "!=" },
    { label: ">", value: ">", sql: ">" },
    { label: "<", value: "<", sql: "<" },
    { label: "≥", value: ">=", sql: ">=" },
    { label: "≤", value: "<=", sql: "<=" },
  ],
  boolean: [
    { label: "=", value: "=", sql: "=" },
    { label: "≠", value: "!=", sql: "!=" },
  ],
};

// Helper to get column info from features
const getColumnInfo = (features) => {
  if (!features || !features.length) return [];

  const sampleFeature = features[0];
  const columns = Object.keys(sampleFeature.properties || {});

  return columns.map((col) => {
    let type = "string";
    const sampleValue = sampleFeature.properties[col];

    if (typeof sampleValue === "number") {
      type = "number";
    } else if (typeof sampleValue === "boolean") {
      type = "boolean";
    } else if (sampleValue !== null && sampleValue !== undefined) {
      // Try to detect numbers stored as strings
      const num = parseFloat(sampleValue);
      if (!isNaN(num) && isFinite(num) && String(sampleValue).trim() !== "") {
        type = "number";
      }
    }

    // Get distinct values (limit for performance)
    const distinctValues = new Set();
    features.forEach((feature) => {
      const value = feature.properties?.[col];
      if (value !== undefined && value !== null && value !== "") {
        let val = value;
        if (type === "number") {
          val = parseFloat(value);
          if (!isNaN(val)) distinctValues.add(val);
        } else {
          distinctValues.add(String(val));
        }
      }
    });

    return {
      name: col,
      type,
      distinctValues: Array.from(distinctValues).slice(0, 500), // Limit to 500 for performance
    };
  });
};

// Generate SQL-like expression from conditions
const generateExpression = (conditions, matchType) => {
  if (!conditions.length) return "";

  const validConditions = conditions.filter(
    (c) => c.column && c.operator && c.value !== undefined && c.value !== "",
  );

  if (!validConditions.length) return "";

  const expressions = validConditions.map((condition) => {
    const { column, operator, value, columnType } = condition;
    const quotedColumn = `"${column}"`;
    const opDef = OPERATORS_BY_TYPE[columnType]?.find(
      (op) => op.value === operator,
    );

    if (!opDef) return "";

    let formattedValue = value;

    if (columnType === "string") {
      if (operator === "LIKE") {
        formattedValue = `'%${value}%'`;
      } else if (operator === "starts_with") {
        formattedValue = `'${value}%'`;
      } else if (operator === "ends_with") {
        formattedValue = `'%${value}'`;
      } else if (operator === "contains") {
        formattedValue = `'%${value}%'`;
      } else {
        formattedValue = `'${String(value).replace(/'/g, "''")}'`;
      }
    } else if (columnType === "number") {
      formattedValue = value;
    } else {
      formattedValue = `'${String(value)}'`;
    }

    let sqlOp = opDef.sql;
    if (
      operator === "contains" ||
      operator === "starts_with" ||
      operator === "ends_with"
    ) {
      sqlOp = "LIKE";
    }

    return `${quotedColumn} ${sqlOp} ${formattedValue}`;
  });

  const joinOperator = matchType === "any" ? " OR " : " AND ";
  return expressions.filter(Boolean).join(joinOperator);
};

// Condition Row Component
const ConditionRow = ({
  condition,
  index,
  columns,
  onUpdate,
  onRemove,
  onAdd,
  isLast,
}) => {
  const currentColumn = columns.find((c) => c.name === condition.column);
  const operators = currentColumn
    ? OPERATORS_BY_TYPE[currentColumn.type] || OPERATORS_BY_TYPE.string
    : OPERATORS_BY_TYPE.string;
  const distinctValues = currentColumn?.distinctValues || [];

  const handleColumnChange = (value) => {
    const newColumn = columns.find((c) => c.name === value);
    onUpdate(index, {
      column: value,
      columnType: newColumn?.type || "string",
      operator: OPERATORS_BY_TYPE[newColumn?.type || "string"][0]?.value || "=",
      value: "",
    });
  };

  const handleOperatorChange = (value) => {
    onUpdate(index, { operator: value });
  };

  const handleValueChange = (value) => {
    onUpdate(index, { value });
  };

  const isValid =
    condition.column &&
    condition.operator &&
    condition.value !== undefined &&
    condition.value !== "";

  // Determine if value input should be number type
  const isNumberType = currentColumn?.type === "number";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "8px",
        padding: "4px 0",
      }}
    >
      <Select
        placeholder="Column"
        value={condition.column || undefined}
        onChange={handleColumnChange}
        style={{ width: "30%", minWidth: "120px" }}
        showSearch
        optionFilterProp="children"
        size="small"
      >
        {columns.map((col) => (
          <Option key={col.name} value={col.name}>
            {col.name}
          </Option>
        ))}
      </Select>

      <Select
        placeholder="Operator"
        value={condition.operator || undefined}
        onChange={handleOperatorChange}
        style={{ width: "25%", minWidth: "100px" }}
        size="small"
        disabled={!condition.column}
      >
        {operators.map((op) => (
          <Option key={op.value} value={op.value}>
            {op.label}
          </Option>
        ))}
      </Select>

      {isNumberType ? (
        <InputNumber
          placeholder="Value"
          value={condition.value}
          onChange={handleValueChange}
          style={{ width: "30%" }}
          size="small"
          disabled={!condition.operator}
        />
      ) : (
        <Select
          placeholder="Value"
          value={condition.value || undefined}
          onChange={handleValueChange}
          style={{ width: "30%" }}
          showSearch
          allowClear
          mode={condition.operator === "IN" ? "multiple" : undefined}
          size="small"
          disabled={!condition.operator}
          dropdownRender={(menu) => (
            <>
              {menu}
              <Divider style={{ margin: "8px 0" }} />
              <div style={{ padding: "0 8px 8px" }}>
                <Input
                  placeholder="Type custom value..."
                  onPressEnter={(e) => {
                    if (e.target.value) {
                      handleValueChange(e.target.value);
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value && !condition.value) {
                      handleValueChange(e.target.value);
                    }
                  }}
                  size="small"
                />
              </div>
            </>
          )}
        >
          {distinctValues.map((val) => (
            <Option key={String(val)} value={val}>
              {String(val)}
            </Option>
          ))}
        </Select>
      )}

      <Tooltip title="Remove condition">
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onRemove(index)}
          size="small"
        />
      </Tooltip>

      {isLast && (
        <Tooltip title="Add condition">
          <Button
            type="text"
            style={{ color: "#52c41a" }}
            icon={<PlusOutlined />}
            onClick={onAdd}
            size="small"
          />
        </Tooltip>
      )}
    </div>
  );
};

// Main QueryBuilderAdvance Component
const QueryBuilderAdvance = ({
  activeTab,
  layerData,
  onApplyFilters,
  initialMatchType = "any",
}) => {
  const [matchType, setMatchType] = useState(initialMatchType);
  const [conditions, setConditions] = useState([
    { column: null, operator: null, value: "", columnType: "string" },
  ]);
  const [expression, setExpression] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [appliedExpression, setAppliedExpression] = useState("");

  // Extract features and column info
  const features = useMemo(() => {
    return layerData?.geoJsonData?.features || [];
  }, [layerData]);

  const columns = useMemo(() => {
    return getColumnInfo(features);
  }, [features]);

  // Validate conditions
  const validateConditions = useCallback((conds, expr) => {
    const errors = [];

    const validConditions = conds.filter(
      (c) => c.column && c.operator && c.value !== undefined && c.value !== "",
    );

    if (validConditions.length === 0) {
      errors.push("At least one complete condition is required");
    }

    validConditions.forEach((condition, idx) => {
      if (condition.columnType === "number") {
        const numValue = parseFloat(condition.value);
        if (isNaN(numValue)) {
          errors.push(
            `Condition ${idx + 1}: Value must be a number for column "${condition.column}"`,
          );
        }
      }

      if (condition.columnType === "string" && condition.value) {
        if (condition.operator === "LIKE" && condition.value.length < 2) {
          errors.push(
            `Condition ${idx + 1}: LIKE pattern should have at least 2 characters`,
          );
        }
      }
    });

    if (expr && !expr.trim()) {
      errors.push("Generated expression is empty");
    }

    return errors;
  }, []);

  // Generate expression when conditions change
  useEffect(() => {
    const newExpression = generateExpression(conditions, matchType);
    setExpression(newExpression);

    const errors = validateConditions(conditions, newExpression);
    setValidationErrors(errors);
  }, [conditions, matchType, validateConditions]);

  // Condition handlers
  const handleAddCondition = useCallback(() => {
    setConditions((prev) => [
      ...prev,
      { column: null, operator: null, value: "", columnType: "string" },
    ]);
  }, []);

  const handleRemoveCondition = useCallback((index) => {
    setConditions((prev) => {
      if (prev.length === 1) {
        return [
          { column: null, operator: null, value: "", columnType: "string" },
        ];
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleUpdateCondition = useCallback((index, updates) => {
    setConditions((prev) =>
      prev.map((cond, i) => (i === index ? { ...cond, ...updates } : cond)),
    );
  }, []);

  const handleClearAll = useCallback(() => {
    setConditions([
      { column: null, operator: null, value: "", columnType: "string" },
    ]);
    setMatchType("any");
    setAppliedExpression("");
    setValidationErrors([]);
  }, []);

  const handleApply = useCallback(() => {
    if (validationErrors.length > 0) {
      message.error(validationErrors[0]);
      return;
    }

    const validConditions = conditions.filter(
      (c) => c.column && c.operator && c.value !== undefined && c.value !== "",
    );

    if (validConditions.length === 0) {
      message.error("Please add at least one complete condition");
      return;
    }

    setAppliedExpression(expression);
    if (onApplyFilters) {
      onApplyFilters(expression, activeTab);
      message.success("Filter applied successfully");
    }
  }, [conditions, expression, validationErrors, onApplyFilters, activeTab]);

  const handleCopyExpression = useCallback(() => {
    if (expression) {
      navigator.clipboard.writeText(expression);
      message.success("Expression copied to clipboard");
    }
  }, [expression]);

  // Check if expression is valid to apply
  const isApplyDisabled = useMemo(() => {
    return validationErrors.length > 0 || !expression.trim();
  }, [validationErrors, expression]);

  return (
    <div
      className="query-builder"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fafafa",
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid #f0f0f0",
      }}
    >
      <Card
        title={
          <Space>
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
        {/* Match Type Selector */}
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Text strong style={{ fontSize: "12px" }}>
            Match
          </Text>
          <Select
            value={matchType}
            onChange={setMatchType}
            style={{ width: "80px" }}
            size="small"
          >
            <Option value="any">any</Option>
            <Option value="all">all</Option>
          </Select>
          <Text style={{ fontSize: "12px" }}>of the following:</Text>
        </div>

        {/* Condition Rows */}
        <div style={{ flex: 1, marginBottom: 16 }}>
          {conditions.map((condition, index) => (
            <ConditionRow
              key={index}
              condition={condition}
              index={index}
              columns={columns}
              onUpdate={handleUpdateCondition}
              onRemove={handleRemoveCondition}
              onAdd={handleAddCondition}
              isLast={index === conditions.length - 1}
            />
          ))}
        </div>

        {/* Expression Preview Section */}
        <Divider style={{ margin: "8px 0" }} />

        <div style={{ marginBottom: 12 }}>
          <Space
            style={{
              justifyContent: "space-between",
              width: "100%",
              marginBottom: 8,
            }}
          >
            <Text strong style={{ fontSize: "12px" }}>
              Generated Expression:
            </Text>
            <Tooltip title="Copy expression">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={handleCopyExpression}
                disabled={!expression}
              />
            </Tooltip>
          </Space>

          <div
            style={{
              backgroundColor: "#1e1e1e",
              borderRadius: "6px",
              padding: "10px 12px",
              fontFamily: "monospace",
              fontSize: "12px",
              color: "#d4d4d4",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {expression || (
              <span style={{ color: "#6a9955", fontStyle: "italic" }}>
                Build your query by adding conditions above...
              </span>
            )}
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert
            message="Validation Errors"
            description={
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: "12px" }}>
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            }
            type="warning"
            showIcon
            size="small"
            style={{ marginBottom: 12 }}
          />
        )}

        {/* Action Buttons */}
        <Divider style={{ margin: "8px 0" }} />

        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button
            size="small"
            onClick={handleClearAll}
            icon={<ClearOutlined />}
          >
            Clear
          </Button>
          <Button
            type="primary"
            size="small"
            onClick={handleApply}
            icon={<CheckOutlined />}
            disabled={isApplyDisabled}
          >
            Apply Filter
          </Button>
        </Space>
      </Card>
    </div>
  );
};

// Export the evaluateQuery function for external use
export const evaluateQuery = (expression, feature) => {
  if (!expression || expression.trim() === "") return true;

  // Parse the SQL-like expression
  // Pattern: "column" operator value
  const parseCondition = (expr) => {
    // Match patterns like: "column" = 'value', "column" > 100, "column" LIKE '%value%'
    const patterns = [
      { regex: /^"([^"]+)"\s*=\s*'([^']*)'$/, operator: "=", type: "string" },
      { regex: /^"([^"]+)"\s*!=\s*'([^']*)'$/, operator: "!=", type: "string" },
      {
        regex: /^"([^"]+)"\s*=\s*(\\d+(?:\\.\\d+)?)$/,
        operator: "=",
        type: "number",
      },
      {
        regex: /^"([^"]+)"\s*!=\s*(\\d+(?:\\.\\d+)?)$/,
        operator: "!=",
        type: "number",
      },
      {
        regex: /^"([^"]+)"\s*>\s*(\\d+(?:\\.\\d+)?)$/,
        operator: ">",
        type: "number",
      },
      {
        regex: /^"([^"]+)"\s*<\s*(\\d+(?:\\.\\d+)?)$/,
        operator: "<",
        type: "number",
      },
      {
        regex: /^"([^"]+)"\s*>=\s*(\\d+(?:\\.\\d+)?)$/,
        operator: ">=",
        type: "number",
      },
      {
        regex: /^"([^"]+)"\s*<=\s*(\\d+(?:\\.\\d+)?)$/,
        operator: "<=",
        type: "number",
      },
      {
        regex: /^"([^"]+)"\s+LIKE\s+'([^']+)'$/i,
        operator: "LIKE",
        type: "string",
      },
    ];

    for (const pattern of patterns) {
      const match = expr.match(pattern.regex);
      if (match) {
        const [, field, value] = match;
        let parsedValue = value;
        if (pattern.type === "number") {
          parsedValue = parseFloat(value);
        }
        return { field, operator: pattern.operator, value: parsedValue };
      }
    }
    return null;
  };

  // Handle AND/OR logic
  const evaluateExpression = (expr) => {
    expr = expr.trim();

    // Remove outer parentheses
    if (expr.startsWith("(") && expr.endsWith(")")) {
      expr = expr.slice(1, -1).trim();
    }

    // Split by OR first (lower precedence)
    let orIndex = -1;
    let parenCount = 0;
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === "(") parenCount++;
      if (expr[i] === ")") parenCount--;
      if (
        parenCount === 0 &&
        i > 0 &&
        expr.substring(i).toUpperCase().startsWith(" OR ")
      ) {
        orIndex = i;
        break;
      }
    }

    if (orIndex !== -1) {
      const left = expr.substring(0, orIndex);
      const right = expr.substring(orIndex + 4);
      return evaluateExpression(left) || evaluateExpression(right);
    }

    // Split by AND (higher precedence)
    let andIndex = -1;
    parenCount = 0;
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === "(") parenCount++;
      if (expr[i] === ")") parenCount--;
      if (
        parenCount === 0 &&
        i > 0 &&
        expr.substring(i).toUpperCase().startsWith(" AND ")
      ) {
        andIndex = i;
        break;
      }
    }

    if (andIndex !== -1) {
      const left = expr.substring(0, andIndex);
      const right = expr.substring(andIndex + 5);
      return evaluateExpression(left) && evaluateExpression(right);
    }

    // Single condition
    const condition = parseCondition(expr);
    if (condition) {
      const fieldValue = feature.properties?.[condition.field];

      if (fieldValue === undefined || fieldValue === null) return false;

      switch (condition.operator) {
        case "=":
          return fieldValue == condition.value;
        case "!=":
          return fieldValue != condition.value;
        case ">":
          return fieldValue > condition.value;
        case "<":
          return fieldValue < condition.value;
        case ">=":
          return fieldValue >= condition.value;
        case "<=":
          return fieldValue <= condition.value;
        case "LIKE":
          const pattern = condition.value.replace(/%/g, ".*");
          const regex = new RegExp(`^${pattern}$`, "i");
          return regex.test(String(fieldValue));
        default:
          return false;
      }
    }

    return false;
  };

  try {
    return evaluateExpression(expression);
  } catch (error) {
    console.error("Error evaluating query:", error);
    return false;
  }
};

export default QueryBuilderAdvance;
