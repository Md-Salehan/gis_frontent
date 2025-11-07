import React, { useState } from 'react';
import { Modal, Form, Select, Button, Space, message, Input } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { togglePrintModal } from '../../store/slices/uiSlice';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const { Option } = Select;

const PrintControl = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.ui.isPrintModalOpen);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handlePrint = async (values) => {
    try {
      setLoading(true);
      
      // Wait for tiles to load completely
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mapElement = document.querySelector('.leaflet-container');
      if (!mapElement) {
        throw new Error('Map element not found');
      }

      // Get map dimensions
      const mapWidth = mapElement.offsetWidth;
      const mapHeight = mapElement.offsetHeight;

      // Configure html2canvas options
      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
        scrollX: 0,
        scrollY: 0,
        width: mapWidth,
        height: mapHeight,
        scale: 2, // Increase quality
        logging: false,
        removeContainer: true,
        imageTimeout: 15000,
        onclone: (document) => {
          // Fix tile loading issues
          const clonedMap = document.querySelector('.leaflet-container');
          if (clonedMap) {
            clonedMap.style.width = `${mapWidth}px`;
            clonedMap.style.height = `${mapHeight}px`;
          }
        }
      });

      // Create PDF with selected format
      const { format, orientation, title } = values;
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: format,
      });

      // Add title if provided
      if (title) {
        pdf.setFontSize(16);
        pdf.text(title, 14, 15);
        pdf.setFontSize(12);
      }

      // Calculate dimensions to fit the page while maintaining aspect ratio
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Leave margin for title and other elements
      const marginTop = title ? 25 : 10;
      const marginSides = 10;
      
      const availableWidth = pageWidth - (marginSides * 2);
      const availableHeight = pageHeight - marginTop - marginSides;

      // Calculate image dimensions maintaining aspect ratio
      const imageAspectRatio = canvas.width / canvas.height;
      let imgWidth = availableWidth;
      let imgHeight = imgWidth / imageAspectRatio;

      // If image height exceeds available height, scale down
      if (imgHeight > availableHeight) {
        imgHeight = availableHeight;
        imgWidth = imgHeight * imageAspectRatio;
      }

      // Center the image horizontally
      const xOffset = (pageWidth - imgWidth) / 2;

      // Add the map image
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 1.0),
        'JPEG',
        xOffset,
        marginTop,
        imgWidth,
        imgHeight
      );

      // Add timestamp
      const timestamp = new Date().toLocaleString();
      pdf.setFontSize(8);
      pdf.text(`Generated: ${timestamp}`, marginSides, pageHeight - 5);

      // Save the PDF
      pdf.save(title ? `${title}.pdf` : 'map-export.pdf');
      
      message.success('Map exported successfully!');
      dispatch(togglePrintModal());
    } catch (error) {
      console.error('Print error:', error);
      message.error('Failed to export map');
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
          format: 'a4',
          orientation: 'landscape',
          title: '',
        }}
      >
        <Form.Item
          name="title"
          label="Map Title"
        >
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
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
            >
              Export PDF
            </Button>
            <Button onClick={() => dispatch(togglePrintModal())}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PrintControl;