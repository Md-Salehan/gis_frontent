import React, { useState, useMemo, useCallback, useEffect } from "react";

import { useSelector, useDispatch } from "react-redux";
import { toggleAttributeTable } from "../../store/slices/uiSlice";

import CustomDrawer from "../common/CustomDrawer";
import AttributeTable from "./AttributeTable";

function AttributeTableDrawer() {
  const dispatch = useDispatch();

  const isAttributeTableOpen = useSelector(
    (state) => state.ui.isAttributeTableOpen
  );

  const handleClose = useCallback(() => {
    dispatch(toggleAttributeTable());
  }, [dispatch]);

  return (
    <CustomDrawer
      title="Attribute Table"
      placement="bottom"
      onClose={handleClose}
      open={isAttributeTableOpen}
      height="40vh"
      mask={false}
    >
      {isAttributeTableOpen && <AttributeTable csvDownloader={true} clearDataOnTabChange={true} />}
    </CustomDrawer>
  );
}

export default AttributeTableDrawer;
