import React, { useState, useMemo, useRef } from "react";
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
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import { togglePrintModal } from "../../store/slices/uiSlice";
import { MapContainer, TileLayer } from "react-leaflet";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "leaflet/dist/leaflet.css";

const { Option } = Select;

const PrintPreviewMap = React.forwardRef(
  (
    { mapSettings, title = "", paperSize = "a4", orientation = "landscape" },
    ref
  ) => {
    // Paper dimensions in mm
    const paperDimensions = {
      a4: { width: 210, height: 297 },
      a3: { width: 297, height: 420 },
      letter: { width: 215.9, height: 279.4 },
    };

    // Ensure paperSize has a valid value
    const validPaperSize = paperDimensions[paperSize] ? paperSize : "a4";
    let { width, height } = paperDimensions[validPaperSize];

    // Swap dimensions based on orientation
    if (orientation === "landscape") {
      if (width < height) {
        [width, height] = [height, width];
      }
    } else {
      // Portrait
      if (width > height) {
        [width, height] = [height, width];
      }
    }

    // Calculate aspect ratio from actual dimensions
    const aspectRatio = width / height;

    // Calculate preview container dimensions (scale down for display)
    const previewWidth = 380;
    const previewHeight = previewWidth / aspectRatio;

    // Create a unique key for MapContainer to force remount on dimension changes
    const mapKey = `${paperSize}-${orientation}-${previewWidth}-${previewHeight}`;

    return (
      <div className="print-preview-container" ref={ref}>
        <div
          className="print-preview-paper"
          style={{
            width: `${previewWidth}px`,
            height: `${previewHeight}px`,
            aspectRatio: `${aspectRatio}`,
            border: "2px solid #d9d9d9",
            borderRadius: "4px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#fff",
            transition: "all 0.3s ease",
            boxShadow: "0 2px 12px rgba(0, 0, 0, 0.12)",
          }}
        >
          {/* Title */}
          {title && (
            <div
              style={{
                padding: "12px",
                textAlign: "center",
                borderBottom: "1px solid #f0f0f0",
                fontSize: "14px",
                fontWeight: "600",
                flexShrink: 0,
                backgroundColor: "#fafafa",
              }}
            >
              {title}
            </div>
          )}

          {/* Map Preview */}
          <div
            style={{
              flex: 1,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MapContainer
              key={mapKey}
              center={mapSettings.center}
              zoom={mapSettings.zoom}
              zoomControl={false}
              dragging={false}
              touchZoom={false}
              doubleClickZoom={false}
              scrollWheelZoom={false}
              boxZoom={false}
              keyboard={false}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
            </MapContainer>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "8px 12px",
              borderTop: "1px solid #f0f0f0",
              fontSize: "10px",
              color: "#8c8c8c",
              textAlign: "center",
              flexShrink: 0,
              backgroundColor: "#fafafa",
            }}
          >
            Generated on {new Date().toLocaleDateString()}
          </div>
        </div>

        <div
          style={{
            marginTop: "12px",
            fontSize: "12px",
            color: "#595959",
            textAlign: "center",
          }}
        >
          <div style={{ fontWeight: "500" }}>
            {validPaperSize.toUpperCase()} • {orientation}
          </div>
          <div style={{ fontSize: "11px", color: "#8c8c8c", marginTop: "4px" }}>
            {width.toFixed(0)} × {height.toFixed(0)} mm
          </div>
        </div>
      </div>
    );
  }
);

PrintPreviewMap.displayName = "PrintPreviewMap";

const PrintControl = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.ui.isPrintModalOpen);
  const viewport = useSelector((state) => state.map.viewport);

  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const mapContainerRef = useRef(null);

  const mapSettings = useMemo(
    () => ({
      center: viewport?.center || [28.7041, 77.1025],
      zoom: viewport?.zoom || 8,
    }),
    [viewport]
  );

  // Watch form values to trigger preview re-render
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

  const handleExportPDF = async (values) => {
    try {
      setLoading(true);

      // Get the map container from the preview
      const mapContainer =
        mapContainerRef.current?.querySelector(".leaflet-container");

      if (!mapContainer) {
        message.error("Map container not found");
        return;
      }

      // Add a small delay to ensure map is fully rendered
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Capture the map as canvas
      const canvas = await html2canvas(mapContainer, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
      });

      // Paper dimensions in mm
      const paperDimensions = {
        a4: { width: 210, height: 297 },
        a3: { width: 297, height: 420 },
        letter: { width: 215.9, height: 279.4 },
      };

      const orientation = values.orientation;

      // Create PDF with correct orientation
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

      // Add some spacing
      yPosition += 5;

      // Calculate image dimensions to fit the page
      const maxImgWidth = pageWidth - 20; // 10mm margins
      const maxImgHeight = pageHeight - yPosition - 15; // Leave space for footer

      // Calculate aspect ratio and fit image
      const imgAspectRatio = canvas.width / canvas.height;
      let imgWidth = maxImgWidth;
      let imgHeight = imgWidth / imgAspectRatio;

      if (imgHeight > maxImgHeight) {
        imgHeight = maxImgHeight;
        imgWidth = imgHeight * imgAspectRatio;
      }

      // Center the image horizontally
      const xPosition = (pageWidth - imgWidth) / 2;

      // Add map image
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

  return (
    <Modal
      title="Export Map"
      open={isOpen}
      onCancel={() => dispatch(togglePrintModal())}
      footer={null}
      width="90vw"
      style={{ maxWidth: "1400px" }}
      bodyStyle={{ padding: "24px", maxHeight: "80vh", overflow: "hidden" }}
      centered
      destroyOnClose
    >
      <div className="print-modal-container">
        {/* Settings Panel */}
        <div className="print-settings-section">
          <h3
            style={{
              marginBottom: "16px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#262626",
            }}
          >
            Print Settings
          </h3>

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
            <Form.Item name="title" label="Map Title">
              <Input
                placeholder="Enter map title (optional)"
                maxLength={50}
                allowClear
              />
            </Form.Item>

            <Divider style={{ margin: "16px 0" }} />

            <Form.Item
              name="format"
              label="Paper Size"
              rules={[{ required: true, message: "Please select paper size" }]}
            >
              <Select>
                <Option value="a4">A4 (210 × 297 mm)</Option>
                <Option value="a3">A3 (297 × 420 mm)</Option>
                <Option value="letter">Letter (8.5 × 11 in)</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="orientation"
              label="Orientation"
              rules={[{ required: true, message: "Please select orientation" }]}
            >
              <Select>
                <Option value="landscape">Landscape</Option>
                <Option value="portrait">Portrait</Option>
              </Select>
            </Form.Item>

            <Divider style={{ margin: "16px 0" }} />

            <Form.Item
              name="showFooter"
              label="Show Footer"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="showLegend"
              label="Include Legend"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Divider style={{ margin: "16px 0" }} />

            <Form.Item>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                >
                  {loading ? "Exporting..." : "Export PDF"}
                </Button>
                <Button
                  onClick={() => dispatch(togglePrintModal())}
                  block
                  size="large"
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>

        {/* Preview Panel */}
        <div className="print-preview-section">
          <h3
            style={{
              marginBottom: "16px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#262626",
            }}
          >
            Preview
          </h3>
          <Spin spinning={loading} tip="Exporting...">
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                padding: "16px",
                minHeight: "400px",
                overflow: "auto",
              }}
              ref={mapContainerRef}
            >
              <PrintPreviewMap
                mapSettings={mapSettings}
                title={formValues.title}
                paperSize={formValues.format}
                orientation={formValues.orientation}
              />
            </div>
          </Spin>
        </div>
      </div>
    </Modal>
  );
};

export default PrintControl;
