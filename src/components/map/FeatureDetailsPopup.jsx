import React, { memo, useState, useMemo } from "react";
import { Modal, Table, Button, Space, Empty } from "antd";
import { CloseOutlined, ZoomInOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { updateViewport } from "../../store/slices/mapSlice";

const ROWS_PER_PAGE = 5;

const FeatureDetailsPopup = memo(
  ({ feature, visible, onClose, featureName }) => {
    const dispatch = useDispatch();
    const [currentPage, setCurrentPage] = useState(1);

    // Extract and format properties - Always call useMemo (even if feature is null)
    const properties = useMemo(() => {
      if (!feature?.properties) return [];

      return Object.entries(feature.properties)
        .filter(([key]) => !key.startsWith("_"))
        .map(([key, value]) => ({
          key,
          value: value ?? "N/A",
        }));
    }, [feature]);

    // Pagination - Always call useMemo
    const paginatedData = useMemo(() => {
      const start = (currentPage - 1) * ROWS_PER_PAGE;
      return properties.slice(start, start + ROWS_PER_PAGE);
    }, [properties, currentPage]);

    // Table columns - Always call useMemo
    const columns = useMemo(
      () => [
        {
          title: "Property",
          dataIndex: "key",
          key: "key",
          width: "40%",
          render: (text) => <strong>{text}</strong>,
        },
        {
          title: "Value",
          dataIndex: "value",
          key: "value",
          width: "60%",
          render: (text) => <span>{String(text)}</span>,
        },
      ],
      []
    );

    // Handle zoom to feature
    const handleZoomToFeature = () => {
      try {
        if (!feature?.geometry) return;

        const { geometry } = feature;
        let center, zoom;

        if (geometry.type === "Point") {
          const [lng, lat] = geometry.coordinates;
          center = [lat, lng];
          zoom = 16;
        } else if (
          geometry.type === "LineString" ||
          geometry.type === "Polygon"
        ) {
          const coordinates =
            geometry.type === "LineString"
              ? geometry.coordinates
              : geometry.coordinates[0];

          const lats = coordinates.map((coord) => coord[1]);
          const lngs = coordinates.map((coord) => coord[0]);

          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);

          center = [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
          zoom = 14;
        }

        if (center) {
          dispatch(updateViewport({ center, zoom }));
        }
      } catch (err) {
        console.error("Error zooming to feature:", err);
      }
    };

    // Early return if no feature - but all hooks are already called above
    if (!feature) {
      return null;
    }

    return (
      <Modal
        title={
          <div className="feature-popup-header">
            <span className="feature-name">
              {featureName || "Feature Details"}
            </span>
          </div>
        }
        open={visible}
        onCancel={onClose}
        footer={null}
        width={500}
        className="feature-details-modal"
        closeIcon={<CloseOutlined />}
        destroyOnClose
      >
        <div className="feature-popup-content">
          {/* Action Buttons */}
          <Space className="feature-actions" style={{ marginBottom: "16px" }}>
            <Button
              type="primary"
              icon={<ZoomInOutlined />}
              onClick={handleZoomToFeature}
              size="small"
            >
              Zoom to Feature
            </Button>
          </Space>

          {/* Properties Table */}
          {properties.length > 0 ? (
            <Table
              columns={columns}
              dataSource={paginatedData.map((item, idx) => ({
                ...item,
                id: idx,
              }))}
              rowKey="id"
              pagination={{
                current: currentPage,
                pageSize: ROWS_PER_PAGE,
                total: properties.length,
                onChange: setCurrentPage,
                showSizeChanger: false,
                showQuickJumper: true,
                size: "small",
              }}
              size="small"
              bordered
              scroll={{ x: true }}
            />
          ) : (
            <Empty description="No properties available" />
          )}
        </div>
      </Modal>
    );
  }
);

FeatureDetailsPopup.displayName = "FeatureDetailsPopup";
export default FeatureDetailsPopup;
