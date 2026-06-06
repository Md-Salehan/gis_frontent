export const SRID_4326_proj = '+proj=longlat +datum=WGS84 +no_defs'
// Common SRID options
export const COMMON_SRID_OPTIONS = [
  {
    value: "4326",
    label: "WGS 84 (EPSG:4326)",
    proj: SRID_4326_proj,
  },
  {
    value: "3857",
    label: "Web Mercator (EPSG:3857)",
    proj: "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs",
  },
  {
    value: "32645",
    label: "UTM Zone 45N (EPSG:32645)",
    proj: "+proj=utm +zone=45 +datum=WGS84 +units=m +no_defs",
  },
  {
    value: "32646",
    label: "UTM Zone 46N (EPSG:32646)",
    proj: "+proj=utm +zone=46 +datum=WGS84 +units=m +no_defs",
  },
  {
    value: "32647",
    label: "UTM Zone 47N (EPSG:32647)",
    proj: "+proj=utm +zone=47 +datum=WGS84 +units=m +no_defs",
  },
  {
    value: "32648",
    label: "UTM Zone 48N (EPSG:32648)",
    proj: "+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs",
  },
  {
    value: "32649",
    label: "UTM Zone 49N (EPSG:32649)",
    proj: "+proj=utm +zone=49 +datum=WGS84 +units=m +no_defs",
  },
  {
    value: "32650",
    label: "UTM Zone 50N (EPSG:32650)",
    proj: "+proj=utm +zone=50 +datum=WGS84 +units=m +no_defs",
  },
];