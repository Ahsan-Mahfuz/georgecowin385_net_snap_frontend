import React from "react";
import { CreatorsShell } from "@/components/shell/CreatorsShell";

export default function CreatorsShellLayout({ children }: { children: React.ReactNode }) {
  return <CreatorsShell>{children}</CreatorsShell>;
}
