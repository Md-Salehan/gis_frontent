import React, { useState } from 'react';
import { Modal, Form, Select, Button, Space, message } from 'antd';
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
      const mapElement = document.querySelector('.leaflet-container');
      
      if (!mapElement) {
        throw new Error('Map element not found');
      }

      // Capture the map
      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
      });

      // Create PDF with selected format
      const { format, orientation } = values;
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: format,
      });

      // Calculate dimensions to fit the page while maintaining aspect ratio
      const imgWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add the map image
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 1.0),
        'JPEG',
        0,
        0,
        imgWidth,
        imgHeight
      );

      // Save the PDF
      pdf.save('map-export.pdf');
      
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
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handlePrint}
        initialValues={{
          format: 'a4',
          orientation: 'landscape',
        }}
      >
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