import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LayoutState } from "@/types";

const initialState: LayoutState = {
  isMobileSidebarOpen: false,
};

const layoutSlice = createSlice({
  name: "layout",
  initialState,
  reducers: {
    toggleMobileSidebar: (state) => {
      state.isMobileSidebarOpen = !state.isMobileSidebarOpen;
    },
    setMobileSidebar: (state, action: PayloadAction<boolean>) => {
      state.isMobileSidebarOpen = action.payload;
    },
  },
});

export const { toggleMobileSidebar, setMobileSidebar } = layoutSlice.actions;
export default layoutSlice.reducer;