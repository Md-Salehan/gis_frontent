import React, { useState } from "react";
import { Modal, Form, Select, Button, Space, message, Input } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { togglePrintModal } from "../../store/slices/uiSlice";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useMap } from "react-leaflet";

const { Option } = Select;

const PrintControl = () => {
  const dispatch = useDispatch();
  const map = useMap();
  const isOpen = useSelector((state) => state.ui.isPrintModalOpen);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const waitForTilesLoading = () => {
    return new Promise((resolve) => {
      const container = document.querySelector(".leaflet-container");
      if (!container) {
        resolve();
        return;
      }

      const tilesLoading = container.querySelectorAll(
        ".leaflet-tile-loading"
      ).length;

      if (tilesLoading === 0) {
        resolve();
        return;
      }

      const checkTiles = setInterval(() => {
        const remainingTiles = container.querySelectorAll(
          ".leaflet-tile-loading"
        ).length;
        if (remainingTiles === 0) {
          clearInterval(checkTiles);
          resolve();
        }
      }, 250);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkTiles);
        resolve();
      }, 10000);
    });
  };

  const waitForVectorLayers = () => {
    return new Promise((resolve) => {
      // Wait for any vector layer animations or rendering
      setTimeout(resolve, 500);
    });
  };

  const handlePrint = async (values) => {
    try {
      setLoading(true);

      // Force a re-render and wait for map to stabilize
      map.invalidateSize();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Wait for tiles to load
      await waitForTilesLoading();

      // Wait for vector layers to render
      await waitForVectorLayers();

      // Additional delay to ensure complete rendering
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mapElement = document.querySelector(".leaflet-container");
      if (!mapElement) throw new Error("Map element not found");

      // Store original styles - ONLY store what we modify
      const originalStyles = {
        controls: [],
        mapVisibility: mapElement.style.visibility || "",
        mapDisplay: mapElement.style.display || "",
        mapOpacity: mapElement.style.opacity || "",
        mapBackground: mapElement.style.background || ""
      };

      // Hide controls temporarily
      const controls = mapElement.querySelectorAll(".leaflet-control");
      controls.forEach((control) => {
        originalStyles.controls.push({
          element: control,
          display: control.style.display || ""
        });
        control.style.display = "none";
      });

      // Store and modify vector layer styles
      const vectorLayers = mapElement.querySelectorAll(".leaflet-interactive, .leaflet-layer, path");
      const vectorLayerStyles = [];
      vectorLayers.forEach((layer) => {
        vectorLayerStyles.push({
          element: layer,
          visibility: layer.style.visibility || "",
          opacity: layer.style.opacity || "",
          display: layer.style.display || "",
          fillOpacity: layer.style.fillOpacity || "",
          strokeOpacity: layer.style.strokeOpacity || ""
        });
        
        layer.style.visibility = "visible";
        layer.style.opacity = "1";
        layer.style.display = "block";
        if (layer.style.fillOpacity !== undefined) layer.style.fillOpacity = "1";
        if (layer.style.strokeOpacity !== undefined) layer.style.strokeOpacity = "1";
      });

      // Store and modify canvas layer styles
      const canvasLayers = mapElement.querySelectorAll("canvas");
      const canvasLayerStyles = [];
      canvasLayers.forEach((canvas) => {
        canvasLayerStyles.push({
          element: canvas,
          visibility: canvas.style.visibility || "",
          opacity: canvas.style.opacity || "",
          display: canvas.style.display || ""
        });
        
        canvas.style.visibility = "visible";
        canvas.style.opacity = "1";
        canvas.style.display = "block";
      });

      // Store and modify tile styles
      const tiles = mapElement.querySelectorAll(".leaflet-tile");
      const tileStyles = [];
      tiles.forEach((tile) => {
        tileStyles.push({
          element: tile,
          visibility: tile.style.visibility || "",
          opacity: tile.style.opacity || "",
          display: tile.style.display || ""
        });
        
        tile.style.visibility = "visible";
        tile.style.opacity = "1";
        tile.style.display = "block";
      });

      // Ensure map container is fully visible
      mapElement.style.visibility = "visible";
      mapElement.style.display = "block";
      mapElement.style.opacity = "1";
      mapElement.style.background = "#ffffff";

      // Add a small delay to ensure styles are applied before capture
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capture the map with improved settings for vector layers
      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        imageTimeout: 20000,
        removeContainer: true,
        ignoreElements: (element) => {
          // Don't ignore any elements - capture everything
          return false;
        },
        onclone: (clonedDoc, element) => {
          const clonedMap = clonedDoc.querySelector(".leaflet-container");
          if (clonedMap) {
            // Ensure cloned map is fully visible
            clonedMap.style.visibility = "visible";
            clonedMap.style.display = "block";
            clonedMap.style.opacity = "1";
            clonedMap.style.background = "#ffffff";

            // Hide controls in cloned document
            const clonedControls = clonedMap.querySelectorAll(".leaflet-control");
            clonedControls.forEach((control) => {
              control.style.display = "none";
            });

            // Ensure tiles are visible in clone
            const clonedTiles = clonedMap.querySelectorAll(".leaflet-tile");
            clonedTiles.forEach((tile) => {
              tile.style.visibility = "visible";
              tile.style.opacity = "1";
              tile.style.display = "block";
            });

            // Ensure vector layers are visible in clone
            const clonedVectorLayers = clonedMap.querySelectorAll(".leaflet-interactive, .leaflet-layer, path");
            clonedVectorLayers.forEach((layer) => {
              layer.style.visibility = "visible";
              layer.style.opacity = "1";
              layer.style.display = "block";
              if (layer.style.fillOpacity !== undefined) layer.style.fillOpacity = "1";
              if (layer.style.strokeOpacity !== undefined) layer.style.strokeOpacity = "1";
            });

            // Ensure canvas layers are visible in clone
            const clonedCanvasLayers = clonedMap.querySelectorAll("canvas");
            clonedCanvasLayers.forEach((canvas) => {
              canvas.style.visibility = "visible";
              canvas.style.opacity = "1";
              canvas.style.display = "block";
            });

            // Force a redraw of SVG elements
            const svgElements = clonedMap.querySelectorAll("svg");
            svgElements.forEach((svg) => {
              // This forces SVG re-render
              svg.style.transform = "translateZ(0)";
            });
          }
        },
      });

      // Restore original styles PROPERLY - only restore if value exists
      controls.forEach((control, index) => {
        if (originalStyles.controls[index].display !== undefined) {
          control.style.display = originalStyles.controls[index].display;
        } else {
          control.style.display = "";
        }
      });

      // Restore vector layer styles
      vectorLayerStyles.forEach((style) => {
        if (style.visibility !== undefined) style.element.style.visibility = style.visibility;
        if (style.opacity !== undefined) style.element.style.opacity = style.opacity;
        if (style.display !== undefined) style.element.style.display = style.display;
        if (style.fillOpacity !== undefined) style.element.style.fillOpacity = style.fillOpacity;
        if (style.strokeOpacity !== undefined) style.element.style.strokeOpacity = style.strokeOpacity;
      });

      // Restore canvas layer styles
      canvasLayerStyles.forEach((style) => {
        if (style.visibility !== undefined) style.element.style.visibility = style.visibility;
        if (style.opacity !== undefined) style.element.style.opacity = style.opacity;
        if (style.display !== undefined) style.element.style.display = style.display;
      });

      // Restore tile styles
      tileStyles.forEach((style) => {
        if (style.visibility !== undefined) style.element.style.visibility = style.visibility;
        if (style.opacity !== undefined) style.element.style.opacity = style.opacity;
        if (style.display !== undefined) style.element.style.display = style.display;
      });

      // Restore map container styles
      if (originalStyles.mapVisibility !== undefined) mapElement.style.visibility = originalStyles.mapVisibility;
      if (originalStyles.mapDisplay !== undefined) mapElement.style.display = originalStyles.mapDisplay;
      if (originalStyles.mapOpacity !== undefined) mapElement.style.opacity = originalStyles.mapOpacity;
      if (originalStyles.mapBackground !== undefined) mapElement.style.background = originalStyles.mapBackground;

      // Check if canvas has content
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error("Canvas is empty");
      }

      // Create PDF
      const { format, orientation, title } = values;
      const pdf = new jsPDF({
        orientation: orientation,
        unit: "mm",
        format: format,
      });

      // Add title
      if (title) {
        pdf.setFontSize(16);
        pdf.text(title, 14, 15);
      }

      // Calculate dimensions
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginTop = title ? 25 : 10;
      const marginSides = 10;

      // Calculate image dimensions
      const imageAspectRatio = canvas.width / canvas.height;
      const availableWidth = pageWidth - marginSides * 2;
      const availableHeight = pageHeight - marginTop - marginSides;

      let imgWidth = availableWidth;
      let imgHeight = imgWidth / imageAspectRatio;

      if (imgHeight > availableHeight) {
        imgHeight = availableHeight;
        imgWidth = imgHeight * imageAspectRatio;
      }

      // Center the image
      const xOffset = (pageWidth - imgWidth) / 2;

      // Add map image with higher quality
      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      pdf.addImage(
        imgData,
        "JPEG",
        xOffset,
        marginTop,
        imgWidth,
        imgHeight
      );

      // Add timestamp
      const timestamp = new Date().toLocaleString();
      pdf.setFontSize(8);
      pdf.text(`Generated: ${timestamp}`, marginSides, pageHeight - 5);

      // Save PDF
      pdf.save(title ? `${title}.pdf` : "map-export.pdf");

      message.success("Map exported successfully!");
      dispatch(togglePrintModal());
    } catch (error) {
      console.error("Print error:", error);
      message.error("Failed to export map: " + error.message);
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
      width={400}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handlePrint}
        initialValues={{
          format: "a4",
          orientation: "landscape",
          title: "",
        }}
      >
        <Form.Item name="title" label="Map Title">
          <Input placeholder="Enter map title (optional)" />
        </Form.Item>

        <Form.Item
          name="format"
          label="Paper Size"
          rules={[{ required: true }]}
        >
          <Select>
            <Option value="a4">A4</Option>
            <Option value="a3">A3</Option>
            <Option value="letter">Letter</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="orientation"
          label="Orientation"
          rules={[{ required: true }]}
        >
          <Select>
            <Option value="landscape">Landscape</Option>
            <Option value="portrait">Portrait</Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Export PDF
            </Button>
            <Button onClick={() => dispatch(togglePrintModal())}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PrintControl;