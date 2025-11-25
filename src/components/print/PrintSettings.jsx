import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  Select,
  Button,
  Space,
  Divider,
  Switch,
  InputNumber,
  message,
  Spin,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { togglePrintModal } from "../../store/slices/uiSlice";
import { setPrintSettings } from "../../store/slices/printSlice";

const { Option } = Select;

// FIXED: Improved wait function with better logging
const waitForPreviewReady = async (timeoutMs = 6000, intervalMs = 250) => {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const el = document.getElementById("print-preview-content");
      if (el && el.dataset.mapReady === "true") {
        console.log("✓ Preview map ready after", Date.now() - start, "ms");
        return resolve(true);
      }
      if (Date.now() - start > timeoutMs) {
        console.warn(
          "⚠ Preview map ready timeout after",
          timeoutMs,
          "ms, proceeding anyway"
        );
        return resolve(false);
      }
      setTimeout(check, intervalMs);
    };
    check();
  });
};

const PrintSettings = ({ loading, setLoading }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const printSettings = useSelector((state) => state.print);
  const [exportProgress, setExportProgress] = useState("");

  useEffect(() => {
    form.setFieldsValue(printSettings);
  }, [printSettings, form]);

  const handleSettingsChange = (changedValues) => {
    dispatch(setPrintSettings(changedValues));
  };

  // FIXED: Improved export function with better error handling
  const handlePrint = async () => {
    try {
      setLoading(true);
      setExportProgress("Waiting for map to load...");

      // Wait for preview map to be ready
      const ready = await waitForPreviewReady(6000, 250);
      if (!ready) {
        message.warn(
          "Map not fully loaded. Export will proceed with current view."
        );
      }

      setExportProgress("Capturing preview...");

      const previewElement = document.getElementById("print-preview-content");
      if (!previewElement) {
        message.error("❌ Preview element not found. Please try again.");
        setExportProgress("");
        setLoading(false);
        return;
      }

      console.log("Preview element found:", previewElement);

      // FIXED: Better html2canvas options
      const canvas = await html2canvas(previewElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowHeight: previewElement.scrollHeight,
        windowWidth: previewElement.scrollWidth,
        imageTimeout: 3000,
        removeContainer: true,
      });

      if (!canvas) {
        message.error("❌ Failed to capture preview canvas.");
        setExportProgress("");
        setLoading(false);
        return;
      }

      console.log("Canvas created:", canvas.width, "x", canvas.height);

      const imgData = canvas.toDataURL("image/png");
      if (!imgData || imgData.length === 0) {
        message.error("❌ Failed to convert canvas to image.");
        setExportProgress("");
        setLoading(false);
        return;
      }

      const orientation =
        printSettings.orientation === "landscape" ? "landscape" : "portrait";

      // PNG Export
      if (printSettings.fileFormat === "png") {
        setExportProgress("Generating PNG...");
        try {
          const link = document.createElement("a");
          link.href = imgData;
          link.download = `map-print-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          message.success("✓ PNG exported successfully!");
          console.log("PNG exported");
          setTimeout(() => dispatch(togglePrintModal()), 500);
        } catch (err) {
          console.error("PNG export error:", err);
          message.error("Failed to export PNG: " + err.message);
        } finally {
          setExportProgress("");
          setLoading(false);
        }
        return;
      }

      // PDF Export
      setExportProgress("Generating PDF...");
      try {
        const pdf = new jsPDF({
          orientation: orientation === "landscape" ? "l" : "p",
          unit: "mm",
          format: printSettings.paperSize.toUpperCase(),
          compress: true,
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Calculate image dimensions
        const margin = 5;
        const maxImgWidth = pdfWidth - margin * 2;
        const imgRatio = canvas.width / canvas.height;
        let imgHeight = maxImgWidth / imgRatio;
        let drawY = margin;

        // Add title space if exists
        if (printSettings.title && printSettings.title.trim()) {
          drawY += 10;
        }

        // Scale if too tall
        const availableHeight = pdfHeight - drawY - 15;
        if (imgHeight > availableHeight) {
          imgHeight = availableHeight;
        }

        // Add image to PDF
        pdf.addImage(imgData, "PNG", margin, drawY, maxImgWidth, imgHeight);

        console.log("Image added to PDF at", drawY, "with height", imgHeight);

        // Add metadata
        pdf.setFontSize(9);
        const metaY = drawY + imgHeight + 5;
        const metadata = `Scale: ${printSettings.scale} • Zoom: ${printSettings.zoomLevel}`;
        pdf.text(metadata, pdfWidth / 2, metaY, { align: "center" });

        // Add footer
        if (printSettings.footer && printSettings.footer.trim()) {
          pdf.setFontSize(10);
          pdf.text(printSettings.footer, pdfWidth / 2, pdfHeight - 10, {
            align: "center",
          });
        }

        // Add timestamp
        pdf.setFontSize(8);
        const timestamp = new Date().toLocaleString();
        pdf.text(`Generated: ${timestamp}`, margin, pdfHeight - 8);

        // Save PDF
        const filename = `map-print-${Date.now()}.pdf`;
        pdf.save(filename);
        message.success("✓ PDF exported successfully!");
        console.log("PDF saved:", filename);

        setTimeout(() => dispatch(togglePrintModal()), 500);
      } catch (err) {
        console.error("PDF generation error:", err);
        message.error("Failed to generate PDF: " + err.message);
      } finally {
        setExportProgress("");
        setLoading(false);
      }
    } catch (err) {
      console.error("Export error:", err);
      message.error("❌ Export failed: " + err.message);
      setExportProgress("");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "35%",
        paddingRight: "24px",
        borderRight: "1px solid #e8e8e8",
        overflowY: "auto",
        overflowX: "hidden",
        maxHeight: "100%",
      }}
    >
      <h3 style={{ marginTop: 0 }}>Print Settings</h3>

      {exportProgress && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px",
            backgroundColor: "#f0f9ff",
            borderLeft: "4px solid #3b82f6",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Spin size="small" />
          <span style={{ fontSize: "12px", color: "#1e40af" }}>
            {exportProgress}
          </span>
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleSettingsChange}
        initialValues={printSettings}
      >
        <Form.Item name="title" label="Map Title">
          <Input
            placeholder="Enter map title (optional)"
            maxLength={100}
            disabled={loading}
          />
        </Form.Item>

        <Form.Item name="footer" label="Footer">
          <Input
            placeholder="Enter footer (optional)"
            maxLength={200}
            disabled={loading}
          />
        </Form.Item>

        <Divider style={{ margin: "12px 0" }} />

        <Form.Item name="zoomLevel" label="Zoom Level">
          <InputNumber
            min={1}
            max={20}
            style={{ width: "100%" }}
            disabled={loading}
          />
        </Form.Item>

        <Form.Item name="scale" label="Scale">
          <Select disabled={loading}>
            <Option value="1:5000">1:5000</Option>
            <Option value="1:10000">1:10000</Option>
            <Option value="1:50000">1:50000</Option>
            <Option value="1:100000">1:100000</Option>
            <Option value="1:250000">1:250000</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="includeLegend"
          label="Include Legend"
          valuePropName="checked"
        >
          <Switch disabled={loading} />
        </Form.Item>

        <Divider style={{ margin: "12px 0" }} />

        <Form.Item name="paperSize" label="Paper Size">
          <Select disabled={loading}>
            <Option value="a4">A4 (210 × 297 mm)</Option>
            <Option value="a3">A3 (297 × 420 mm)</Option>
            <Option value="letter">Letter (8.5 × 11 in)</Option>
          </Select>
        </Form.Item>

        <Form.Item name="orientation" label="Orientation">
          <Select disabled={loading}>
            <Option value="landscape">Landscape</Option>
            <Option value="portrait">Portrait</Option>
          </Select>
        </Form.Item>

        <Form.Item name="fileFormat" label="File Format">
          <Select disabled={loading}>
            <Option value="pdf">PDF</Option>
            <Option value="png">PNG</Option>
          </Select>
        </Form.Item>

        <Divider style={{ margin: "12px 0" }} />

        <Form.Item>
          <Space style={{ width: "100%" }}>
            <Button
              type="primary"
              onClick={handlePrint}
              loading={loading}
              block
              size="large"
              disabled={loading}
            >
              {loading ? "Exporting..." : "Export Map"}
            </Button>
            <Button
              onClick={() => dispatch(togglePrintModal())}
              block
              size="large"
              disabled={loading}
            >
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default PrintSettings;
