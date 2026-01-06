import React from "react";
// import "./HeaderBar.css";
import logoRight from "../../../assets/images/company-logo.png";
import {
  Layout,
  Menu,
  theme,
  Input,
  Button,
  Space,
  Row,
  Col,
  Tooltip,
} from "antd";
import {
  UploadOutlined,
  VideoCameraOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { UserMenu } from "../../../components";

const HeaderBar = () => {
  return (
    <header className="header-bar">
      <div className="header-left">
        <div className="gov-logo">
          <img src={logoRight} alt="NIC Logo" className="header-right-log" />
        </div>
        <div className="header-text">
          <h2>Semaphore GIS Portal</h2>
          {/* <span>3, Gokul Baral Street, 1st Floor, Kolkata 700012</span> */}
          {/* <span>Information Technology</span> */}
        </div>
      </div>
      {/* <img src={logoRight} alt="NIC Logo" className="header-right-logo" /> */}
      <UserMenu />
    </header>
  );
};

export default HeaderBar;
