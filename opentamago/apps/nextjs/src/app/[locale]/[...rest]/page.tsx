import { notFound } from "next/navigation";

// Catch-all route to trigger locale-aware not-found page
export default function CatchAllPage() {
  notFound();
}
