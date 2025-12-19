import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  Modal,
  Form,
  Select,
  Button,
  Space,
  message,
  Input,
  Switch,
  Divider,
  Spin,
  Row,
  Col,
  InputNumber,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import { togglePrintModal } from "../../store/slices/uiSlice";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import PrintPreviewMap from "./PrintPreviewMap";
import useDebounced from "../../hooks/useDebounced";

const { Option } = Select;

const PrintControl = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.ui.isPrintModalOpen);
  const viewport = useSelector((state) => state.map.viewport);
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  const bufferLayers = useSelector((state) => state.map.bufferLayers);
    const portal_id = useSelector((state) => state.map.portalId);
  

  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const previewMapRef = useRef(null);
  const previewContainerRef = useRef(null);
  // track which preset (if any) is selected; default to 1:250,000
  const [presetValue, setPresetValue] = useState(undefined);

  // Form state for live preview updates
  const [formValues, setFormValues] = useState({
    format: "a4",
    orientation: "landscape",
    title: "",
    footerText: `Generated on ${new Date().toLocaleDateString()} | GIS Dashboard`,
    showLegend: false,
    mapScale: "250000",
  });

  const debouncedMapScale = useDebounced(
    formValues.mapScale,
    presetValue ? 0 : 300
  ); // 300ms debounce ( If a preset is selected we want immediate update; otherwise debounce typing)

  const handleResetForm = () => {
    form.resetFields();
    setFormValues({
      format: "a4",
      orientation: "landscape",
      title: "",
      footerText: `Generated on ${new Date().toLocaleDateString()} | GIS Dashboard`,
      showLegend: false,
      mapScale: "250000",
    });
    // Restore preset selection
    setPresetValue(undefined);
  };

  const handleFormChange = (changedValues, allValues) => {
    setFormValues(allValues);
  };

  // Validate scale input
  const validateScale = (_, value) => {
    if (!value || value.trim() === "") {
      return Promise.resolve();
    }

    // Accept formats: "1:5000", "5000", "1:25,000", "25000"
    const cleanedValue = value.replace(/,/g, "");
    const regex = /^(?:1:)?(\d+)$/;

    if (!regex.test(cleanedValue)) {
      return Promise.reject(
        new Error('Please enter a valid scale (e.g., "1:5000" or "5000")')
      );
    }

    const match = cleanedValue.match(regex);
    const scaleNumber = parseInt(match[1], 10);

    if (isNaN(scaleNumber) || scaleNumber < 100 || scaleNumber > 10000000) {
      return Promise.reject(
        new Error("Scale must be between 1:100 and 1:10,000,000")
      );
    }

    return Promise.resolve();
  };

  // Format scale for display
  const formatScaleValue = (value) => {
    if (!value) return "";

    // If it's already in "1:xxxx" format, return as is
    if (value.includes(":")) {
      return value;
    }

    // Otherwise, format as "1:xxxx"
    const numValue = parseInt(value.replace(/,/g, ""), 10);
    if (!isNaN(numValue)) {
      return `1:${numValue.toLocaleString()}`;
    }

    return value;
  };

  // Parse scale value for the map component
  const parseScaleValue = (value) => {
    if (!value || value.trim() === "") return null;

    const cleanedValue = value.replace(/,/g, "");
    const regex = /^(?:1:)?(\d+)$/;
    const match = cleanedValue.match(regex);

    if (match) {
      return match[1]; // Return just the number part
    }

    return null;
  };

  // Common scale presets
  const scalePresets = [
    { label: "1:500", value: "500" },
    { label: "1:1,000", value: "1000" },
    { label: "1:2,500", value: "2500" },
    { label: "1:5,000", value: "5000" },
    { label: "1:10,000", value: "10000" },
    { label: "1:25,000", value: "25000" },
    { label: "1:50,000", value: "50000" },
    { label: "1:100,000", value: "100000" },
    { label: "1:250,000", value: "250000" },
  ];

  // Calculate preview dimensions based on format and orientation
  const previewDimensions = useMemo(() => {
    const formatDimensions = {
      a0: { width: 841, height: 1189 }, // mm
      a1: { width: 594, height: 841 },
      a2: { width: 420, height: 594 },
      a3: { width: 297, height: 420 },
      a4: { width: 210, height: 297 }, // mm
      letter: { width: 215.9, height: 279.4 },
    };

    let dims = formatDimensions[formValues.format] || formatDimensions.a4;

    if (formValues.orientation === "portrait") {
      // Swap if portrait
      if (dims.width > dims.height) {
        [dims.width, dims.height] = [dims.height, dims.width];
      }
    } else {
      // Ensure landscape orientation
      if (dims.width < dims.height) {
        [dims.width, dims.height] = [dims.height, dims.width];
      }
    }

    // Scale to fit preview (1mm ≈ 3.78px at 96dpi, use 2.5 for smaller preview)
    const mmToPxScale = 2.5;
    let widthPx = dims.width * mmToPxScale;
    let heightPx = dims.height * mmToPxScale;

    // Clamp preview size to avoid extremely large previews for A0/A1
    const maxPreviewWidth = 1200; // px
    const maxPreviewHeight = 900; // px
    const clampScale = Math.min(
      1,
      maxPreviewWidth / widthPx,
      maxPreviewHeight / heightPx
    );
    widthPx = Math.round(widthPx * clampScale);
    heightPx = Math.round(heightPx * clampScale);

    return {
      widthPx,
      heightPx,
      aspectRatio: dims.width / dims.height,
    };
  }, [formValues.format, formValues.orientation]);

const handleExportPDF = async (values) => {
  try {
    setLoading(true);

    const payload = {
      title: values.title,
      format: values.format,
      orientation: values.orientation,
      scale: parseScaleValue(values.mapScale),

      viewport: {
        center: viewport.center,
        zoom: viewport.zoom,
      },

      baseMap: {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      },

      portalId: portal_id, 

      layers: Object.entries(geoJsonLayers).map(([layerId, l]) => ({
        layerId,
        geojsonUrl: `/api/layers/${layerId}/geojson/`,
        style: l.metaData?.style || {},
      })),
    };

    const res = await fetch("http://127.0.0.1:8000/api/print/map/", {
      method: "POST",
      headers: { "Content-Type": "application/json",
        authorization: `Bearer ${localStorage.getItem("token")}`
       },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Print failed");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = values.title
      ? `${values.title.replace(/\s+/g, "_")}.pdf`
      : `map_export_${Date.now()}.pdf`;

    a.click();
    URL.revokeObjectURL(url);

    message.success("Map exported successfully");
    dispatch(togglePrintModal());
    handleResetForm();
  } catch (err) {
    console.error(err);
    message.error("Failed to export map");
  } finally {
    setLoading(false);
  }
};



  const handleCancel = () => {
    handleResetForm();
    dispatch(togglePrintModal());
  };

  return (
    <Modal
      title="Export Map to PDF"
      open={isOpen}
      onCancel={handleCancel}
      footer={null}
      width="95vw"
      style={{ maxWidth: "1600px" }}
      bodyStyle={{
        padding: "24px",
        maxHeight: "85vh",
        overflow: "hidden",
      }}
      centered
      destroyOnClose
    >
      <div className="print-modal-wrapper">
        <Row gutter={24} style={{ height: "100%", margin: 0 }}>
          {/* Left Panel - Settings */}
          <Col
            xs={24}
            sm={24}
            md={8}
            style={{
              height: "600px",
              overflowY: "auto",
              paddingRight: "12px",
            }}
            className="print-settings-panel"
          >
            <h3 className="print-panel-title">Print Settings</h3>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleExportPDF}
              onValuesChange={handleFormChange}
              initialValues={{
                format: "a4",
                orientation: "landscape",
                title: "",
                footerText: `Generated on ${new Date().toLocaleDateString()} | GIS Dashboard`,
                showLegend: false,
                mapScale: "250000",
              }}
            >
              {/* Map Title */}
              <Form.Item
                name="title"
                label="Map Title"
                tooltip="Optional title to display on the PDF"
              >
                <Input
                  placeholder="Enter map title (optional)"
                  maxLength={60}
                  allowClear
                  size="large"
                />
              </Form.Item>

              <Divider style={{ margin: "16px 0" }} />

              {/* Map Scale */}
              <Form.Item
                name="mapScale"
                label="Map Scale"
                tooltip="Enter map scale (e.g., '1:5000' or '5000'). The map will adjust to this scale in the preview."
                rules={[{ validator: validateScale }]}
              >
                <Input
                  placeholder="e.g., 1:5000 or 5000"
                  size="large"
                  addonBefore="1:"
                  // If user edits the main input manually, clear any selected preset so
                  // the Select returns to its placeholder state.
                  onChange={() => {
                    if (presetValue) setPresetValue(undefined);
                  }}
                  suffix={
                    <Select
                      size="small"
                      placeholder="Presets"
                      style={{ width: 120 }}
                      value={presetValue}
                      onChange={(value) => {
                        form.setFieldsValue({ mapScale: value });
                        setFormValues({ ...formValues, mapScale: value });
                        setPresetValue(value);
                      }}
                      // Prevent clicks on the Select from bubbling up to the Input/modal
                      // which can cause the dropdown to open and immediately close.
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      // Ensure dropdown attaches inside the select's parent container
                      // (avoids some edge cases with modals/portals)
                      getPopupContainer={(triggerNode) =>
                        triggerNode?.parentNode || document.body
                      }
                      dropdownMatchSelectWidth={false}
                    >
                      {scalePresets.map((preset) => (
                        <Option key={preset.value} value={preset.value}>
                          {preset.label}
                        </Option>
                      ))}
                    </Select>
                  }
                />
              </Form.Item>

              <Divider style={{ margin: "16px 0" }} />

              {/* Paper Format */}
              <Form.Item
                name="format"
                label="Paper Size"
                rules={[
                  { required: true, message: "Please select paper size" },
                ]}
              >
                <Select size="large">
                  <Option value="a0">A0 (841 × 1189 mm)</Option>
                  <Option value="a1">A1 (594 × 841 mm)</Option>
                  <Option value="a2">A2 (420 × 594 mm)</Option>
                  <Option value="a3">A3 (297 × 420 mm)</Option>
                  <Option value="a4">A4 (210 × 297 mm)</Option>
                  <Option value="letter">Letter (8.5 × 11 in)</Option>
                </Select>
              </Form.Item>

              {/* Orientation */}
              <Form.Item
                name="orientation"
                label="Orientation"
                rules={[
                  { required: true, message: "Please select orientation" },
                ]}
              >
                <Select size="large">
                  <Option value="landscape">Landscape</Option>
                  <Option value="portrait">Portrait</Option>
                </Select>
              </Form.Item>

              <Divider style={{ margin: "16px 0" }} />

              {/* Footer Text */}
              <Form.Item
                name="footerText"
                label="Footer Text"
                tooltip="Customize footer text to display on the PDF"
              >
                <Input.TextArea
                  rows={2}
                  placeholder="Enter footer text"
                  maxLength={200}
                  showCount
                />
              </Form.Item>

              {/* Legend Toggle */}
              <Form.Item
                name="showLegend"
                label="Include Legend"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Divider style={{ margin: "16px 0" }} />

              {/* Action Buttons */}
              <Form.Item>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    size="large"
                    disabled={loading}
                  >
                    {loading ? "Exporting..." : "Export PDF"}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    block
                    size="large"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Col>

          {/* Right Panel - Preview */}
          <Col
            xs={24}
            sm={24}
            md={16}
            style={{
              height: "600px",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#f5f5f5",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <h3 className="print-panel-title">Preview</h3>

            {/* Preview Container */}
            <div
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                overflow: "auto",
                backgroundColor: "#e8e8e8",
                borderRadius: "4px",
                padding: "20px",
              }}
            >
              <Spin spinning={loading} tip="Rendering preview...">
                <div
                  ref={previewContainerRef}
                  style={{
                    width: `${previewDimensions.widthPx}px`,
                    height: `${previewDimensions.heightPx}px`,
                    backgroundColor: "white",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    borderRadius: "2px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {/* Title in Preview */}
                  {
                    <div
                      style={{
                        height: "40px",
                        boxSizing: "border-box",
                        padding: "10px",
                        textAlign: "center",
                        borderBottom: "1px solid #eee",
                        fontSize: "14px",
                        fontWeight: "bold",
                        backgroundColor: "#fafafa",
                      }}
                    >
                      {formValues.title}
                    </div>
                  }

                  {/* Scale display in preview */}
                  {debouncedMapScale && (
                    <div
                      style={{
                        position: "absolute",
                        top: formValues.title ? "50px" : "10px",
                        right: "10px",
                        padding: "4px 8px",
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        zIndex: 1000,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                    >
                      Scale: {formatScaleValue(debouncedMapScale)}
                    </div>
                  )}

                  {/* Live Map Preview */}
                  <div
                    style={{
                      width: "calc(100% - 20px)",
                      height: "calc(100% - 80px)",
                      margin: "0 auto",
                      position: "relative",
                    }}
                  >
                    <PrintPreviewMap
                      ref={previewMapRef}
                      geoJsonLayers={geoJsonLayers}
                      bufferLayers={bufferLayers}
                      viewport={viewport}
                      showLegend={formValues.showLegend}
                      orientation={formValues.orientation}
                      format={formValues.format}
                      scaleValue={parseScaleValue(debouncedMapScale)}
                    />
                  </div>

                  {/* Footer in Preview */}
                  {
                    <div
                      style={{
                        height: "40px",
                        boxSizing: "border-box",
                        padding: "8px",
                        textAlign: "center",
                        borderTop: "1px solid #eee",
                        fontSize: "10px",
                        color: "#888",
                        backgroundColor: "#fafafa",
                      }}
                    >
                      {formValues.footerText}
                    </div>
                  }
                </div>
              </Spin>
            </div>

            {/* Preview Info */}
            <div
              style={{
                marginTop: "12px",
                fontSize: "12px",
                color: "#666",
                textAlign: "center",
              }}
            >
              {formValues.orientation === "landscape"
                ? "📄 Landscape"
                : "📋 Portrait"}{" "}
              | {formValues.format.toUpperCase()} |
              {debouncedMapScale
                ? ` Scale: ${formatScaleValue(debouncedMapScale)} | `
                : " "}
              Preview (not to scale)
            </div>
          </Col>
        </Row>
      </div>
    </Modal>
  );
};

export default PrintControl;
