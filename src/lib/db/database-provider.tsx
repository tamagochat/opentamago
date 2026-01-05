"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Database } from "./index";
import { initializeDatabase } from "./init";

interface DatabaseContextValue {
  db: Database | null;
  isLoading: boolean;
  error: Error | null;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    let initStarted = false;

    const init = async () => {
      // Prevent double initialization in React Strict Mode
      if (initStarted) {
        if (process.env.NODE_ENV === "development") {
          console.log("[DatabaseProvider] Initialization already started, skipping");
        }
        return;
      }
      initStarted = true;

      if (process.env.NODE_ENV === "development") {
        console.log("[DatabaseProvider] Starting database initialization");
      }

      try {
        const database = await initializeDatabase();

        if (mounted) {
          if (process.env.NODE_ENV === "development") {
            console.log("[DatabaseProvider] Database initialized successfully");
          }
          setDb(database);
          setError(null);
        }
      } catch (err) {
        console.error("[DatabaseProvider] Database initialization failed:", err);

        if (mounted) {
          setError(err instanceof Error ? err : new Error("Failed to initialize database"));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []); // Empty deps - only run once

  return (
    <DatabaseContext.Provider value={{ db, isLoading, error }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);

  if (!context) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }

  return context;
}
