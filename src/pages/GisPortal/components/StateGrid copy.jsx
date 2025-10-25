import React from "react";
// import "./StateGrid.css";
import StateCard from "./StateCard";
import map1 from "../../../assets/images/map-icon/1.png";
import map2 from "../../../assets/images/map-icon/2.png";
import map3 from "../../../assets/images/map-icon/3.png";
import map4 from "../../../assets/images/map-icon/4.png";  
import map5 from "../../../assets/images/map-icon/5.png";
import map6 from "../../../assets/images/map-icon/6.png";
import map7 from "../../../assets/images/map-icon/7.png";
import map8 from "../../../assets/images/map-icon/8.png";
import map9 from "../../../assets/images/map-icon/9.png";
import map10 from "../../../assets/images/map-icon/10.png";
import map11 from "../../../assets/images/map-icon/11.png";
import map12 from "../../../assets/images/map-icon/12.png";
import map13 from "../../../assets/images/map-icon/13.png";
import map14 from "../../../assets/images/map-icon/14.png";
import map15 from "../../../assets/images/map-icon/15.png";
import map16 from "../../../assets/images/map-icon/16.png"; 

const states = [
  { name: "map1", img: map1 },
    { name: "map2", img: map2 },
    { name: "map3", img: map3 },
    { name: "map4", img: map4 },
    { name: "map5", img: map5 },
    { name: "map6", img: map6 },
    { name: "map7", img: map7 },
    { name: "map8", img: map8 },
    { name: "map9", img: map9 },
    { name: "map10", img: map10 },
    { name: "map11", img: map11 },
    { name: "map12", img: map12 },
    { name: "map13", img: map13 },
    { name: "map14", img: map14 },
    { name: "map15", img: map15 },
    { name: "map16", img: map16 }
];

const StateGrid = ({portalList}) => {
  
  return (
    <div className="state-grid">
      {portalList?.map((state) => (
        <StateCard key={state?.portal_id}id ={state?.portal_id} name={state?.portal_nm} image={state?.portal_logo_img_url} />
      ))}
      {states.map((state) => (
        <StateCard key={state.name} name={state.name} image={state.img} />
      ))}
    </div>
  );
};

export default StateGrid;
