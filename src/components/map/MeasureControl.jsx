// ...existing code...
import React from "react";
import { Drawer, Select, Space, Typography, Divider, Button, Tooltip } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { toggleMeasure } from "../../store/slices/uiSlice";
import { setMeasureType, setMeasureUnit } from "../../store/slices/mapSlice";
import CustomDrawer from "../common/CustomDrawer";
import { Ruler, Square } from "lucide-react";

const { Text } = Typography;
const { Option } = Select;

const MeasureControl = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((s) => s.ui.isMeasureOpen);
  const measure = useSelector((s) => s.map.measure);

  const onClose = () => dispatch(toggleMeasure());

  return (
    <CustomDrawer
      title="Measure"
      placement="left"
      onClose={onClose}
      open={isOpen}
      width={300}
      destroyOnClose={false}
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Text strong>Mode</Text>

        <Space>
          <Tooltip title="Line (measure length)">
            <Button
              type={measure?.type === "line" ? "primary" : "default"}
              icon={<Ruler size={16} />}
              onClick={() => dispatch(setMeasureType("line"))}
            >
              Line
            </Button>
          </Tooltip>

          <Tooltip title="Area (measure polygon)">
            <Button
              type={measure?.type === "area" ? "primary" : "default"}
              icon={<Square size={16} />}
              onClick={() => dispatch(setMeasureType("area"))}
            >
              Area
            </Button>
          </Tooltip>
        </Space>

        <Divider />

        <Text strong>Units</Text>
        <Select
          value={measure?.unit || "km"}
          onChange={(val) => dispatch(setMeasureUnit(val))}
          style={{ width: "100%" }}
        >
          <Option value="m">meters (m)</Option>
          <Option value="km">kilometers (km)</Option>
          <Option value="mi">miles (mi)</Option>
        </Select>

        <Divider />

        <Text type="secondary">
          The measurement mode and unit are stored in the Redux store. Hook your
          drawing/measurement logic to these settings (map slice: map.measure).
        </Text>
      </Space>
    </CustomDrawer>
  );
};

export default MeasureControl;
// ...existing code...