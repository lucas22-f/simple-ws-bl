import type { ReactNode } from "react";
import { StoreHeader } from "@/components/store/store-header";

export default function StoreLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <StoreHeader />
      {children}
    </>
  );
}
