// ...existing code...
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setSelectedPortal } from '../../../store/slices/portalSlice';
import StateCard from "./StateCard";

const StateGrid = ({ portalList = [] }) => {
  const dispatch = useDispatch();


  const handlePortalSelect = (portal) => {
    dispatch(setSelectedPortal(portal));
    // optionally navigate to portal.portal_url here
  };

  console.log(portalList, 'portalList in stategrid');
  

  return (
    <div className="state-grid">
      {portalList.map((portal) => (
        <StateCard
          key={portal?.portal_id}
          portal={portal}
          onClick={() => handlePortalSelect(portal)}
        />
      ))}
    </div>
  );
};

export default StateGrid;
// ...existing code...