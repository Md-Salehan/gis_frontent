export const getImgUrl = (path) => {
    if (!path) return path;

    // already absolute
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    // relative path → prepend API base URL
    return `${import.meta.env.VITE_JAVA_SERVER_PREFIX}${path}`;
  };