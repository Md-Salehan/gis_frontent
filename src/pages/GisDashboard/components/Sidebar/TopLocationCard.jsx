import React, { memo } from "react";
import { Card } from "antd";
import { getImgUrl } from "../../../../utils";

const TopLocationCard = memo(({ portalDetails }) => {
  return (
    <div className="top-location-card">
      <div className="loc-icon">
        <img 
          src={getImgUrl(portalDetails?.portal_logo_img_url)} 
          alt="Location Logo" 
          loading="lazy"
        />  
      </div>
      <div className="loc-text">
        <div className="loc-title">{portalDetails?.portal_nm}</div>
        <div className="loc-sub">
          {portalDetails?.portal_desc} 
        </div>
      </div>
    </div>
  );
});

TopLocationCard.displayName = 'TopLocationCard';
export default TopLocationCard;