export const getLabelTypeColor = (type) => {
    switch (type) {
      case "number":
        return "green";
      case "string":
        return "blue";
      case "boolean":
        return "orange";
      case "date":
        return "purple";
      default:
        return "gray";
    }
  };

  export const getDistinctValues = (features, columnName) => {
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

export const getColumnInfo = (features) => {
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

export const evaluateCondition = (field, operator, value, featureProperties) => {
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
  // const conditionStr = tokens.join(" ");

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