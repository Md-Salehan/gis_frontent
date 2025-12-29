// utils/mapScaleCalculations.js

// Constants
const DPI = 96;
const INCHES_PER_METER = 39.3701;
const METERS_PER_PIXEL_AT_ZOOM0_EQUATOR = 156543.03392; // Standard Web Mercator

// Base scale denominator at zoom level 0 at equator
const BASE_SCALE_AT_ZOOM0_EQUATOR = METERS_PER_PIXEL_AT_ZOOM0_EQUATOR * DPI * INCHES_PER_METER;


export const ZOOM_SCALE_MAPPING =  {
  0: "1000000000",
  1: "500000000",
  2: "250000000",
  3: "150000000",
  4: "70000000",
  5: "35000000",
  6: "15000000",
  7: "8000000",
  8: "4000000",
  9: "2000000",
  10: "1000000",
  11: "250000",
  12: "100000",
  13: "50000",
  14: "25000",
  15: "10000",
  16: "5000",
  17: "2500",
  18: "1000",
  19: "500",
  20: "250",
  21: "100",
  22: "50"
};


export const zoomToScaley = (zoom) => {
  console.log("myLog zoomToScaley called with zoom:", zoom);
  
  // Find the closest zoom level in our mapping
  const availableZooms = Object.keys(ZOOM_SCALE_MAPPING).map(Number).sort((a, b) => a - b);
  let closestZoom = availableZooms[0];
  
  for (const availableZoom of availableZooms) {
    if (availableZoom <= zoom) {
      closestZoom = availableZoom;
    } else {
      break;
    }
  }
  
  const scaleDen = ZOOM_SCALE_MAPPING[closestZoom];
  console.log("myLog zoomToScaley returning scaleDen:", scaleDen);
  return Math.round(scaleDen);
};


export const zoomToScalex = (zoom) => {
  console.log("myLog zoomToScale called with zoom:", zoom);
  
  // Simplified formula: scale = baseScale / 2^zoom
  const scaleDen = BASE_SCALE_AT_ZOOM0_EQUATOR / Math.pow(2, zoom);
  
  console.log("myLog zoomToScale returning scaleDen:", scaleDen);
  return Math.round(scaleDen);
};

export const scaleToZoomx = (scaleValue) => {
  console.log("myLog scaleToZoom called with scaleValue:", scaleValue);
  
  // Simplified formula: zoom = log2(baseScale / scaleValue)
  const zoomLevel = Math.log2(BASE_SCALE_AT_ZOOM0_EQUATOR / scaleValue);
  
  console.log("myLog scaleToZoomx returning zoomLevel:", Math.max(0, Math.min(20, Math.round(zoomLevel * 10) / 10)));
  return Math.max(0, Math.min(20, Math.round(zoomLevel * 10) / 10));
};









export const zoomToScale = (zoom, lat) => {
  console.log("myLog zoomToScale called with zoom:", zoom, "lat:", lat);

  const dpi = 96;
  const metersPerPixel =
    (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const scaleDen = metersPerPixel * dpi * 39.37;

  console.log("myLog zoomToScale returning scaleDen:", scaleDen);
  return Math.round(scaleDen);
};

export const scaleToZoom = (scaleValue, lat) => {
    console.log("myLog scaleToZoom called with scaleValue:", scaleValue, "lat:", lat);
  const dpi = 96;
  const latRad = (lat * Math.PI) / 180;
  const metersPerPixelAtZoom0 = 156543.03392 * Math.cos(latRad);
  const scaleDenPerPixel = metersPerPixelAtZoom0 * dpi * 39.37;

  const zoomLevel = Math.log2(scaleDenPerPixel / scaleValue);
    console.log("myLog scaleToZoom returning zoomLevel:", zoomLevel);
  return Math.max(0, Math.min(20, Math.round(zoomLevel * 10) / 10));
};

export const parseScaleValue = (scaleValue) => {
  if (scaleValue.includes(":")) {
    const parts = scaleValue.split(":");
    return parseFloat(parts[1] || parts[0]);
  }
  return parseFloat(scaleValue);
};

export const debugScaleCalculations = (scaleValue, lat, from) => {
  const parsedScale = parseScaleValue(scaleValue);
  const calculatedZoom = scaleToZoom(parsedScale, lat);
  const calculatedScale = zoomToScale(calculatedZoom, lat);

  console.log(`mylog from: ${from} - Input scale=${parsedScale}, lat=${lat}`);
  console.log(`mylog from: ${from} - Calculated zoom=${calculatedZoom}`);
  console.log(`mylog from: ${from} - Round-trip scale=${calculatedScale}`);
  console.log(
    `mylog from: ${from} - Difference=${Math.abs(
      parsedScale - calculatedScale
    )} (${(
      (Math.abs(parsedScale - calculatedScale) / parsedScale) *
      100
    ).toFixed(2)}%)`
  );

  return {
    inputScale: parsedScale,
    calculatedZoom,
    roundTripScale: calculatedScale,
    difference: Math.abs(parsedScale - calculatedScale),
    percentDifference:
      (Math.abs(parsedScale - calculatedScale) / parsedScale) * 100,
  };
};
