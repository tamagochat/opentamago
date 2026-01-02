"use client";

import { useEffect, useState } from "react";
import { getDatabase, type Database } from "../index";

export function useDatabase() {
  const [db, setDb] = useState<Database | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    getDatabase()
      .then((database) => {
        if (mounted) {
          setDb(database);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error("Database initialization error:", err);
          setError(err instanceof Error ? err : new Error("Failed to initialize database"));
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { db, isLoading, error };
}
