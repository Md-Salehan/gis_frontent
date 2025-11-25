import React, { useCallback, useMemo, useRef, useState } from "react";

import CustomDrawer from "../common/CustomDrawer";
import { useDispatch, useSelector } from "react-redux";
import { toggleBuffer } from "../../store/slices/uiSlice";
import BufferTool from "./BufferTool";
import { Space } from "antd";
import AttributeTable from "./AttributeTable";
import { Row, Col, Card, Divider } from "antd";

function BufferToolDrawer() {
  const dispatch = useDispatch();
  const isOpen = useSelector((s) => s.ui.isBufferOpen);

  return (
    <CustomDrawer
      title="Buffer Tool"
      placement="bottom"
      onClose={() => dispatch(toggleBuffer())}
      open={isOpen}
      height={"45vh"}
      // render inline so children keep react-leaflet context (useMap) when placed inside drawer
      getContainer={false}
      mask={false}
      afterOpenChange={(open) => {
        if (!open) {
          // keep created buffers (user can clear), but no state reset required
        }
      }}
    >
      {isOpen && (
        <Row gutter={12} style={{ height: "100%" }}>
          <Col
            xs={24}
            sm={10}
            md={8}
            lg={7}
            style={{ minWidth: 260, height: "100%" }}
          >
            <Card
              size="small"
              style={{ height: "100%" }}
              //   title="Buffer"
              bodyStyle={{ height: "100%", padding: 12, overflow: "auto" }}
            >
              <BufferTool />
            </Card>
          </Col>

          <Col
            xs={24}
            sm={14}
            md={16}
            lg={17}
            style={{ minWidth: 320, height: "100%" }} /* added height */
          >
            <Card
              size="small"
              style={{ height: "100%" }}
              //   title="Attributes"
              bodyStyle={{ height: "100%", padding: 12, overflow: "auto" }}
            >
              <AttributeTable csvDownloader={false} clearDataOnTabChange={false} />
            </Card>
          </Col>
        </Row>
      )}
    </CustomDrawer>
  );
}

export default BufferToolDrawer;
