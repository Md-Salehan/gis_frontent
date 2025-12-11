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
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import { togglePrintModal } from "../../store/slices/uiSlice";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import PrintPreviewMap from "./PrintPreviewMap";

const { Option } = Select;

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

  // Form state for live preview updates
  const [formValues, setFormValues] = useState({
    format: "a4",
    orientation: "landscape",
    title: "",
    showFooter: true,
    showLegend: false,
  });

  const handleFormChange = (changedValues, allValues) => {
    setFormValues(allValues);
  };

  // Calculate preview dimensions based on format and orientation
  const previewDimensions = useMemo(() => {
    const formatDimensions = {
      a4: { width: 210, height: 297 }, // mm
      a3: { width: 297, height: 420 },
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
    const scale = 2.5;
    return {
      widthPx: dims.width * scale,
      heightPx: dims.height * scale,
      aspectRatio: dims.width / dims.height,
    };
  }, [formValues.format, formValues.orientation]);

  const handleExportPDF = async (values) => {
    try {
      setLoading(true);

      // Get the actual map container from the preview
      const mapElement =
        previewContainerRef.current?.querySelector(".leaflet-container");

      if (!mapElement) {
        message.error("Map preview not found");
        return;
      }

      // Wait for map tiles to load
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Capture map canvas with high quality
      const canvas = await html2canvas(mapElement, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        windowHeight: mapElement.scrollHeight,
        windowWidth: mapElement.scrollWidth,
      });

      const orientation = values.orientation;

      // Create PDF with correct dimensions
      const pdf = new jsPDF({
        orientation,
        unit: "mm",
        format: values.format.toUpperCase(),
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      let yPosition = 10;

      // Add title if provided
      if (values.title) {
        pdf.setFontSize(16);
        pdf.setFont(undefined, "bold");
        pdf.text(values.title, pageWidth / 2, yPosition, { align: "center" });
        yPosition += 12;
        pdf.setFont(undefined, "normal");
      }

      yPosition += 5;

      // Calculate image dimensions to fit page
      const maxImgWidth = pageWidth - 20;
      const maxImgHeight =
        pageHeight - yPosition - (values.showFooter ? 15 : 10);

      const imgAspectRatio = canvas.width / canvas.height;
      let imgWidth = maxImgWidth;
      let imgHeight = imgWidth / imgAspectRatio;

      if (imgHeight > maxImgHeight) {
        imgHeight = maxImgHeight;
        imgWidth = imgHeight * imgAspectRatio;
      }

      const xPosition = (pageWidth - imgWidth) / 2;

      // Add map image to PDF
      const mapImgData = canvas.toDataURL("image/png");
      pdf.addImage(
        mapImgData,
        "PNG",
        xPosition,
        yPosition,
        imgWidth,
        imgHeight
      );

      // Add footer if enabled
      if (values.showFooter) {
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        const footerText = `Generated on ${new Date().toLocaleDateString()} | GIS Dashboard`;
        pdf.text(footerText, pageWidth / 2, pageHeight - 8, {
          align: "center",
        });
        pdf.setTextColor(0, 0, 0);
      }

      // Generate filename
      const fileName = values.title
        ? `${values.title.replace(/\s+/g, "_")}.pdf`
        : `map_export_${Date.now()}.pdf`;

      // Save PDF
      pdf.save(fileName);

      message.success("Map exported successfully!");
      dispatch(togglePrintModal());
      form.resetFields();
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export map. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    dispatch(togglePrintModal());
    form.resetFields();
    setFormValues({
      format: "a4",
      orientation: "landscape",
      title: "",
      showFooter: true,
      showLegend: false,
    });
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
                showFooter: true,
                showLegend: false,
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

              {/* Paper Format */}
              <Form.Item
                name="format"
                label="Paper Size"
                rules={[
                  { required: true, message: "Please select paper size" },
                ]}
              >
                <Select size="large">
                  <Option value="a4">A4 (210 × 297 mm)</Option>
                  <Option value="a3">A3 (297 × 420 mm)</Option>
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

              {/* Footer Toggle */}
              <Form.Item
                name="showFooter"
                label="Include Footer"
                valuePropName="checked"
              >
                <Switch />
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
                  {formValues.title && (
                    <div
                      style={{
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
                  )}

                  {/* Live Map Preview */}
                  <div
                    style={{
                      width: "100%",
                      height: formValues.title ? "calc(100% - 40px)" : "100%",
                      position: "relative",
                    }}
                  >
                    <PrintPreviewMap
                      ref={previewMapRef}
                      geoJsonLayers={geoJsonLayers}
                      bufferLayers={bufferLayers} // Add this line
                      viewport={viewport}
                      showLegend={formValues.showLegend}
                    />
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
              | {formValues.format.toUpperCase()} | Preview (not to scale)
            </div>
          </Col>
        </Row>
      </div>
    </Modal>
  );
};

export default PrintControl;
