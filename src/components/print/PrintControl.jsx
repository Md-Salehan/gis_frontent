import React, { useState } from "react";
import { Modal } from "antd";
import { useDispatch, useSelector } from "react-redux";
import PrintSettings from "./PrintSettings";
import PrintPreview from "./PrintPreview";
import { togglePrintModal } from "../../store/slices/uiSlice";

const PrintControl = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.ui.isPrintModalOpen);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    dispatch(togglePrintModal());
  };

  return (
    <Modal
      title="Map Print"
      open={isOpen}
      onCancel={handleClose}
      footer={null}
      width="95vw"
      centered
      bodyStyle={{
        height: "85vh",
        padding: "24px",
        display: "flex",
        flexDirection: "row",
        gap: "0px",
      }}
      wrapClassName="print-modal-wrapper"
      style={{
        maxWidth: "1600px",
      }}
    >
      <PrintSettings loading={loading} setLoading={setLoading} />
      <PrintPreview />
    </Modal>
  );
};

export default PrintControl;
