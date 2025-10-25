import React from "react";
// import "./FooterBar.css";

const FooterBar = () => {
  return (
    <footer className="footer-bar">
      <p>
        Semaphore GIS Portal © 2025 <br />
        Designed & Developed by{" "}
        <a href="#" target="_blank" rel="noopener noreferrer">
          Geo-Spatial Technology and Services Division, Semaphore Computers PVT
          LTD.
        </a>
      </p>
      <span>3, Gokul Baral Street, 1st Floor, Kolkata 700012</span>

      {/* <div className="footer-logos">
        <img src="/assets/images/mygov.png" alt="MyGov" />
        <img src="/assets/images/india_gov.png" alt="India.gov" />
      </div> */}
    </footer>
  );
};

export default FooterBar;
