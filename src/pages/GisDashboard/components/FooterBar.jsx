import { Layout } from 'antd';
import React from 'react'
const {  Footer } = Layout;

function FooterBar() {
  return (
    <Footer style={{ textAlign: "center" }}>
          {/* Ant Design ©{new Date().getFullYear()} Created by Ant UED */}
          <p>
        Semaphore GIS Portal © 2025 <br />
        Designed & Developed by{" "}
        <a href="#" target="_blank" rel="noopener noreferrer">
          Geo-Spatial Technology and Services Division, Semaphore Computers PVT
          LTD.
        </a>
      </p>
      <span>3, Gokul Baral Street, 1st Floor, Kolkata 700012</span>
        </Footer>
  )
}

export default FooterBar