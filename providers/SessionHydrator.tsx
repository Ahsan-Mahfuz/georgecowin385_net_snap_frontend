"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { storage } from "@/utils/storage";
import { hydrateSession, SessionState, STORAGE_KEY } from "@/redux/features/session/sessionSlice";

// Restores the persisted session from localStorage after mount. Runs on the client
// only, so the server and first client render stay identical (avoids hydration mismatch).
export function SessionHydrator() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(hydrateSession(storage.get<SessionState>(STORAGE_KEY)));
  }, [dispatch]);

  return null;
}
