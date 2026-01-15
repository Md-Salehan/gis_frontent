import { Layout } from "antd";
import React from "react";
import { useSelector } from "react-redux";
const { Footer } = Layout;

function FooterBar() {
  const portalDetails = useSelector((state) => state.portal.activePortalDetails); // Placeholder for portal details data
  return (
    <Footer style={{ textAlign: "center" }}>
      {/* <p>
        Semaphore GIS Portal © 2025 <br />
        Designed & Developed by{" "}
        <a href="#" target="_blank" rel="noopener noreferrer">
          Geo-Spatial Technology and Services Division, Semaphore Computers PVT
          LTD.
        </a>
      </p>
      <span>3, Gokul Baral Street, 1st Floor, Kolkata 700012</span> */}
      <p>{portalDetails?.portal_copyright}</p>
    </Footer>
  );
}

export default FooterBar;
