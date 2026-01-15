import React from "react";
// import "./StateCard.css";
import { Card } from "antd";
import { useNavigate } from "react-router-dom";
import { setPortalId } from "../../../store/slices/portalSlice";
import { useDispatch } from "react-redux";
import { getImgUrl } from "../../../utils";

const StateCard = ({ portal }) => {
  const dispatch = useDispatch();

  const navigate = useNavigate();
  const handleNavigate = () => {
    // dispatch(setPortalId(portal));
    navigate(`/gis-dashboard/${portal?.portal_nm}`);
  };



  return (
    <Card
      onClick={handleNavigate}
      className="state-card"
      hoverable
      variant={false}
    >
      <div className="state-img-wpr">
      <img
        src={getImgUrl(portal?.portal_logo_img_url)}
        alt={portal?.portal_nm}
        className="state-image"
      />
      </div>
      <p className="state-name">{portal?.portal_nm}</p>
    </Card>
  );
};

export default StateCard;
