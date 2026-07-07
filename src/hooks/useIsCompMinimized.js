import React from 'react'
import { useSelector } from 'react-redux';

function useIsCompMinimized({ compId }) {
    const minimizedComponents = useSelector(
    (state) => state.ui.minimizedGlobalCompList,
  );
  return (
    minimizedComponents.some((comp) => comp.id === compId)
  )
}

export default useIsCompMinimized