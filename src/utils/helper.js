export const getImgUrl = (path) => {
    if (!path) return path;

    // already absolute
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    // relative path → prepend API base URL
    return `${import.meta.env.VITE_JAVA_SERVER_PREFIX}${path}`;
  };

  export const convertToMeters = (value, unit) => {
  switch (unit) {
    case "kilometers":
      return value * 1000;
    case "miles":
      return value * 1609.34;
    case "meters":
    default:
      return value;
  }
}