import React from "react";
// import "./StateCard.css";
import { Card } from "antd";
import { useNavigate } from "react-router-dom";
import { setPortalId } from "../../../store/slices/portalSlice";
import { useDispatch } from "react-redux";

const StateCard = ({ portal }) => {
  const dispatch = useDispatch();
  
  const navigate = useNavigate();
  const handleNavigate = () => {
    // dispatch(setPortalId(portal));
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
