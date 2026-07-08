import { configureStore } from "@reduxjs/toolkit";
import sessionReducer from "./features/session/sessionSlice";
import layoutReducer from "./features/layout/layoutSlice";

export const store = configureStore({
  reducer: {
    session: sessionReducer,
    layout: layoutReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
