import { memo, useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useDispatch } from "react-redux";
import { updateViewport } from "../../store/slices/mapSlice";

const FitBounds = memo(({ geoJsonLayers }) => {
  const dispatch = useDispatch();
  const map = useMap();

  useEffect(() => {
    if (!map || !geoJsonLayers) return;

    const timeoutId = setTimeout(() => {
      try {
        map.invalidateSize();

        const entries = Object.entries(geoJsonLayers || {}).filter(
          ([, data]) => !!data?.geoJsonData
        );
        if (entries.length === 0) return;

        let combinedBounds = null;
        const geoJsonInstances = [];

        for (const [, data] of entries) {
          try {
            const tmp = L.geoJSON(data?.geoJsonData);
            geoJsonInstances.push(tmp); // Store for cleanup
            const b = tmp.getBounds();
            if (b && b.isValid && b.isValid()) {
              if (!combinedBounds) combinedBounds = b;
              else combinedBounds.extend(b);
            }
          } catch (err) {
            // ignore malformed layer
          }
        }

        if (
          combinedBounds &&
          combinedBounds.isValid &&
          combinedBounds.isValid()
        ) {
          try {
            const center = combinedBounds.getCenter();

            dispatch(
              updateViewport({
                center: [center.lat, center.lng],
                // zoom: Math.min(16, viewport.zoom || 13),
              })
            );
            map.fitBounds(combinedBounds, {
              padding: [0, 0],
              // maxZoom: 16,
              animate: false,
            });
          } catch (e) {
            console.log(e, "error in fitbounds");

            map.fitBounds(combinedBounds, { 
              padding: [10, 10], 
              // maxZoom: 16 
            });
          }
        }

        // Cleanup geoJSON instances
        geoJsonInstances.forEach((instance) => {
          try {
            instance.clearLayers();
          } catch (e) {
            // Ignore cleanup errors
          }
        });
      } catch (err) {
        // ignore
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [map, geoJsonLayers]);

  return null;
});

FitBounds.displayName = "FitBounds";
export default FitBounds;
