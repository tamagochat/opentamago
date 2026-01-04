"use client";

import { useEffect, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useDatabase } from "./useDatabase";
import type { PersonaDocument } from "../schemas";

// Helper to convert RxDB's DeepReadonlyObject to mutable
function toMutable<T>(obj: unknown): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export function usePersonas() {
  const { db, isLoading: dbLoading } = useDatabase();
  const [personas, setPersonas] = useState<PersonaDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const subscription = db.personas
      .find()
      .sort({ updatedAt: "desc" })
      .$
      .subscribe((docs) => {
        setPersonas(docs.map((doc) => toMutable<PersonaDocument>(doc.toJSON())));
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [db]);

  const createPersona = useCallback(
    async (data: Omit<PersonaDocument, "id" | "createdAt" | "updatedAt">) => {
      if (!db) {
        console.error("Database not initialized");
        return null;
      }

      try {
        const now = Date.now();
        const persona: PersonaDocument = {
          ...data,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        };

        await db.personas.insert(persona);
        return persona;
      } catch (error) {
        console.error("Error inserting persona:", error);
        throw error;
      }
    },
    [db]
  );

  const updatePersona = useCallback(
    async (id: string, data: Partial<PersonaDocument>) => {
      if (!db) return null;

      const doc = await db.personas.findOne(id).exec();
      if (!doc) return null;

      await doc.patch({
        ...data,
        updatedAt: Date.now(),
      });

      return toMutable<PersonaDocument>(doc.toJSON());
    },
    [db]
  );

  const deletePersona = useCallback(
    async (id: string) => {
      if (!db) return false;

      const doc = await db.personas.findOne(id).exec();
      if (!doc) return false;

      await doc.remove();
      return true;
    },
    [db]
  );

  const getPersona = useCallback(
    async (id: string) => {
      if (!db) return null;

      const doc = await db.personas.findOne(id).exec();
      return doc ? toMutable<PersonaDocument>(doc.toJSON()) : null;
    },
    [db]
  );

  return {
    personas,
    isLoading: dbLoading || isLoading,
    createPersona,
    updatePersona,
    deletePersona,
    getPersona,
  };
}
