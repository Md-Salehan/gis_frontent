import React, { memo, useEffect } from "react";
import { Card } from "antd";
import TopLocationCard from "./TopLocationCard";
import FiltersPanel from "./FiltersPanel";
import LayerPanel from "./layerPanel";
import { useParams } from "react-router-dom";
import { useGetLayersMutation } from "../../../../store/api/layerApi";

const Sidebar = memo(({  }) => {
  const { portal_id } = useParams();
  const [getLayers, { data: layerInfo, isLoading, error }] = useGetLayersMutation();

  useEffect(() => {
    if (portal_id) {
      getLayers(portal_id);
    }
  }, [portal_id, getLayers]);

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