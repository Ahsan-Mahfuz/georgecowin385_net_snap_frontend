import React from "react";
import { CollectiveShell } from "@/components/shell/CollectiveShell";

export default function CollectiveShellLayout({ children }: { children: React.ReactNode }) {
  return <CollectiveShell>{children}</CollectiveShell>;
}
