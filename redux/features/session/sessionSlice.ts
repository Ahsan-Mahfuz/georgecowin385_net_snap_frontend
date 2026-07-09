import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Profile } from "@/lib/mock";
import { storage } from "@/utils/storage";

export type Portal = "creators" | "collective";

export interface SessionState {
  portal: Portal | null;
  user: Profile | null; // creators profile
  collectiveUser: Profile | null; // collective profile
  token: string | null; // bearer token issued at login (mock)
  hydrated: boolean; // true once the client has restored state from localStorage
}

export const STORAGE_KEY = "cowshed_session";

// Deterministic initial state so the server and the first client render match.
// The real session is restored after mount via `hydrateSession` (see SessionHydrator).
const initialState: SessionState = {
  portal: null,
  user: null,
  collectiveUser: null,
  token: null,
  hydrated: false,
};

function persist(state: SessionState) {
  storage.set(STORAGE_KEY, state);
}

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    hydrateSession: (state, action: PayloadAction<SessionState | null>) => {
      const saved = action.payload;
      if (saved) {
        state.portal = saved.portal ?? null;
        state.user = saved.user ?? null;
        state.collectiveUser = saved.collectiveUser ?? null;
        state.token = saved.token ?? null;
      }
      state.hydrated = true;
    },
    loginCreators: (state, action: PayloadAction<{ user: Profile; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.portal = "creators";
      persist(state);
    },
    loginCollective: (state, action: PayloadAction<{ user: Profile; token: string }>) => {
      state.collectiveUser = action.payload.user;
      state.token = action.payload.token;
      state.portal = "collective";
      persist(state);
    },
    logoutCreators: (state) => {
      state.user = null;
      state.token = null;
      persist(state);
    },
    logoutCollective: (state) => {
      state.collectiveUser = null;
      state.token = null;
      persist(state);
    },
    resetPortal: (state) => {
      state.portal = null;
      persist(state);
    },
  },
});

export const { hydrateSession, loginCreators, loginCollective, logoutCreators, logoutCollective, resetPortal } = sessionSlice.actions;
export default sessionSlice.reducer;
