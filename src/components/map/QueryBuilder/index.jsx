import { Button, Card, Space, Switch, Tag } from "antd";
import React, { useState } from "react";
import { CloseOutlined, DatabaseOutlined } from "@ant-design/icons";
import QueryBuilder from "./QueryBuilder";
import QueryBuilderAdvance from "./QueryBuilderAdvance";

export default function QueryMain({ activeTab, layerData, onApplyFilters, onClose, onClear }) {
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
              <span> Query Builder</span>
              {/* {activeTab && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {layerData?.metaData?.layer?.layer_nm || activeTab}
                </Tag>
              )} */}
            </span>
          

            <span>
              <Tag
                size="small"
                color={type === "basic" ? "green" : "default"}
                style={{ marginLeft: 0, cursor: "pointer", userSelect: "none" }}
                onClick={() => setType("basic")}
              >
                Basic
              </Tag>
              <Tag
                size="small"
                color={type === "advanced" ? "red" : "default"}
                style={{ marginLeft: 0, cursor: "pointer", userSelect: "none" }}
                onClick={() => setType("advanced")}
              >
                Advanced
              </Tag>

              <Tag
                size="small"
                color={"red"}
                style={{ marginLeft: 0, cursor: "pointer", userSelect: "none" }}
                onClick={onClose}
              >
                <CloseOutlined />
              </Tag>
            </span>
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
            onClear={onClear}
          />
        )}
        {type === "advanced" && activeTab && (
          <QueryBuilderAdvance
            key={activeTab}
            activeTab={activeTab}
            onApplyFilters={onApplyFilters}
            layerData={layerData}
            onClear={onClear}
          />
        )}
      </Card>
    </div>
  );
}
