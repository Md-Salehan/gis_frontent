import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
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
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import { togglePrintModal } from "../../store/slices/uiSlice";
import { toPng, toSvg } from "html-to-image";
import jsPDF from "jspdf";
import PrintPreviewMap from "./PrintPreviewMap";
import useDebounced from "../../hooks/useDebounced";

const { Option } = Select;

const initialValues = {
  format: "a4",
  orientation: "landscape",
  title: "",
  footerText: `Generated on ${new Date().toLocaleDateString()} | GIS Dashboard`,
  showLegend: false,
  mapScale: "250000",
};

const PrintControl = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.ui.isPrintModalOpen);
  const viewport = useSelector((state) => state.map.viewport);
  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  const bufferLayers = useSelector((state) => state.map.bufferLayers);

  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const previewMapRef = useRef(null);
  const previewContainerRef = useRef(null);
  const [presetValue, setPresetValue] = useState(undefined);

  // Form state for live preview updates
  const [formValues, setFormValues] = useState(initialValues);

  const debouncedMapScale = useDebounced(
    formValues.mapScale,
    presetValue ? 0 : 300
  );

  // Paper dimensions in millimeters
  const PAPER_DIMENSIONS = useMemo(
    () => ({
      a0: { width: 841, height: 1189 },
      a1: { width: 594, height: 841 },
      a2: { width: 420, height: 594 },
      a3: { width: 297, height: 420 },
      a4: { width: 210, height: 297 },
      letter: { width: 215.9, height: 279.4 },
    }),
    []
  );

  // Calculate preview dimensions
  const previewDimensions = useMemo(() => {
    let dims = PAPER_DIMENSIONS[formValues.format] || PAPER_DIMENSIONS.a4;

    if (formValues.orientation === "portrait") {
      if (dims.width > dims.height) {
        [dims.width, dims.height] = [dims.height, dims.width];
      }
    } else {
      if (dims.width < dims.height) {
        [dims.width, dims.height] = [dims.height, dims.width];
      }
    }

    const mmToPxScale = 2.5;
    let widthPx = dims.width * mmToPxScale;
    let heightPx = dims.height * mmToPxScale;

    const maxPreviewWidth = 1200;
    const maxPreviewHeight = 900;
    const clampScale = Math.min(
      1,
      maxPreviewWidth / widthPx,
      maxPreviewHeight / heightPx
    );

    return {
      widthPx: Math.round(widthPx * clampScale),
      heightPx: Math.round(heightPx * clampScale),
      mmWidth: dims.width,
      mmHeight: dims.height,
      aspectRatio: dims.width / dims.height,
    };
  }, [formValues.format, formValues.orientation, PAPER_DIMENSIONS]);

  // Validate scale input
  const validateScale = (_, value) => {
    if (!value || value.trim() === "") {
      return Promise.resolve();
    }

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

    if (value.includes(":")) {
      return value;
    }

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
      return match[1];
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

  // Capture map container with html-to-image
  const captureMapImage = async () => {
    try {
      // Get the actual map container from the preview
      const mapElement =
        previewContainerRef.current?.querySelector(".leaflet-container");

      if (!mapElement) {
        throw new Error("Map preview not found");
      }

      // Wait for map to stabilize
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Calculate appropriate pixel ratio based on paper size
      let pixelRatio = 2; // Default for A4/A3
      switch (formValues.format) {
        case "a0":
        case "a1":
          pixelRatio = 1.5; // Lower for very large formats to prevent memory issues
          break;
        case "a2":
          pixelRatio = 2;
          break;
        case "a3":
        case "a4":
        case "letter":
          pixelRatio = 2; // Higher for standard sizes
          break;
        default:
          pixelRatio = 2;
      }

      // Capture using html-to-image with optimized settings
      const dataUrl = await toPng(mapElement, {
        quality: 1.0,
        pixelRatio: pixelRatio,
        backgroundColor: "#ffffff",
        style: {
          transform: "none",
          margin: 0,
          padding: 0,
        },
        filter: (node) => {
          // Include all necessary nodes
          const isControl = node.classList?.contains("leaflet-control");
          const isAttribution = node.classList?.contains(
            "leaflet-control-attribution"
          );

          // Keep attribution but filter out other controls if needed
          if (isControl && !isAttribution) {
            // Optionally hide some controls for cleaner export
            return false;
          }

          return true;
        },
        canvasWidth: mapElement.offsetWidth * pixelRatio,
        canvasHeight: mapElement.offsetHeight * pixelRatio,
      });

      return dataUrl;
    } catch (error) {
      console.error("Failed to capture map image:", error);
      throw error;
    }
  };

  // Create PDF with captured image
  const createPDF = async (mapImageUrl, values) => {
    const { mmWidth, mmHeight } = previewDimensions;
    const orientation = values.orientation;

    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format: [mmWidth, mmHeight],
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Margins
    const margin = 10;
    const headerHeight = values.title ? 15 : 5;
    const footerHeight = values.footerText ? 15 : 0;

    // Available space for map
    const mapStartY = margin + headerHeight;
    const mapHeight = pageHeight - margin - footerHeight - mapStartY;
    const mapWidth = pageWidth - 2 * margin;

    // Add title if provided
    if (values.title) {
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(values.title, pageWidth / 2, margin + 8, { align: "center" });

    } 
    
    // Add scale if provided
      if (values.mapScale) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        const formattedScale = formatScaleValue(values.mapScale);
        pdf.text(`Scale: ${formattedScale}`, pageWidth - margin, margin, {
          align: "right",
        });
      }

    // Add date in top-right corner
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(currentDate, margin, margin, { align: "left" });

    // Add map image
    if (mapImageUrl) {
      try {
        pdf.addImage(
          mapImageUrl,
          "PNG",
          margin,
          mapStartY,
          mapWidth,
          mapHeight
        );
      } catch (error) {
        console.error("Failed to add image to PDF:", error);
        // Add placeholder if image fails
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin, mapStartY, mapWidth, mapHeight, "F");
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(12);
        pdf.text("Map Image", pageWidth / 2, pageHeight / 2, {
          align: "center",
        });
      }
    }

    // Add footer if enabled
    if (values.footerText) {
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.setFont("helvetica", "normal");
      pdf.text(values.footerText, pageWidth / 2, pageHeight - margin - 5, {
        align: "center",
      });
      pdf.setTextColor(0, 0, 0);
    }

    // Add page border
    // pdf.setLineWidth(0.2);
    // pdf.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);

    return pdf;
  };

  // Main export handler
  const handleExportPDF = async (values) => {
    try {
      setLoading(true);
      message.info("Capturing map... This may take a moment.");

      // Hide preview UI elements temporarily
      const previewUI =
        previewContainerRef.current?.querySelectorAll(".preview-ui");
      const originalStyles = [];
      if (previewUI) {
        previewUI.forEach((el) => {
          originalStyles.push(el.style.display);
          el.style.display = "none";
        });
      }

      try {
        // Capture the map image
        const mapImageUrl = await captureMapImage();

        // Create PDF
        const pdf = await createPDF(mapImageUrl, values);

        // Generate filename
        const fileName = values.title
          ? `${values.title.replace(/\s+/g, "_")}_${new Date().getTime()}.pdf`
          : `map_export_${new Date().getTime()}.pdf`;

        // Save PDF
        pdf.save(fileName);

        message.success("Map exported successfully!");
        dispatch(togglePrintModal());
        handleResetForm();
      } finally {
        // Restore UI elements
        if (previewUI) {
          previewUI.forEach((el, index) => {
            el.style.display = originalStyles[index] || "";
          });
        }
      }
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export map. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    form.resetFields();
    setFormValues(initialValues);
    // Restore preset selection
    setPresetValue(undefined);
  };

  const handleCancel = () => {
    handleResetForm();
    dispatch(togglePrintModal());
  };

  const handleFormChange = (changedValues, allValues) => {
    setFormValues(allValues);
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
              initialValues={initialValues}
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
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
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
                  
                    <div
                      className="preview-ui"
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
                  

                  {/* Scale display in preview */}
                  {/* {debouncedMapScale && (
                    <div
                      className="preview-ui"
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
                  )} */}

                  {/* Date in preview */}
                  {/* <div
                    className="preview-ui"
                    style={{
                      position: "absolute",
                      top: formValues.title ? "50px" : "10px",
                      left: "10px",
                      padding: "4px 8px",
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      borderRadius: "4px",
                      fontSize: "10px",
                      color: "#666",
                      zIndex: 1000,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    }}
                  >
                    {new Date().toLocaleDateString()}
                  </div> */}

                  {/* Live Map Preview */}
                  <div
                    style={{
                      width: "95%",
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
                  
                    <div
                      className="preview-ui"
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
