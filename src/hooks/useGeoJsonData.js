import { useState, useEffect } from "react";

export default function useGeoJsonData() {
  const [geoJsonData, setGeoJsonData] = useState(null);

  useEffect(() => {
    const sample = {
      type: "FeatureCollection",
      features: [],
    };
    const baseLat = 52.52;
    const baseLng = 13.38;
    let id = 1;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const minLat = baseLat + r * 0.005;
        const minLng = baseLng + c * 0.007;
        const polygon = [
          [minLat, minLng],
          [minLat + 0.004, minLng],
          [minLat + 0.004, minLng + 0.0055],
          [minLat, minLng + 0.0055],
        ];
        sample.features.push({
          type: "Feature",
          properties: { id: id++, name: `Cell ${r}-${c}`, value: Math.floor(Math.random() * 100) },
          geometry: { type: "Polygon", coordinates: [polygon.map((p) => [p[1], p[0]])] },
        });
      }
    }
    setGeoJsonData(sample);
  }, []);

  return geoJsonData;
}
