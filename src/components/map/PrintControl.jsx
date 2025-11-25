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
        // onFinish={handlePrint}
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