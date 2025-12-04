// Default base styles for all features
export const DEFAULT_STYLES = {
  color: "#000000",
  weight: 1,
  opacity: 1,
  fillOpacity: 1,
  fillColor: "none",
  markerFillColor: "#000000",
  radius: 3,
};

// Selected feature highlighting styles
export const SELECTED_FEATURE_STYLE = {
  color: "#ff0000",
  weight: 3,
  opacity: 0.8,
  fillColor: "#ff0000",
  fillOpacity: 0.6,
};

// Selected point marker style
export const SELECTED_CIRCLE_MARKER_STYLE = {
  radius: 10,
  color: "#ff0000",
  weight: 2,
  opacity: 0.9,
  fillColor: "#ff0000",
  fillOpacity: 0.6,
};

// Multi-selected feature styles (for multiple feature selection)
export const MULTI_SELECTED_FEATURE_STYLE = {
  color: "#ffbf00",
  weight: 2,
  opacity: 0.9,
  fillColor: "#ffbf00",
  fillOpacity: 0.6,
};

export const MULTI_SELECTED_CIRCLE_MARKER_STYLE = {
  radius: 8,
  color: "#ffbf00",
  weight: 2,
  opacity: 0.9,
  fillColor: "##ffbf00",
  fillOpacity: 0.6,
};

// Default tooltip configuration
export const TOOLTIP_CONFIG = {
  className: "custom-tooltip",
  sticky: true,
  direction: "auto",
};

// Default label styling values
export const DEFAULT_LABEL_STYLE = {
  fontTyp: "inherit",
  fontSize: 12,
  color: "#000000",
  bgColor: "#FFFFFF",
  bgStrokeWidth: 0,
};

// Popup configuration (ensures popups always appear on top)
export const POPUP_CONFIG = {
  maxWidth: 450,
  maxHeight: 400,
  className: "custom-popup",
  autoPan: true,
  autoPanPadding: [50, 50],
  autoPanPaddingTopLeft: [50, 50],
  autoPanPaddingBottomRight: [50, 50],
};

// Hover effect offsets
export const HOVER_EFFECT = {
  weightIncrease: 1,
  fillOpacityIncrease: 0.2,
};

// Pane z-index configuration
export const PANE_ZINDEX = {
  BASE_LAYER: 0,
  OVERLAY_BASE: 400,
  SELECTED_FEATURES: 10000,
  POPUP: 10001,
};

// Geometry types
export const GEOMETRY_TYPES = {
  POLYGON: "G",
  LINE: "L",
  POINT: "P",
};

// Hover effect configuration
export const HOVER_STYLE_CONFIG = {
  weightIncrease: 1,
  fillOpacityIncrease: 0.2,
};

// Line-specific style
export const LINE_STYLE = {
  fillOpacity: 0,
};
