import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Table, Tabs, Checkbox, Button, message, Space, Tooltip } from "antd";
import {
  DownloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { toggleAttributeTable } from "../../store/slices/uiSlice";
import {
  setSelectedFeature,
  setMultiSelectedFeatures,
} from "../../store/slices/mapSlice";
import CustomDrawer from "../common/CustomDrawer";
import L from "leaflet";
import { useMap } from "react-leaflet";

// Constants
const DEBUG = process.env.NODE_ENV === "development";
const MAP_FIT_OPTIONS = {
  padding: [50, 50],
  maxZoom: 16,
  duration: 0.7,
};
function AttributeTableDrawer() {
  const dispatch = useDispatch();
  const map = useMap();

  const [activeTab, setActiveTab] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState({});
  const [multiSelected, setMultiSelected] = useState({});

  const geoJsonLayers = useSelector((state) => state.map.geoJsonLayers);
  const isAttributeTableOpen = useSelector(
    (state) => state.ui.isAttributeTableOpen
  );
  return <CustomDrawer
      title="Attribute Table"
      placement="bottom"
      onClose={handleClose}
      afterOpenChange={(open) => {
        if (!open) {
          handleAfterDrawerClose();
        }
      }}
      open={isAttributeTableOpen}
      height="40vh"
      mask={false}
    >
      
    </CustomDrawer>;
}

export default AttributeTableDrawer;
