import React, { memo, useEffect } from "react";
import { Card } from "antd";
import TopLocationCard from "./TopLocationCard";
import FiltersPanel from "./FiltersPanel";
import LayerPanel from "./layerPanel";
import { useParams } from "react-router-dom";
import { useGetLayersMutation } from "../../../../store/api/layerApi";
import { useDispatch, useSelector } from "react-redux";
import { setPortalId } from "../../../../store/slices/mapSlice";

const Sidebar = memo(({  }) => {
  const { portalId } = useSelector((state) => state.map);
  const [getLayers, { data: layerInfo, isLoading, error }] = useGetLayersMutation();

  useEffect(() => {
    if (portalId) {
      getLayers(portalId);
    }
  }, [portalId, getLayers]);

  if (isLoading) return <div>Loading layers...</div>;
  if (error) return <div>Error loading layers: {error.message}</div>;

  return (
    <div className="sider-inner">
      <TopLocationCard portalDetails={layerInfo?.portalDetails} />
      <LayerPanel 
        layers={layerInfo?.layers} 
      />
    </div>
  );
});

Sidebar.displayName = 'Sidebar';
export default Sidebar;