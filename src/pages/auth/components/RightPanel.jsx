import React, { useState } from "react";
import GoogleButton from "./GoogleButton";
import { UserOutlined } from "@ant-design/icons";
import { Button, Input, Space, message } from "antd";
import companyLogo from "../../../assets/images/company-logo.png";
import "../../Auth/Auth.css";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useLoginMutation } from "../../../store/api/authApi";
import { setCredentials, setError } from "../../../store/slices/authSlice";

const RightPanel = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [login, { isLoading }] = useLoginMutation();

const handleLogin = async () => {
    if (!email || !password) {
      message.error("Please enter both email and password.");
      return;
    }

    try {
      const response = await login({
        userId: email,
        password,
        ipAddress: "127.0.0.1",
      }).unwrap();

      if (response.statusCode === "200") {
        dispatch(
          setCredentials({
            user: response.scplAdContext,
            token: response.scplAdContext.access,
            appLogNo: response.scplAdContext.appLogNo,
          })
        );
        message.success("Logged in successfully!");
        navigate("/portal");
      } else {
        message.error(response.statusMessage || "Login failed.");
      }
    } catch (err) {
      setError(err);
      console.error('Login error:', err); // Add this for debugging
      message.error(
        err?.data?.statusMessage || 
        "Login failed. Please check your credentials."
      );
    }
  };

  return (
    <div className="right-section">
      <div className="company-logo-container">
        <img src={companyLogo} alt="Company Logo" className="company-logo" />
      </div>
      <h1 className="form-title">Hello,</h1>
      <h2 className="form-subtitle">Welcome back!</h2>
      <div className="form-container">
        <Input
          size="large"
          placeholder="User Id"
          prefix={<UserOutlined />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
        />
        <br />
        <Space direction="horizontal">
          <Input.Password
            placeholder="Password"
            size="large"
            visibilityToggle={{
              visible: passwordVisible,
              onVisibleChange: setPasswordVisible,
            }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
          <Button
            style={{ width: 80 }}
            onClick={() => setPasswordVisible((prev) => !prev)}
          >
            {passwordVisible ? "Hide" : "Show"}
          </Button>
        </Space>
        <Button
          type="primary"
          size="large"
          loading={isLoading}
          onClick={handleLogin}
          className="login-btn"
          block
          style={{ width: "100%", marginTop: 8 }}
        >
          Login
        </Button>
        <div className="divider">
          <span>or</span>
        </div>
        {/* <GoogleButton /> */}
      </div>
    </div>
  );
};

export default RightPanel;
