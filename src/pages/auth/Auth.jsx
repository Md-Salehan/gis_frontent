import React from "react";
import "./Auth.css";
import LeftPanel from "./components/LeftPanel";
import RightPanel from "./components/RightPanel";

const Auth = () => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <LeftPanel />
        <RightPanel />
      </div>
    </div>
  );
};

export default Auth;
