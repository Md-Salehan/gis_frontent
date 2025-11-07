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

  const handlePrint = async (values) => {
    try {
      setLoading(true);

      // Force a re-render and wait for map to stabilize
      map.invalidateSize();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Wait for tiles to load
      await waitForTilesLoading();

      // Additional delay to ensure complete rendering
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mapElement = document.querySelector(".leaflet-container");
      if (!mapElement) throw new Error("Map element not found");

      // Store original styles
      const originalStyles = {
        controls: [],
        mapContainer: mapElement.style.cssText,
        mapVisibility: mapElement.style.visibility,
        mapDisplay: mapElement.style.display
      };

      // Hide controls temporarily
      const controls = mapElement.querySelectorAll(".leaflet-control");
      controls.forEach((control) => {
        originalStyles.controls.push({
          element: control,
          display: control.style.display
        });
        control.style.display = "none";
      });

      // Ensure map container is fully visible
      mapElement.style.visibility = "visible";
      mapElement.style.display = "block";

      // Force tiles to be visible and loaded
      const tiles = mapElement.querySelectorAll(".leaflet-tile");
      tiles.forEach((tile) => {
        tile.style.visibility = "visible";
        tile.style.opacity = "1";
      });

      // Capture the map with improved settings
      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        imageTimeout: 15000,
        removeContainer: true,
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
          }
        },
      });

      // Restore original styles
      controls.forEach((control, index) => {
        control.style.display = originalStyles.controls[index].display;
      });
      mapElement.style.cssText = originalStyles.mapContainer;
      mapElement.style.visibility = originalStyles.mapVisibility;
      mapElement.style.display = originalStyles.mapDisplay;

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