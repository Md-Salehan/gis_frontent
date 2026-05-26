import { Card, Space, Switch, Tag } from "antd";
import React, { useState } from "react";
import { DatabaseOutlined } from "@ant-design/icons";
import QueryBuilder from "./QueryBuilder";
import QueryBuilderAdvance from "./QueryBuilderAdvance";

export default function QueryMain({ activeTab, layerData, onApplyFilters }) {
  const [type, setType] = useState("basic");
  return (
    <div className="query-builder-container">
      <Card
        title={
          <Space
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>
              <DatabaseOutlined />
              <span>Query Builder</span>
              {activeTab && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {layerData?.metaData?.layer?.layer_nm || activeTab}
                </Tag>
              )}
            </span>
            <Switch
              size="medium"
              style={{ backgroundColor: "#0bbd26" }}
              checked={type === "advanced"}
              onChange={(checked) => setType(checked ? "advanced" : "basic")}
            />
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
        {!activeTab && (
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <Tag color="red">Please select a layer to build your query.</Tag>
          </div>
        )}
        {type === "basic" && activeTab && (
          <QueryBuilder
            key={activeTab}
            activeTab={activeTab}
            onApplyFilters={onApplyFilters}
            layerData={layerData}
          />
        )}
        {type === "advanced" && activeTab && (
          <QueryBuilderAdvance
            key={activeTab}
            activeTab={activeTab}
            onApplyFilters={onApplyFilters}
            layerData={layerData}
          />
        )}
      </Card>
    </div>
  );
}
