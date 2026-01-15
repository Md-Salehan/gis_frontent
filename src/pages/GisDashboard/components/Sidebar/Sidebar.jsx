import React, { memo, useEffect } from "react";
import { Card } from "antd";
import TopLocationCard from "./TopLocationCard";
import FiltersPanel from "./FiltersPanel";
import LayerPanel from "./layerPanel";
import { useGetLayersMutation } from "../../../../store/api/layerApi";
import { useDispatch, useSelector } from "react-redux";
import { updateViewport } from "../../../../store/slices/mapSlice";
import { setActivePortalDetails } from "../../../../store/slices/portalSlice";

const Sidebar = memo(({}) => {
  const dispatch = useDispatch();
  const { portalId } = useSelector((state) => state.portal);
  const [getLayers, { data: layerInfo, isLoading, error }] =
    useGetLayersMutation();

  const fetchLayerlist = async (portalId) => {
    try {
      const response = await getLayers(portalId).unwrap();
      const portalDetails = response?.portalDetails;
      dispatch(setActivePortalDetails(portalDetails));
    } catch (err) {
      console.error("Failed to fetch layers: ", err);
    }
  };


  useEffect(() => {
    if (portalId) {
      fetchLayerlist(portalId);
    }
  }, [portalId]);

  // Apply default zoom from portalDetails.max_zoom when layers load
  useEffect(() => {
    const maxZoom = layerInfo?.portalDetails?.max_zoom;
    if (typeof maxZoom === "number") {
      dispatch(updateViewport({ zoom: maxZoom }));
    }
  }, [layerInfo, dispatch]);

  if (isLoading) return <div>Loading layers...</div>;
  if (error) return <div>Error loading layers: {error.message}</div>;

  return (
    <div className="sider-inner">
      <TopLocationCard portalDetails={layerInfo?.portalDetails} />
      <LayerPanel layers={layerInfo?.layers} />
    </div>
  );
});

Sidebar.displayName = "Sidebar";
export default Sidebar;
