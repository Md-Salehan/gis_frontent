import React from "react";
import "../../Auth/Auth.css";
// import logo from "../../../assets/images/logo.png";
import gis_image_1 from "../../../assets/images/gis_wallpaper/gis_wallper_1.jpg";
import gis_image_2 from "../../../assets/images/gis_wallpaper/gis_wallper_2.jpg";
import gis_image_3 from "../../../assets/images/gis_wallpaper/gis_wallper_3.jpg";
import gis_image_4 from "../../../assets/images/gis_wallpaper/gis_wallper_4.jpg";
import gis_image_5 from "../../../assets/images/gis_wallpaper/gis_wallper_5.jpg"; 
import gis_image_6 from "../../../assets/images/gis_wallpaper/gis_wallper_6.jpg";
import gis_image_7 from "../../../assets/images/gis_wallpaper/gis_wallper_7.png";
import gis_image_8 from "../../../assets/images/gis_wallpaper/gis_wallper_8.jpg";
import { Carousel } from "antd";
const contentStyle = {
  height: "98vh",
  color: "#fff",
  width: "100%",
  backgroundSize: "cover",
  backgroundPosition: "center",
};

const LeftPanel = () => {
  return (
    <div className="left-section">
      <Carousel autoplay={{ dotDuration: true }} autoplaySpeed={5000}>
        {/* <div>
          <img style={contentStyle} src={gis_image_1} alt="Decorative Shape" />
        </div>
        
        <div>
          <img style={contentStyle} src={gis_image_2} alt="Decorative Shape" />
        </div>
        <div>
          <img style={contentStyle} src={gis_image_3} alt="Decorative Shape" />
        </div>
        <div>
          <img style={contentStyle} src={gis_image_4} alt="Decorative Shape" />
        </div>
        <div>
          <img style={contentStyle} src={gis_image_5} alt="Decorative Shape" />
        </div>
        <div>
          <img style={contentStyle} src={gis_image_6} alt="Decorative Shape" />
        </div> */}
        <div>
          <img style={contentStyle} src={gis_image_7} alt="Decorative Shape" />
        </div>
        {/* <div>
          <img style={contentStyle} src={gis_image_8} alt="Decorative Shape" />
        </div> */}
        
        
      </Carousel>
    </div>
  );
};

export default LeftPanel;
