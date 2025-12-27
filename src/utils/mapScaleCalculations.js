// utils/mapScaleCalculations.js

// Constants
const DPI = 96;
const INCHES_PER_METER = 39.3701;
const METERS_PER_PIXEL_AT_ZOOM0_EQUATOR = 156543.03392; // Standard Web Mercator

// Base scale denominator at zoom level 0 at equator
const BASE_SCALE_AT_ZOOM0_EQUATOR = METERS_PER_PIXEL_AT_ZOOM0_EQUATOR * DPI * INCHES_PER_METER;


export const ZOOM_SCALE_MAPPING = {
  0: 591658710,
  1: 295829355,
  2: 147914678,
  3: 73957339,
  4: 36978669,
  5: 18489335,
  6: 9244668,
  7: 4622334,
  8: 2311167,
  9: 1155584,
  10: 577792,
  11: 288896,
  11.2: 250000, // Your reference
  11.5: 244000,
  12: 144448,
  12.5: 100000, // Your reference
  13: 72224,
  13.5: 50000,  // Your reference
  14: 36112,
  14.5: 25000,  // Your reference
  15: 18056,
  15.5: 12500,
  15.9: 10000,  // Your reference
  16: 9028,
  16.5: 6400,
  16.9: 5000,   // Your reference
  17: 4514,
  17.5: 3200,
  17.9: 2500,   // Your reference
  18: 2257,
  18.5: 1600,
  19: 1129,
  19.2: 1000,   // Your reference
  19.5: 800,
  20: 500       // Your reference
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
