// QueryBuilder.jsx
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
  DatePicker,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  CopyOutlined,
  CheckOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import {
  evaluateCondition,
  getColumnInfo,
  getDistinctValues,
  getLabelTypeColor,
} from "../../../utils";
import dayjs from "dayjs";

const { Text } = Typography;
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
  date: [
    { label: "=", value: "=", sql: "=" },
    { label: "≠", value: "!=", sql: "!=" },
    { label: ">", value: ">", sql: ">" },
    { label: "<", value: "<", sql: "<" },
    { label: "≥", value: ">=", sql: ">=" },
    { label: "≤", value: "<=", sql: "<=" },
  ],
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
    } else if (columnType === "date") {
      // Format date value for SQL
      formattedValue = `'${value}'`;
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

// Condition Row Component with column type display
const ConditionRow = ({
  condition,
  index,
  columns,
  onUpdate,
  onRemove,
  onAdd,
  isLast,
  isFirst,
  length,

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

  const handleDateChange = (date, dateString) => {
    // dateString will be in DD/MM/YYYY format based on format prop
    onUpdate(index, { value: dateString });
  };

  const isNumberType = currentColumn?.type === "number";
  const isDateType = currentColumn?.type === "date";

  // Format date for display
  const getDateValue = () => {
    if (!condition.value) return null;
    // Parse DD/MM/YYYY to dayjs
    const [day, month, year] = condition.value.split("/");
    return dayjs(`${year}-${month}-${day}`);
  };

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
        style={{ width: "30%", minWidth: "140px" }}
        showSearch
        optionFilterProp="children"
      >
        {columns.map((col) => (
          <Option key={col.name} value={col.name}>
            <Space>
              <span>{col.name}</span>
              <Tag color={getLabelTypeColor(col.type)} style={{ fontSize: 10 }}>
                {col.type}
              </Tag>
            </Space>
          </Option>
        ))}
      </Select>

      <Select
        placeholder="Operator"
        value={condition.operator || undefined}
        onChange={handleOperatorChange}
        style={{ width: "25%", minWidth: "100px" }}
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
          disabled={!condition.operator}
        />
      ) : isDateType ? (
        <DatePicker
          value={getDateValue()}
          onChange={handleDateChange}
          format="DD/MM/YYYY"
          style={{ width: "30%" }}
          disabled={!condition.operator}
          placeholder="DD/MM/YYYY"
        />
      ) : (
        <Select
          placeholder="Value"
          value={condition.value || undefined}
          onChange={handleValueChange}
          style={{ width: "30%" }}
          showSearch
          allowClear
          size="small"
          disabled={!condition.operator}
          popupRender={(menu) => (
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

      {isFirst && length <= 1 ? null : (
        <Tooltip title="Remove condition">
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onRemove(index)}
            size="small"
          />
        </Tooltip>
      )}

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
const QueryBuilder = ({
  activeTab,
  layerData,
  onApplyFilters,
  initialMatchType = "all",
  onClear,
}) => {
  const [matchType, setMatchType] = useState(initialMatchType);
  const [conditions, setConditions] = useState([
    { column: null, operator: null, value: "", columnType: "string" },
  ]);
  const [expression, setExpression] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [appliedExpression, setAppliedExpression] = useState("");

  // Extract features and column info using the updated getColumnInfo
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

      if (condition.columnType === "date") {
        const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!datePattern.test(condition.value)) {
          errors.push(
            `Condition ${idx + 1}: Value must be a date in DD/MM/YYYY format for column "${condition.column}"`,
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
    onClear && onClear();
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
    <div className="query-builder">
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
            isFirst={index === 0}
            length={conditions.length}
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
      {/* {validationErrors.length > 0 && (
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
        )} */}

      {/* Action Buttons */}
      <Divider style={{ margin: "12px 0" }} />

      <Space
        style={{ width: "100%", justifyContent: "flex-end", paddingBottom: 12 }}
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

export default QueryBuilder;
