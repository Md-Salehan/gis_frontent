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
  Alert,
  Progress,
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

  const [loading, setLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState("");
  const [form] = Form.useForm();
  const previewMapRef = useRef(null);
  const previewContainerRef = useRef(null);
  const [presetValue, setPresetValue] = useState(undefined);
  const [memoryWarning, setMemoryWarning] = useState(false);

  const [formValues, setFormValues] = useState({
    format: "a4",
    orientation: "landscape",
    title: "",
    footerText: `Generated on ${new Date().toLocaleDateString()} | GIS Dashboard`,
    showLegend: false,
    mapScale: "250000",
    resolution: "high",
  });

  const debouncedMapScale = useDebounced(
    formValues.mapScale,
    presetValue ? 0 : 300
  );

  // Calculate optimal scale based on format and resolution
  // Calculate optimal scale based on format and resolution
  const getOptimalScale = useCallback((format, resolution) => {
    const resolutionScale = {
      standard: 1.5,
      high: 2,
      ultra: 3,
    };

    const formatMultiplier = {
      a0: 1.0,
      a1: 1.0,
      a2: 1.0,
      a3: 1.0,
      a4: 1.0,
      letter: 1.0,
    };

    const baseScale = resolutionScale[resolution] || 2;
    const multiplier = formatMultiplier[format] || 1.0;
    const calculatedScale = baseScale * multiplier;

    // Cap to avoid memory issues, but ensure minimum quality
    // Lower scale for better performance
    return Math.min(Math.max(calculatedScale, 1), 3);
  }, []);

  const handleResetForm = () => {
    form.resetFields();
    setFormValues({
      format: "a4",
      orientation: "landscape",
      title: "",
      footerText: `Generated on ${new Date().toLocaleDateString()} | GIS Dashboard`,
      showLegend: false,
      mapScale: "250000",
      resolution: "high",
    });
    setPresetValue(undefined);
    setMemoryWarning(false);
    setExportProgress(0);
    setExportStage("");
  };

  const handleFormChange = (changedValues, allValues) => {
    // Warn about memory for ultra resolution on large formats
    if (
      changedValues.resolution === "ultra" &&
      (allValues.format === "a0" || allValues.format === "a1")
    ) {
      setMemoryWarning(true);
    } else if (memoryWarning) {
      setMemoryWarning(false);
    }

    setFormValues(allValues);
  };

  // Wait for map tiles to load completely
  // Wait for map tiles to load completely
  const waitForTilesToLoad = useCallback((mapElement) => {
    return new Promise((resolve, reject) => {
      if (!mapElement) {
        resolve(); // Just resolve if no element found
        return;
      }

      let attempts = 0;
      const maxAttempts = 40; // 8 seconds at 200ms intervals

      const checkTiles = () => {
        attempts++;
        const tileImages = mapElement.querySelectorAll("img.leaflet-tile");
        const totalTiles = tileImages.length;

        if (totalTiles === 0 && attempts < 5) {
          // If no tiles after a few attempts, might be a small map
          setTimeout(checkTiles, 200);
          return;
        }

        const loadedTiles = Array.from(tileImages).filter(
          (img) => img.complete && img.naturalHeight > 0
        ).length;

        const progress =
          totalTiles > 0 ? Math.round((loadedTiles / totalTiles) * 100) : 100;
        setExportProgress(progress);
        setExportStage(`Loading tiles (${progress}%)`);

        if (loadedTiles >= totalTiles * 0.85 || attempts >= maxAttempts) {
          console.log(`Tile loading: ${loadedTiles}/${totalTiles} loaded`);
          resolve();
        } else {
          setTimeout(checkTiles, 200);
        }
      };

      // Start checking
      setTimeout(checkTiles, 300);
    });
  }, []);

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
      // Ensure it's a valid number
      const num = parseInt(match[1], 10);
      return isNaN(num) ? null : num.toString();
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
      a0: { width: 841, height: 1189 },
      a1: { width: 594, height: 841 },
      a2: { width: 420, height: 594 },
      a3: { width: 297, height: 420 },
      a4: { width: 210, height: 297 },
      letter: { width: 215.9, height: 279.4 },
    };

    let dims = formatDimensions[formValues.format] || formatDimensions.a4;

    if (formValues.orientation === "portrait") {
      if (dims.width > dims.height) {
        [dims.width, dims.height] = [dims.height, dims.width];
      }
    } else {
      if (dims.width < dims.height) {
        [dims.width, dims.height] = [dims.height, dims.width];
      }
    }

    // Preview scale (smaller for UI)
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
    widthPx = Math.round(widthPx * clampScale);
    heightPx = Math.round(heightPx * clampScale);

    return {
      widthPx,
      heightPx,
      aspectRatio: dims.width / dims.height,
    };
  }, [formValues.format, formValues.orientation]);

  const handleExportPDF = async (values) => {
    let canvas = null;
    const progressKey = "exportProgress";

    try {
      setLoading(true);
      setExportProgress(0);
      setExportStage("Preparing export...");

      message.loading({
        content: "Preparing high-resolution export...",
        key: progressKey,
        duration: 0,
      });

      // Wait for map to fully render
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mapElement =
        previewContainerRef.current?.querySelector(".leaflet-container");
      if (!mapElement) {
        message.error("Map preview not found");
        return;
      }

      // Step 1: Load all tiles
      setExportStage("Loading map tiles...");
      try {
        await waitForTilesToLoad(mapElement);
      } catch (tileError) {
        console.warn("Tile loading warning:", tileError);
      }

      // Step 2: Calculate optimized scale based on format
      const formatScaleMap = {
        a4: { standard: 2, high: 3, ultra: 4 },
        a3: { standard: 2.5, high: 3.5, ultra: 4.5 },
        a2: { standard: 3, high: 4, ultra: 5 },
        a1: { standard: 3.5, high: 4.5, ultra: 5.5 },
        a0: { standard: 4, high: 5, ultra: 6 },
        letter: { standard: 2, high: 3, ultra: 4 },
      };

      const optimalScale =
        formatScaleMap[values.format]?.[values.resolution] || 3;
      console.log(
        `Exporting at scale: ${optimalScale}x for ${values.format} (${values.resolution})`
      );

      // Step 3: Capture high-resolution canvas
      setExportStage("Rendering high-resolution image...");
      setExportProgress(50);

      // Get the exact map container dimensions
      const mapContainer = mapElement.querySelector(
        ".leaflet-pane.leaflet-map-pane"
      );
      const mapWidth = mapContainer?.offsetWidth || mapElement.offsetWidth;
      const mapHeight = mapContainer?.offsetHeight || mapElement.offsetHeight;

      // Calculate canvas dimensions with scale
      const canvasWidth = Math.round(mapWidth * optimalScale);
      const canvasHeight = Math.round(mapHeight * optimalScale);

      console.log("Canvas dimensions:", {
        canvasWidth,
        canvasHeight,
        mapWidth,
        mapHeight,
        optimalScale,
      });

      canvas = await html2canvas(mapElement, {
        backgroundColor: "#ffffff",
        scale: optimalScale * (window.devicePixelRatio || 1),
        useCORS: true,
        logging: false,
        allowTaint: false,
        removeContainer: false,
        imageTimeout: 30000,
        foreignObjectRendering: false,
        width: canvasWidth,
        height: canvasHeight,
        windowWidth: canvasWidth,
        windowHeight: canvasHeight,

        // Optimize for quality
        onclone: (clonedDoc) => {
          // Force high quality rendering on clone
          const clonedMap = clonedDoc.querySelector(".leaflet-container");
          if (clonedMap) {
            clonedMap.style.imageRendering = "crisp-edges";
            clonedMap.style.imageRendering = "pixelated";
          }
        },

        onprogress: (progress) => {
          const percent = Math.round(progress * 100);
          setExportProgress(50 + percent / 2);
          setExportStage(`Rendering: ${percent}%`);
        },
      });

      setExportStage("Generating PDF...");
      setExportProgress(90);

      // Step 4: Create PDF with optimized image placement
      const orientation = values.orientation;
      const pdf = new jsPDF({
        orientation,
        unit: "mm",
        format: values.format.toUpperCase(),
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      let yPosition = 0;

      // Add title if provided (smaller to maximize map space)
      if (values.title) {
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(values.title, pageWidth / 2, 10, { align: "center" });
        yPosition = 12; // Minimal space for title
      }

      // Add scale if provided (positioned in top-right)
      if (values.mapScale) {
        pdf.setFontSize(9);
        const formattedScale = formatScaleValue(values.mapScale);
        pdf.text(`Scale: ${formattedScale}`, pageWidth - 15, 8, {
          align: "right",
        });
      }

      // Calculate maximum image dimensions to fill page
      const titleHeight = values.title ? 12 : 0;
      const footerHeight = values.footerText ? 10 : 0;
      const maxImgHeight = pageHeight - titleHeight - footerHeight - 5; // 5mm buffer
      const maxImgWidth = pageWidth - 10; // 5mm margins on each side

      const imgAspectRatio = canvas.width / canvas.height;

      // Calculate dimensions to maximize map area
      let imgWidth = maxImgWidth;
      let imgHeight = imgWidth / imgAspectRatio;

      // If height exceeds available space, scale down
      if (imgHeight > maxImgHeight) {
        imgHeight = maxImgHeight;
        imgWidth = imgHeight * imgAspectRatio;
      }

      // Center the image horizontally
      const xPosition = (pageWidth - imgWidth) / 2;

      // Position image right after title
      const imgYPosition = titleHeight + 5;

      // Convert canvas to high-quality PNG
      let mapImgData;
      try {
        mapImgData = canvas.toDataURL("image/png", 1.0);
      } catch (pngError) {
        mapImgData = canvas.toDataURL("image/jpeg", 1.0);
      }

      // Add image to PDF - fill available space
      try {
        pdf.addImage(
          mapImgData,
          "PNG",
          xPosition,
          imgYPosition,
          imgWidth,
          imgHeight,
          undefined,
          "FAST"
        );
      } catch (addImageError) {
        console.error("Error adding image to PDF:", addImageError);
        pdf.addImage(
          mapImgData,
          "PNG",
          xPosition,
          imgYPosition,
          imgWidth,
          imgHeight
        );
      }

      // Add footer at bottom
      if (values.footerText) {
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(values.footerText, pageWidth / 2, pageHeight - 5, {
          align: "center",
        });
      }

      // Generate filename
      const fileName = values.title
        ? `${values.title.replace(/[^\w\s]/gi, "_")}_export.pdf`
        : `map_export_${Date.now()}.pdf`;

      // Clean up canvas to free memory
      if (canvas) {
        try {
          canvas.width = 0;
          canvas.height = 0;
          canvas = null;
        } catch (cleanupError) {
          console.warn("Canvas cleanup error:", cleanupError);
        }
      }

      // Save PDF
      pdf.save(fileName);

      message.success({
        content: `Map exported successfully! (${values.resolution} quality)`,
        key: progressKey,
        duration: 3,
      });

      dispatch(togglePrintModal());
      handleResetForm();
    } catch (error) {
      console.error("Export error:", error);
      message.error({
        content: `Export failed: ${error.message || "Unknown error"}`,
        key: progressKey,
        duration: 5,
      });

      // Clean up on error
      if (canvas) {
        try {
          canvas.width = 0;
          canvas.height = 0;
        } catch (cleanupError) {
          console.warn("Canvas cleanup error on failure:", cleanupError);
        }
      }
    } finally {
      setLoading(false);
      setExportProgress(0);
      setExportStage("");
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
      styles={{
        body: {
          padding: "24px",
          maxHeight: "85vh",
          overflow: "hidden",
        },
      }}
      centered
      destroyOnClose
    >
      <div className="print-modal-wrapper">
        {memoryWarning && (
          <Alert
            message="Memory Warning"
            description="Ultra resolution on large formats may cause high memory usage and slower export times."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setMemoryWarning(false)}
          />
        )}

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
                resolution: "high",
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
                      popupMatchSelectWidth={false} // CHANGED FROM dropdownMatchSelectWidth
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

              {/* Resolution Settings */}
              <Form.Item
                name="resolution"
                label="Export Quality"
                tooltip="Higher quality = better resolution but larger file size"
                rules={[{ required: true }]}
              >
                <Select size="large">
                  <Option value="standard">Standard - Fast (2x scale)</Option>
                  <Option value="high">High - Print Ready (4x scale)</Option>
                  <Option value="ultra">
                    Ultra - Maximum Quality (6x scale)
                  </Option>
                </Select>
              </Form.Item>

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

              {/* Progress during export */}
              {loading && (
                <Form.Item label="Export Progress">
                  <Progress
                    percent={exportProgress}
                    status="active"
                    strokeColor={{
                      "0%": "#108ee9",
                      "100%": "#87d068",
                    }}
                  />
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "#666",
                      textAlign: "center",
                    }}
                  >
                    {exportStage}
                  </div>
                </Form.Item>
              )}

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
                    {loading ? "Exporting..." : "Export High-Res PDF"}
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
              <Spin
                spinning={loading}
                tip="Rendering high-res preview..."
                size="large"
              >
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
                  className="print-optimized print-preview-container"
                >
                  {/* Title in Preview */}
                  {formValues.title && (
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
                  )}

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
                      width: "100%",
                      height: formValues.title
                        ? "calc(100% - 80px)"
                        : "calc(100% - 40px)",
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
              | {formValues.format.toUpperCase()} |{" "}
              {debouncedMapScale
                ? ` Scale: ${formatScaleValue(debouncedMapScale)} | `
                : ""}
              {formValues.resolution.toUpperCase()} Quality
            </div>
          </Col>
        </Row>
      </div>
    </Modal>
  );
};

export default PrintControl;
