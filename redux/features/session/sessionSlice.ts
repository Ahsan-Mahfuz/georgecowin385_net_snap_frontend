import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Profile } from "@/lib/mock";
import { storage } from "@/utils/storage";

export type Portal = "creators" | "collective";

export interface SessionState {
  portal: Portal | null;
  user: Profile | null; // creators profile
  collectiveUser: Profile | null; // collective profile
}

const STORAGE_KEY = "cowshed_session";

function getInitialState(): SessionState {
  const saved = storage.get<SessionState>(STORAGE_KEY);
  return saved || { portal: null, user: null, collectiveUser: null };
}

function persist(state: SessionState) {
  storage.set(STORAGE_KEY, state);
}

const sessionSlice = createSlice({
  name: "session",
  initialState: getInitialState(),
  reducers: {
    loginCreators: (state, action: PayloadAction<Profile>) => {
      state.user = action.payload;
      state.portal = "creators";
      persist(state);
    },
    loginCollective: (state, action: PayloadAction<Profile>) => {
      state.collectiveUser = action.payload;
      state.portal = "collective";
      persist(state);
    },
    logoutCreators: (state) => {
      state.user = null;
      persist(state);
    },
    logoutCollective: (state) => {
      state.collectiveUser = null;
      persist(state);
    },
    resetPortal: (state) => {
      state.portal = null;
      persist(state);
    },
  },
});

export const { loginCreators, loginCollective, logoutCreators, logoutCollective, resetPortal } = sessionSlice.actions;
export default sessionSlice.reducer;
