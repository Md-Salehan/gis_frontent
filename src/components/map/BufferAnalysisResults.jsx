import React, { memo, useCallback, useMemo, useRef } from "react";
import {
  Card,
  Tag,
  Collapse,
  Typography,
  Alert,
  Progress,
  Spin,
  Space,
  Table,
  Empty,
  Tooltip,
  Button,
} from "antd";
import {
  CheckCircleOutlined,
  LoadingOutlined,
  CloseCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { MAP_FIT_OPTIONS } from "../../constants";
import { useDispatch } from "react-redux";
import { useMap } from "react-leaflet";
import { setSelectedFeature } from "../../store/slices/mapSlice";

const { Text } = Typography;
const { Panel } = Collapse;

const BufferAnalysisResults = memo(
  ({ analysisState, activeLayers, selectedLayerIds, onClear }) => {
    const {
      status, // 'idle' | 'analyzing' | 'complete' | 'error'
      progress,
      processedCount,
      totalCount,
      error,
      results,
    } = analysisState;
    const dispatch = useDispatch();
    const map = useMap();

    // Get property keys for a specific layer's features
    const getLayerPropertyKeys = (matchedFeatures) => {
      const keys = new Set();
      if (matchedFeatures[0].feature?.properties) {
        Object.keys(matchedFeatures[0].feature.properties).forEach((key) =>
          keys.add(key),
        );
      }

      return Array.from(keys);
    };

    // ============================================
    // Selection Handlers
    // ============================================
    const prevSelectedFeatureId = useRef("");
    const handleViewFeature = useCallback(
      (record, layerId) => {
        const selectedFeature =
          activeLayers[layerId]?.geoJsonData.features[record.featureIndex - 1];

        if (
          selectedFeature &&
          layerId + record.featureIndex !== prevSelectedFeatureId.current
        ) {
          dispatch(
            setSelectedFeature({
              feature: [selectedFeature],
              metaData: {
                ...activeLayers[layerId]?.metaData,
                selectedKeys: [record.key],
              },
            }),
          );

          if (map) {
            try {
              const layer = L.geoJSON(selectedFeature);
              const bounds = layer.getBounds();
              if (bounds && bounds.isValid && bounds.isValid()) {
                const currentBounds = map.getBounds();
                const isAlreadyInView = currentBounds.contains(bounds);

                if (isAlreadyInView) {
                  map.fitBounds(bounds, MAP_FIT_OPTIONS);
                } else {
                  map.flyToBounds(bounds, MAP_FIT_OPTIONS);
                }
              }
            } catch (error) {
              console.error("Error fitting bounds:", error);
            }
          }

          // setSelectedRowKeys({
          //   [layerId]: [record.key],
          // });

          prevSelectedFeatureId.current = layerId + record.featureIndex;
        } else {
          dispatch(
            setSelectedFeature({
              feature: [],
              metaData: null,
            }),
          );
          // setSelectedRowKeys({});
          prevSelectedFeatureId.current = "";
        }
      },
      [dispatch, activeLayers, map],
    );

    if (status === "idle") {
      return null;
    }

    if (status === "error") {
      return (
        <Alert
          type="error"
          message="Analysis Error"
          description={error || "An error occurred during analysis"}
          showIcon
          closable
          onClose={onClear}
          style={{ marginTop: 12 }}
        />
      );
    }

    if (status === "analyzing") {
      return (
        <div style={{ padding: "12px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "8px",
            }}
          >
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 20 }} spin />}
            />
            <Text style={{ fontSize: 13 }}>Analyzing features...</Text>
          </div>
          <Progress
            percent={progress}
            status="active"
            strokeColor={{
              "0%": "#108ee9",
              "100%": "#87d068",
            }}
            size="small"
          />
          <div
            style={{
              marginTop: 6,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              fontSize: 12,
            }}
          >
            <Text type="secondary">Processed: {processedCount}</Text>
            <Text type="secondary">Total: {totalCount}</Text>
            <Text type="secondary">Found: {results?.matchedCount || 0}</Text>
          </div>
        </div>
      );
    }

    if (status === "complete") {
      const totalMatched = results?.matchedCount || 0;
      const totalLayers = selectedLayerIds?.length || 0;

      return (
        <Card
          size="small"
          style={{ marginTop: 12 }}
          bodyStyle={{ padding: "12px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 16 }} />
            <Text strong style={{ fontSize: 13 }}>
              Analysis Complete
            </Text>
          </div>
          <Space wrap size={[6, 6]} style={{ marginBottom: 6 }}>
            <Tag color="green" style={{ fontSize: 12 }}>
              {totalMatched} matching
            </Tag>
            <Tag color="blue" style={{ fontSize: 12 }}>
              {totalLayers} layers
            </Tag>
            <Tag color="purple" style={{ fontSize: 12 }}>
              {totalCount} processed
            </Tag>
          </Space>

          {results?.layers?.length > 0 && (
            <Collapse
              size="small"
              style={{ marginTop: 6 }}
              defaultActiveKey={["results"]}
              expandIconPosition="right"
            >
              <Panel
                header={
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    Results by Layer (
                    {
                      results.layers.filter((l) => l.matchedFeatureCount > 0)
                        .length
                    }{" "}
                    with matches)
                  </span>
                }
                key="results"
              >
                <Collapse size="small" ghost expandIconPosition="right">
                  {results?.layers?.map(
                    ({
                      layerId,
                      layerName,
                      totalFeatureCount,
                      matchedFeatureCount,
                      matchedFeatures,
                    }) => {
                      const name = layerName || layerId;
                      const matchedInLayer = matchedFeatureCount || 0;
                      const totalInLayer = totalFeatureCount || 0;
                      const hasMatches = matchedInLayer > 0;

                      // Get property keys for this layer
                      const layerKeys = getLayerPropertyKeys(matchedFeatures);

                      // Prepare table data
                      const tableData =
                        matchedFeatures?.map((item, index) => {
                          const row = {
                            key: `${layerId}-${item.featureIndex}-${index}`,
                            featureIndex:
                              Number(item.feature?.properties?.gid),
                          };
                          // Add all property values
                          layerKeys.forEach((key) => {
                            row[key] = item.feature?.properties?.[key] ?? "-";
                          });
                          return row;
                        }) || [];

                      // Table columns
                      const columns = [
                        {
                          title: "#",
                          dataIndex: "featureIndex",
                          key: "featureIndex",
                          width: 50,
                          render: (val) => (
                            <Text style={{ fontSize: 12 }}>{val}</Text>
                          ),
                        },
                        {
                          title: "Find",
                          key: `${layerId}-action`,
                          width: 80,
                          fixed: "left",
                          render: (text, record) => {
                            const isSingleSelected =
                              prevSelectedFeatureId.current ===
                              layerId + record.featureIndex;

                            return (
                              <Tooltip
                                title={
                                  isSingleSelected
                                    ? "View feature on map (currently selected)"
                                    : "View feature on map"
                                }
                              >
                                <Button
                                  type={
                                    isSingleSelected ? "primary" : "default"
                                  }
                                  icon={<SearchOutlined />}
                                  size="small"
                                  onClick={() =>
                                    handleViewFeature(record, layerId)
                                  }
                                />
                              </Tooltip>
                            );
                          },
                        },
                        ...layerKeys.map((key) => ({
                          title: key,
                          dataIndex: key,
                          key: key,
                          render: (val) => {
                            if (val === null || val === undefined)
                              return (
                                <Text style={{ fontSize: 12, color: "#999" }}>
                                  -
                                </Text>
                              );
                            if (typeof val === "string" && val.length > 30) {
                              return (
                                <Text style={{ fontSize: 12 }} title={val}>
                                  {val.substring(0, 30)}...
                                </Text>
                              );
                            }
                            return (
                              <Text style={{ fontSize: 12 }}>
                                {String(val)}
                              </Text>
                            );
                          },
                          ellipsis: true,
                        })),
                      ];

                      return (
                        <Panel
                          key={layerId}
                          header={
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                width: "100%",
                                paddingRight: 8,
                              }}
                            >
                              <span style={{ fontSize: 13 }}>{name}</span>
                              <div>
                                <Tag
                                  color={hasMatches ? "green" : "default"}
                                  style={{ fontSize: 11 }}
                                >
                                  {matchedInLayer} / {totalInLayer}
                                </Tag>
                              </div>
                            </div>
                          }
                          extra={
                            hasMatches ? (
                              <Tag color="green" style={{ fontSize: 11 }}>
                                ✓ {matchedInLayer} matches
                              </Tag>
                            ) : (
                              <Tag color="default" style={{ fontSize: 11 }}>
                                No matches
                              </Tag>
                            )
                          }
                        >
                          {hasMatches ? (
                            <Table
                              size="small"
                              columns={columns}
                              dataSource={tableData}
                              pagination={{
                                size: "small",
                                pageSize: 5,
                                showSizeChanger: true,
                                pageSizeOptions: ["5", "10", "20", "50"],
                                showTotal: (total) => `Total ${total} features`,
                              }}
                              scroll={{ x: "max-content" }}
                              style={{ fontSize: 12 }}
                              bordered
                            />
                          ) : (
                            <Empty
                              description="No matching features"
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              style={{ margin: "8px 0" }}
                            />
                          )}
                        </Panel>
                      );
                    },
                  )}
                </Collapse>
              </Panel>
            </Collapse>
          )}
        </Card>
      );
    }

    return null;
  },
);

BufferAnalysisResults.displayName = "BufferAnalysisResults";
export default BufferAnalysisResults;
