"use client";

import React from "react";
import { Provider } from "react-redux";
import { store } from "@/redux/store";
import { SessionHydrator } from "@/providers/SessionHydrator";

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SessionHydrator />
      {children}
    </Provider>
  );
}