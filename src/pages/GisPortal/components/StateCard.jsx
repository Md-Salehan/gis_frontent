import React from "react";
// import "./StateCard.css";
import { Card } from "antd";
import { useNavigate } from "react-router-dom";

const StateCard = ({ portal }) => {
  console.log(portal, "portal in state card");
  
  const navigate = useNavigate();
  const handleNavigate = () => {
    navigate(`/gis-dashboard/${portal?.portal_id}`);
  };

  return (
    <Card onClick={handleNavigate} className="state-card" hoverable variant={false}>
      <img src={portal?.portal_logo_img_url} alt={portal?.portal_nm} className="state-image" />
      <p className="state-name">{portal?.portal_nm}</p>
    </Card>
  );
};

export default StateCard;
