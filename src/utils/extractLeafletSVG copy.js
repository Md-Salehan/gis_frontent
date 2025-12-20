export function extractLeafletSVG(mapContainer) {
  const svg = mapContainer.querySelector("svg");

  if (!svg) {
    throw new Error("Leaflet SVG not found");
  }

  const clonedSvg = svg.cloneNode(true);

  const bbox = svg.getBoundingClientRect();
  clonedSvg.setAttribute("width", bbox.width);
  clonedSvg.setAttribute("height", bbox.height);

  // ✅ ONLY Leaflet-specific CSS (SAFE)
  const allowedPrefixes = [
    ".leaflet-",
    "svg",
    "path",
    "circle",
    "rect",
    "text",
  ];

  let cssText = "";

  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // CORS protected stylesheets
    }

    for (const rule of rules) {
      if (
        rule.selectorText &&
        allowedPrefixes.some((p) => rule.selectorText.startsWith(p))
      ) {
        cssText += rule.cssText + "\n";
      }
    }
  }

  if (cssText) {
    const style = document.createElement("style");
    style.textContent = cssText;
    clonedSvg.prepend(style);
  }

  return clonedSvg;
}
