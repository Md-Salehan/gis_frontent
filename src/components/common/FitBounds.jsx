import { memo, useEffect } from "react";
import { useMap } from "react-leaflet";

// FitBounds component (keeps as side-effect)
const FitBounds = memo(({ geoJsonLayers }) => {
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
        for (const [, data] of entries) {
          try {
            const tmp = L.geoJSON(data?.geoJsonData);
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
            map.flyToBounds(combinedBounds, {
              padding: [40, 40],
              maxZoom: 16,
              duration: 0.7,
            });
          } catch {
            map.fitBounds(combinedBounds, { padding: [40, 40], maxZoom: 16 });
          }
        }
      } catch (err) {
        // ignore
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [map, geoJsonLayers]);

  return null;
});

FitBounds.displayName = "FitBounds";
export default FitBounds;