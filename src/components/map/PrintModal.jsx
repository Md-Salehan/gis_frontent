import React from "react";
import { Modal, Form, Input, Select, Button } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { togglePrintModal } from "../../store/slices/uiSlice";
import { setPrintSettings } from "../../store/slices/printSlice";

const PrintModal = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const isPrintModalOpen = useSelector((state) => state.ui.isPrintModalOpen);
  const printSettings = useSelector((state) => state.print);

  const handleCancel = () => {
    dispatch(togglePrintModal());
  };

  const handlePrint = () => {
    form
      .validateFields()
      .then((values) => {
        // Save settings to Redux
        dispatch(setPrintSettings(values));

        // Trigger print via window function
        if (window.triggerMapPrint) {
          window.triggerMapPrint(values.title, values.footer);
        }

        // Close modal after print dialog opens
        setTimeout(() => {
          dispatch(togglePrintModal());
        }, 500);
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };

  return (
    <Modal
      title="Print Map"
      open={isPrintModalOpen}
      onCancel={handleCancel}
      width={500}
      footer={[
        <Button key="back" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handlePrint}>
          Print
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" initialValues={printSettings}>
        <Form.Item label="Map Title" name="title">
          <Input placeholder="e.g., District Map 2025" />
        </Form.Item>

        <Form.Item label="Footer Text" name="footer">
          <Input placeholder="e.g., © 2025 GIS Department" />
        </Form.Item>

        <Form.Item label="Paper Size" name="paperSize" initialValue="a4">
          <Select
            options={[
              { label: "A4", value: "a4" },
              { label: "A3", value: "a3" },
              { label: "Letter", value: "letter" },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="Orientation"
          name="orientation"
          initialValue="landscape"
        >
          <Select
            options={[
              { label: "Portrait", value: "portrait" },
              { label: "Landscape", value: "landscape" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PrintModal;
