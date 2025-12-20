export function extractLeafletSVG(mapContainer) {
  let svg = mapContainer.querySelector("svg.leaflet-tile-container");
  
  if (!svg) {
    // Try to find any SVG in the container
    const svgElements = mapContainer.querySelectorAll("svg");
    if (svgElements.length === 0) {
      throw new Error("No SVG found in map container");
    }
    svg = svgElements[0];
  }

  const clonedSvg = svg.cloneNode(true);
  
  // Use the map container's dimensions instead of bounding rect
  const containerWidth = mapContainer.clientWidth;
  const containerHeight = mapContainer.clientHeight;
  
  clonedSvg.setAttribute("width", containerWidth);
  clonedSvg.setAttribute("height", containerHeight);
  clonedSvg.setAttribute("viewBox", `0 0 ${containerWidth} ${containerHeight}`);
  clonedSvg.style.width = `${containerWidth}px`;
  clonedSvg.style.height = `${containerHeight}px`;

  // Ensure proper styling for vector elements
  const style = document.createElement("style");
  style.textContent = `
    .leaflet-overlay-pane svg { overflow: hidden; }
    path { vector-effect: non-scaling-stroke; }
    circle, rect { vector-effect: non-scaling-stroke; }
    text { font-family: Arial, sans-serif; }
  `;
  clonedSvg.prepend(style);

  return clonedSvg;
}