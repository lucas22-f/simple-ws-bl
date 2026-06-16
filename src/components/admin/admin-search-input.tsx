"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type AdminSearchInputProps = {
  basePath: "/admin/products" | "/admin/orders";
  initialQuery?: string;
  id: string;
  label: string;
  placeholder: string;
};

export function AdminSearchInput({ basePath, initialQuery, id, label, placeholder }: AdminSearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";
  const [value, setValue] = React.useState(initialQuery ?? currentQuery);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextQuery = value.trim();

      if (nextQuery === currentQuery) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      if (nextQuery) {
        params.set("q", nextQuery);
      } else {
        params.delete("q");
      }
      params.delete("page");

      router.replace(`${basePath}?${params.toString()}`);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [basePath, currentQuery, router, searchParams, value]);

  return (
    <div className="relative">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input id={id} value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} className="min-h-12 pl-11" />
    </div>
  );
}
