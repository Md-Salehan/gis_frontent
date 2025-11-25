import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  title: "",
  footer: "",
  zoomLevel: 10,
  scale: "1:50000",
  includeLegend: true,
  fileFormat: "pdf",
  paperSize: "a4",
  orientation: "landscape",
};

const printSlice = createSlice({
  name: "print",
  initialState,
  reducers: {
    setPrintSettings: (state, action) => {
      return { ...state, ...action.payload };
    },
    resetPrintSettings: () => initialState,
  },
});

export const { setPrintSettings, resetPrintSettings } = printSlice.actions;
export default printSlice.reducer;