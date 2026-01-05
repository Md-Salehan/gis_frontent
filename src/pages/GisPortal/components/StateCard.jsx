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
    navigate(`/gis-dashboard/${portal?.portal_nm}`);
  };

  const getImgUrl = (path) => {
    if (!path) return path;

    // already absolute
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    // relative path → prepend API base URL
    return `${import.meta.env.VITE_API_URL}${path}`;
  };

  return (
    <Card
      onClick={handleNavigate}
      className="state-card"
      hoverable
      variant={false}
    >
      <img
        src={getImgUrl(portal?.portal_logo_img_url)}
        alt={portal?.portal_nm}
        className="state-image"
      />
      <p className="state-name">{portal?.portal_nm}</p>
    </Card>
  );
};

export default StateCard;
