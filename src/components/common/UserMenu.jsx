import React from "react";
import { Dropdown, Avatar, Space, message } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout } from "../../store/slices/authSlice";

const UserMenu = ({ avatarSize = "default" }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const items = [
    { key: "profile", icon: <UserOutlined />, label: "Profile" },
    { key: "logout", icon: <LogoutOutlined />, label: "Logout" },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === "logout") {
      dispatch(logout());
      message.success("Logged out");
      navigate("/");
    } else if (key === "profile") {
      navigate("/profile");
    }
  };

  return (
    <Dropdown
      menu={{ items, onClick: handleMenuClick }}
      placement="bottomRight"
      trigger={["click"]}
    >
      <Space style={{ cursor: "pointer" }} align="middle">
        <Avatar size={avatarSize} icon={<UserOutlined />} />
      </Space>
    </Dropdown>
  );
};

export default UserMenu;

