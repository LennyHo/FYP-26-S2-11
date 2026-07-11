// outlets.ts — Store locations, fetched from the backend (GET /api/stores).
// Use the useOutlets() hook in client components instead of a hardcoded list.

import { useEffect, useState } from "react";
import { getStores } from "./customerApi";
import type { DripTeaStore } from "./api.base";

export type DripTeaOutlet = DripTeaStore;

export function useOutlets() {
  const [outlets, setOutlets] = useState<DripTeaOutlet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getStores()
      .then((response) => {
        if (!cancelled && response.ok) setOutlets(response.data);
      })
      .catch((error) => {
        console.error("[useOutlets] Failed to load stores:", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { outlets, loading };
}
