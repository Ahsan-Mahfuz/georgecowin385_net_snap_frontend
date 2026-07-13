import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// The financial year currently selected in the portal. Deal-driven views read
// this to filter deals and label their month columns.
export const DEFAULT_YEAR = 2026;

interface YearState {
  selectedYear: number;
}

const initialState: YearState = {
  selectedYear: DEFAULT_YEAR,
};

const yearSlice = createSlice({
  name: "year",
  initialState,
  reducers: {
    setYear: (state, action: PayloadAction<number>) => {
      state.selectedYear = action.payload;
    },
  },
});

export const { setYear } = yearSlice.actions;
export default yearSlice.reducer;
