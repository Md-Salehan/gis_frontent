import React from "react";
import { Dropdown, Avatar, Space, message } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useLogoutMutation } from "../../store/api/authApi";
import { resetAuth } from "../../store/slices/authSlice";

const UserMenu = ({ avatarSize = "default" }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const appLogNo = useSelector((state) => state.auth.appLogNo);
  const [logout, { loading }] = useLogoutMutation();

  const items = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
      onClick: () => {
        navigate("/profile");
      },
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: async () => {
        const payload = { appLogNo }; // Add any necessary payload for logout if required
        await logout(payload)
        .then(() => {
          dispatch(resetAuth());
          // message.success("Logged out");
          console.log("xxa");
          
          navigate("/");
        }).catch((err) => {
          console.error('Logout error:', err);
          message.error("Logout failed. Please try again.");
        }).finally(() => {
          
        });
      },
    },
  ];

  // const handleMenuClick = ({ key }) => {
  //   if (key === "logout") {
  //     dispatch(logout());
  //     message.success("Logged out");
  //     navigate("/");
  //   } else if (key === "profile") {
  //     navigate("/profile");
  //   }
  // };

  return (
    <Dropdown menu={{ items }} placement="bottomRight" trigger={["click"]}>
      <Space style={{ cursor: "pointer" }} align="middle">
        <Avatar size={avatarSize} icon={<UserOutlined />} />
      </Space>
    </Dropdown>
  );
};

export default UserMenu;
