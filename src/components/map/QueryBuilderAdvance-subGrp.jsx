// QueryBuilderAdvance.jsx (Fixed Version)
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
  Badge,
  Empty,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  CopyOutlined,
  CheckOutlined,
  ClearOutlined,
  FolderOpenOutlined,
  GroupOutlined,
} from "@ant-design/icons";

const { Text } = Typography;
const { Option } = Select;

// Operator definitions by column type
const OPERATORS_BY_TYPE = {
  string: [
    { label: "=", value: "=", sql: "=" },
    { label: "≠", value: "!=", sql: "!=" },
    { label: "LIKE", value: "LIKE", sql: "LIKE" },
    { label: "contains", value: "contains", sql: "LIKE", isPattern: true },
    { label: "starts with", value: "starts_with", sql: "LIKE", isPattern: true },
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
      distinctValues: Array.from(distinctValues).slice(0, 500),
    };
  });
};

// Generate SQL-like expression from nested groups
const generateExpressionFromGroup = (group) => {
  if (!group.conditions || group.conditions.length === 0) return "";
  
  const expressions = group.conditions
    .map((condition) => {
      if (condition.type === "group") {
        const subExpr = generateExpressionFromGroup(condition);
        return subExpr ? `(${subExpr})` : "";
      } else if (condition.type === "condition" && condition.column && condition.operator && condition.value !== undefined && condition.value !== "") {
        return generateSingleCondition(condition);
      }
      return "";
    })
    .filter(Boolean);
  
  if (expressions.length === 0) return "";
  
  const joinOperator = group.matchType === "any" ? " OR " : " AND ";
  return expressions.join(joinOperator);
};

const generateSingleCondition = (condition) => {
  const { column, operator, value, columnType } = condition;
  const quotedColumn = `"${column}"`;
  const opDef = OPERATORS_BY_TYPE[columnType]?.find((op) => op.value === operator);
  
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
  if (operator === "contains" || operator === "starts_with" || operator === "ends_with") {
    sqlOp = "LIKE";
  }
  
  return `${quotedColumn} ${sqlOp} ${formattedValue}`;
};

// Condition Row Component (Single condition)
const ConditionRow = ({ condition, index, columns, onUpdate, onRemove, groupId, isLast }) => {
  const currentColumn = columns.find((c) => c.name === condition.column);
  const operators = currentColumn ? OPERATORS_BY_TYPE[currentColumn.type] || OPERATORS_BY_TYPE.string : OPERATORS_BY_TYPE.string;
  const distinctValues = currentColumn?.distinctValues || [];

  const handleColumnChange = (value) => {
    const newColumn = columns.find((c) => c.name === value);
    onUpdate(groupId, index, {
      column: value,
      columnType: newColumn?.type || "string",
      operator: OPERATORS_BY_TYPE[newColumn?.type || "string"][0]?.value || "=",
      value: "",
    });
  };

  const handleOperatorChange = (value) => {
    onUpdate(groupId, index, { operator: value });
  };

  const handleValueChange = (value) => {
    onUpdate(groupId, index, { value });
  };

  const isNumberType = currentColumn?.type === "number";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "12px",
        padding: "4px 0",
        marginLeft: groupId !== "root" ? "24px" : "0",
      }}
    >
      <Badge 
        count={index + 1} 
        style={{ backgroundColor: "#1890ff" }} 
        size="small"
        offset={[-4, 4]}
      />
      
      <Select
        placeholder="Select column"
        value={condition.column || undefined}
        onChange={handleColumnChange}
        style={{ width: "28%", minWidth: "120px" }}
        showSearch
        optionFilterProp="children"
        size="middle"
        notFoundContent="No columns available"
      >
        {columns.map((col) => (
          <Option key={col.name} value={col.name}>
            {col.name} ({col.type})
          </Option>
        ))}
      </Select>

      <Select
        placeholder="Select operator"
        value={condition.operator || undefined}
        onChange={handleOperatorChange}
        style={{ width: "22%", minWidth: "100px" }}
        size="middle"
        disabled={!condition.column}
        notFoundContent="No operators available"
      >
        {operators.map((op) => (
          <Option key={op.value} value={op.value}>
            {op.label}
          </Option>
        ))}
      </Select>

      {isNumberType ? (
        <InputNumber
          placeholder="Enter value"
          value={condition.value}
          onChange={handleValueChange}
          style={{ width: "28%" }}
          size="middle"
          disabled={!condition.operator}
        />
      ) : (
        <Select
          placeholder="Select or type value"
          value={condition.value || undefined}
          onChange={handleValueChange}
          style={{ width: "28%" }}
          showSearch
          allowClear
          size="middle"
          disabled={!condition.operator}
          filterOption={(input, option) => {
            return String(option?.value || "").toLowerCase().includes(input.toLowerCase());
          }}
          dropdownRender={(menu) => (
            <>
              {menu}
              <Divider style={{ margin: "8px 0" }} />
              <div style={{ padding: "0 8px 8px" }}>
                <Input
                  placeholder="Type custom value and press Enter..."
                  onPressEnter={(e) => {
                    if (e.target.value) {
                      handleValueChange(e.target.value);
                      e.target.value = "";
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
          onClick={() => onRemove(groupId, index)}
          size="middle"
        />
      </Tooltip>
    </div>
  );
};

// Group Component (handles nested groups)
const ConditionGroup = ({ 
  group, 
  groupId, 
  columns, 
  onUpdateGroupMatch, 
  onAddCondition, 
  onAddGroup,
  onUpdateCondition,
  onRemoveCondition,
  onRemoveGroup,
  depth = 0 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleAddCondition = () => {
    onAddCondition(groupId);
  };

  const handleAddGroup = () => {
    onAddGroup(groupId);
  };

  const handleRemoveGroup = () => {
    if (onRemoveGroup) {
      onRemoveGroup(groupId);
    }
  };

  const handleMatchTypeChange = (value) => {
    onUpdateGroupMatch(groupId, value);
  };

  const groupColor = depth === 0 ? "#f6ffed" : ["#e6f7ff", "#fff7e6", "#f9f0ff", "#fff0f6"][depth % 4];
  const groupBorderColor = depth === 0 ? "#b7eb8f" : ["#91d5ff", "#ffe58f", "#d3adf7", "#ffadd6"][depth % 4];

  return (
    <div
      style={{
        border: `2px solid ${groupBorderColor}`,
        borderRadius: "8px",
        backgroundColor: groupColor,
        marginBottom: "16px",
        padding: "16px",
        position: "relative",
      }}
    >
      {/* Group Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          cursor: "pointer",
        }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <Space>
          <GroupOutlined style={{ color: "#1890ff", fontSize: "16px" }} />
          <Text strong style={{ fontSize: "13px" }}>
            {groupId === "root" ? "Query Root" : `Group ${depth}`}
          </Text>
          <Tag color="blue" style={{ fontSize: "11px" }}>
            {group.matchType === "any" ? "Match ANY (OR)" : "Match ALL (AND)"}
          </Tag>
          {isCollapsed && group.conditions.length > 0 && (
            <Text type="secondary" style={{ fontSize: "11px" }}>
              ({group.conditions.length} {group.conditions.length === 1 ? "item" : "items"})
            </Text>
          )}
        </Space>
        
        <Space>
          <Select
            value={group.matchType}
            onChange={handleMatchTypeChange}
            style={{ width: "110px" }}
            size="small"
            onClick={(e) => e.stopPropagation()}
          >
            <Option value="any">Match ANY (OR)</Option>
            <Option value="all">Match ALL (AND)</Option>
          </Select>
          
          {groupId !== "root" && (
            <Tooltip title="Remove this group">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveGroup();
                }}
                size="small"
              />
            </Tooltip>
          )}
          
          <Button
            type="text"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
          >
            {isCollapsed ? "▼ Expand" : "▲ Collapse"}
          </Button>
        </Space>
      </div>

      {/* Group Content */}
      {!isCollapsed && (
        <>
          <div style={{ marginLeft: depth > 0 ? "16px" : "0" }}>
            {group.conditions.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No conditions in this group"
                style={{ margin: "20px 0" }}
              />
            ) : (
              group.conditions.map((condition, idx) => {
                if (condition.type === "group") {
                  return (
                    <ConditionGroup
                      key={condition.id}
                      group={condition}
                      groupId={condition.id}
                      columns={columns}
                      onUpdateGroupMatch={onUpdateGroupMatch}
                      onAddCondition={onAddCondition}
                      onAddGroup={onAddGroup}
                      onUpdateCondition={onUpdateCondition}
                      onRemoveCondition={onRemoveCondition}
                      onRemoveGroup={onRemoveGroup}
                      depth={depth + 1}
                    />
                  );
                } else if (condition.type === "condition") {
                  return (
                    <ConditionRow
                      key={`${groupId}-cond-${idx}-${condition.id}`}
                      condition={condition}
                      index={idx}
                      columns={columns}
                      onUpdate={onUpdateCondition}
                      onRemove={onRemoveCondition}
                      groupId={groupId}
                      isLast={idx === group.conditions.length - 1}
                    />
                  );
                }
                return null;
              })
            )}
          </div>

          {/* Action Buttons for Group */}
          <div style={{ marginTop: "16px", marginLeft: depth > 0 ? "16px" : "0", display: "flex", gap: "12px" }}>
            <Button
              size="middle"
              icon={<PlusOutlined />}
              onClick={handleAddCondition}
            >
              Add Condition
            </Button>
            <Button
              size="middle"
              icon={<FolderOpenOutlined />}
              onClick={handleAddGroup}
            >
              Add Sub-Group
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

// Generate a unique ID
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Create initial condition
const createInitialCondition = () => ({
  id: generateId(),
  type: "condition",
  column: null,
  operator: null,
  value: "",
  columnType: "string",
});

// Create initial group
const createInitialGroup = (matchType = "any") => ({
  id: generateId(),
  type: "group",
  matchType: matchType,
  conditions: [createInitialCondition()],
});

// Main QueryBuilderAdvance Component
const QueryBuilderAdvance = ({ activeTab, layerData, onApplyFilters }) => {
  const [queryStructure, setQueryStructure] = useState(() => {
    // Start with a root group containing one condition
    return {
      id: "root",
      type: "group",
      matchType: "any",
      conditions: [createInitialCondition()],
    };
  });
  
  const [expression, setExpression] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);

  // Extract features and column info
  const features = useMemo(() => {
    return layerData?.geoJsonData?.features || [];
  }, [layerData]);

  const columns = useMemo(() => {
    const cols = getColumnInfo(features);
    console.log("Columns loaded:", cols.length, cols);
    return cols;
  }, [features]);

  // Recursively validate conditions
  const validateGroup = useCallback((group) => {
    const errors = [];
    let hasValidCondition = false;

    if (!group.conditions || group.conditions.length === 0) {
      errors.push("Group has no conditions");
      return errors;
    }

    group.conditions.forEach((item, idx) => {
      if (item.type === "group") {
        const subErrors = validateGroup(item);
        errors.push(...subErrors);
        if (subErrors.length === 0 && item.conditions.length > 0) {
          hasValidCondition = true;
        }
      } else if (item.type === "condition") {
        if (item.column && item.operator && item.value !== undefined && item.value !== "") {
          hasValidCondition = true;
          
          // Validate number type
          if (item.columnType === "number") {
            const numValue = parseFloat(item.value);
            if (isNaN(numValue)) {
              errors.push(`Condition "${item.column}" requires a numeric value`);
            }
          }
          
          // Validate string patterns
          if (item.columnType === "string" && item.value) {
            if ((item.operator === "LIKE" || item.operator === "contains") && item.value.length < 2) {
              errors.push(`LIKE pattern for "${item.column}" should have at least 2 characters`);
            }
          }
        }
      }
    });

    if (!hasValidCondition && group.conditions.length > 0) {
      // Don't add error if there are sub-groups that might be valid
      const hasSubGroups = group.conditions.some(c => c.type === "group");
      if (!hasSubGroups) {
        errors.push("At least one complete condition is required in this group");
      }
    }

    return errors;
  }, []);

  // Generate expression when structure changes
  useEffect(() => {
    const newExpression = generateExpressionFromGroup(queryStructure);
    setExpression(newExpression);
    
    const errors = validateGroup(queryStructure);
    setValidationErrors(errors);
    
    console.log("Expression updated:", newExpression);
    console.log("Validation errors:", errors);
  }, [queryStructure, validateGroup]);

  // Recursively find and update a group
  const updateGroupRecursive = useCallback((group, targetId, updater) => {
    if (group.id === targetId) {
      return updater(group);
    }
    
    return {
      ...group,
      conditions: group.conditions.map((condition) => {
        if (condition.type === "group") {
          return updateGroupRecursive(condition, targetId, updater);
        }
        return condition;
      }),
    };
  }, []);

  // Update group match type
  const handleUpdateGroupMatch = useCallback((groupId, matchType) => {
    setQueryStructure((prev) =>
      updateGroupRecursive(prev, groupId, (group) => ({
        ...group,
        matchType,
      }))
    );
  }, [updateGroupRecursive]);

  // Add condition to a group
  const handleAddCondition = useCallback((groupId) => {
    setQueryStructure((prev) =>
      updateGroupRecursive(prev, groupId, (group) => ({
        ...group,
        conditions: [...group.conditions, createInitialCondition()],
      }))
    );
  }, [updateGroupRecursive]);

  // Add nested group
  const handleAddGroup = useCallback((groupId) => {
    setQueryStructure((prev) =>
      updateGroupRecursive(prev, groupId, (group) => ({
        ...group,
        conditions: [...group.conditions, createInitialGroup("any")],
      }))
    );
  }, [updateGroupRecursive]);

  // Update condition within a group
  const handleUpdateCondition = useCallback((groupId, conditionIndex, updates) => {
    setQueryStructure((prev) =>
      updateGroupRecursive(prev, groupId, (group) => ({
        ...group,
        conditions: group.conditions.map((cond, idx) =>
          idx === conditionIndex && cond.type === "condition"
            ? { ...cond, ...updates }
            : cond
        ),
      }))
    );
  }, [updateGroupRecursive]);

  // Remove condition from a group
  const handleRemoveCondition = useCallback((groupId, conditionIndex) => {
    setQueryStructure((prev) =>
      updateGroupRecursive(prev, groupId, (group) => ({
        ...group,
        conditions: group.conditions.filter((_, idx) => idx !== conditionIndex),
      }))
    );
  }, [updateGroupRecursive]);

  // Remove a group
  const handleRemoveGroup = useCallback((groupId) => {
    if (groupId === "root") return;
    
    setQueryStructure((prev) => {
      const removeFromGroup = (group) => ({
        ...group,
        conditions: group.conditions.filter((condition) => {
          return !(condition.type === "group" && condition.id === groupId);
        }),
      });
      
      return updateGroupRecursive(prev, "root", removeFromGroup);
    });
  }, [updateGroupRecursive]);

  const handleClearAll = useCallback(() => {
    setQueryStructure({
      id: "root",
      type: "group",
      matchType: "any",
      conditions: [createInitialCondition()],
    });
    setValidationErrors([]);
  }, []);

  const handleApply = useCallback(() => {
    if (validationErrors.length > 0) {
      message.error(validationErrors[0]);
      return;
    }

    if (!expression.trim()) {
      message.error("Please add at least one valid condition");
      return;
    }

    if (onApplyFilters) {
      onApplyFilters(expression, activeTab);
      message.success(`Filter applied: ${expression}`);
    }
  }, [expression, validationErrors, onApplyFilters, activeTab]);

  const handleCopyExpression = useCallback(() => {
    if (expression) {
      navigator.clipboard.writeText(expression);
      message.success("Expression copied to clipboard");
    }
  }, [expression]);

  const isApplyDisabled = useMemo(() => {
    return validationErrors.length > 0 || !expression.trim();
  }, [validationErrors, expression]);

  // Show loading or empty state if no columns
  if (columns.length === 0 && features.length > 0) {
    return (
      <Card style={{ height: "100%" }}>
        <Empty description="No columns found in the layer data" />
      </Card>
    );
  }

  return (
    <div
      className="query-builder-advanced"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f5f5f5",
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid #d9d9d9",
      }}
    >
      <Card
        title={
          <Space>
            <span style={{ fontSize: "14px", fontWeight: "bold" }}>
              🔍 Advanced Query Builder
            </span>
            {activeTab && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {layerData?.metaData?.layer?.layer_nm || activeTab}
              </Tag>
            )}
            {columns.length > 0 && (
              <Tag color="green">{columns.length} columns available</Tag>
            )}
          </Space>
        }
        size="small"
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
        bodyStyle={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", padding: "16px" }}
      >
        {/* Condition Groups */}
        <div style={{ flex: 1, marginBottom: 16, overflowY: "auto", minHeight: "300px" }}>
          <ConditionGroup
            group={queryStructure}
            groupId="root"
            columns={columns}
            onUpdateGroupMatch={handleUpdateGroupMatch}
            onAddCondition={handleAddCondition}
            onAddGroup={handleAddGroup}
            onUpdateCondition={handleUpdateCondition}
            onRemoveCondition={handleRemoveCondition}
            onRemoveGroup={handleRemoveGroup}
            depth={0}
          />
        </div>

        {/* Expression Preview Section */}
        <Divider style={{ margin: "16px 0 12px 0" }} />

        <div style={{ marginBottom: 12 }}>
          <Space
            style={{
              justifyContent: "space-between",
              width: "100%",
              marginBottom: 8,
            }}
          >
            <Text strong style={{ fontSize: "13px" }}>
              📝 Generated SQL Expression:
            </Text>
            <Tooltip title="Copy expression">
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={handleCopyExpression}
                disabled={!expression}
              >
                Copy
              </Button>
            </Tooltip>
          </Space>

          <div
            style={{
              backgroundColor: "#1e1e1e",
              borderRadius: "6px",
              padding: "12px",
              fontFamily: "monospace",
              fontSize: "12px",
              color: "#d4d4d4",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: "150px",
              overflowY: "auto",
            }}
          >
            {expression ? (
              <code>{expression}</code>
            ) : (
              <span style={{ color: "#6a9955", fontStyle: "italic" }}>
                Select column, operator, and value to build your query...
              </span>
            )}
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert
            message="Validation Issues"
            description={
              <ul style={{ margin: "8px 0 0 0", paddingLeft: 20, fontSize: "12px" }}>
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            }
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Action Buttons */}
        <Divider style={{ margin: "8px 0 16px 0" }} />

        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button
            onClick={handleClearAll}
            icon={<ClearOutlined />}
          >
            Clear All
          </Button>
          <Button
            type="primary"
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

// Evaluate query with nested groups support
export const evaluateQuery = (expression, feature) => {
  if (!expression || expression.trim() === "") return true;

  const parseCondition = (expr) => {
    const patterns = [
      { regex: /^"([^"]+)"\s*=\s*'([^']*)'$/, operator: "=", type: "string" },
      { regex: /^"([^"]+)"\s*!=\s*'([^']*)'$/, operator: "!=", type: "string" },
      { regex: /^"([^"]+)"\s*=\s*(\d+(?:\.\d+)?)$/, operator: "=", type: "number" },
      { regex: /^"([^"]+)"\s*!=\s*(\d+(?:\.\d+)?)$/, operator: "!=", type: "number" },
      { regex: /^"([^"]+)"\s*>\s*(\d+(?:\.\d+)?)$/, operator: ">", type: "number" },
      { regex: /^"([^"]+)"\s*<\s*(\d+(?:\.\d+)?)$/, operator: "<", type: "number" },
      { regex: /^"([^"]+)"\s*>=\s*(\d+(?:\.\d+)?)$/, operator: ">=", type: "number" },
      { regex: /^"([^"]+)"\s*<=\s*(\d+(?:\.\d+)?)$/, operator: "<=", type: "number" },
      { regex: /^"([^"]+)"\s+LIKE\s+'([^']+)'$/i, operator: "LIKE", type: "string" },
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

  const evaluateExpression = (expr) => {
    expr = expr.trim();

    // Remove outer parentheses
    while (expr.startsWith("(") && expr.endsWith(")")) {
      const inner = expr.slice(1, -1).trim();
      if (inner) expr = inner;
      else break;
    }

    // Split by OR first (lower precedence)
    let orIndex = -1;
    let parenCount = 0;
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === "(") parenCount++;
      if (expr[i] === ")") parenCount--;
      if (parenCount === 0 && i > 0 && expr.substring(i).toUpperCase().startsWith(" OR ")) {
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
      if (parenCount === 0 && i > 0 && expr.substring(i).toUpperCase().startsWith(" AND ")) {
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