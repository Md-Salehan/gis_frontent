// src/hooks/useAddLayerToMap.js
import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { message } from "antd";
import { setTempGeoJsonLayer } from "../store/slices/mapSlice";

/**
 * Custom hook for adding GeoJSON layers to the map
 * @param {Object} options - Configuration options
 * @param {string} options.layerType - Type of layer being added (e.g., 'centroid', 'spatial_join', 'count')
 * @param {Function} options.onSuccess - Callback function on successful addition
 * @param {Function} options.onError - Callback function on error
 * @returns {Object} - Object containing addLayerToMap function and status
 */
export function useAddLayerToMap(options = {}) {
  const dispatch = useDispatch();
  const { layerType = "layer", onSuccess, onError } = options;

  const addLayerToMap = useCallback(
    (resultLayer) => {
      if (!resultLayer) {
        const errorMsg = "No layer data to add";
        message.warning(errorMsg);
        if (onError) onError(new Error(errorMsg));
        return false;
      }

      try {
        const { layerId, geoJsonData, metaData } = resultLayer;

        // Validate required fields
        if (!layerId) {
          throw new Error("Layer ID is required");
        }

        if (!geoJsonData) {
          throw new Error("GeoJSON data is required");
        }

        // Ensure metaData has required structure
        const validatedMetaData = {
          layer: {
            layer_nm: metaData?.layer?.layer_nm || `Layer ${layerId}`,
            ...metaData?.layer,
            type: metaData?.layer?.type || layerType,
            created: metaData?.layer?.created || new Date().toISOString(),
          },
          style: metaData?.style || { geom_typ: "G" },
        };

        dispatch(
          setTempGeoJsonLayer({
            layerId,
            geoJsonData,
            metaData: validatedMetaData,
            isActive: true,
          })
        );

        const successMsg =
          `Layer "${validatedMetaData.layer.layer_nm}" added to map successfully!` +
          (metaData?.layer?.feature_count
            ? ` (${metaData.layer.feature_count} features)`
            : "");

        message.success(successMsg);

        if (onSuccess) {
          onSuccess(resultLayer);
        }

        return true;
      } catch (error) {
        console.error(`Error adding ${layerType} layer to map:`, error);
        message.error(`Failed to add layer: ${error.message}`);
        
        if (onError) {
          onError(error);
        }
        
        return false;
      }
    },
    [dispatch, layerType, onSuccess, onError]
  );

  return {
    addLayerToMap,
  };
}