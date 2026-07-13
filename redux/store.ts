import { configureStore } from "@reduxjs/toolkit";
import sessionReducer from "./features/session/sessionSlice";
import layoutReducer from "./features/layout/layoutSlice";
import yearReducer from "./features/year/yearSlice";
import { baseApi } from "./api/baseApi";

export const store = configureStore({
  reducer: {
    session: sessionReducer,
    layout: layoutReducer,
    year: yearReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
