import React from "react";
import { useSelector } from "react-redux";

function useIsCompMinimized(compId) {
  const minimizedComponents = useSelector(
    (state) => state.ui.minimizedGlobalCompList,
  );
  // if (!compId) {
  //   console.error("useIsCompMinimized: compId is required");
  //   return false;
  // }
  return minimizedComponents.some((id) => id === compId);
}

export default useIsCompMinimized;
