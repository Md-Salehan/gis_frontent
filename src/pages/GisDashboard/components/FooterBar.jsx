import { Layout } from 'antd';
import React from 'react'
const {  Footer } = Layout;

function FooterBar() {
  return (
    <Footer style={{ textAlign: "center" }}>
          Ant Design ©{new Date().getFullYear()} Created by Ant UED
        </Footer>
  )
}

export default FooterBar