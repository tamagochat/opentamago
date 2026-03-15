import { createFileRoute } from "@tanstack/react-router";

import { AuthShowcase } from "~/component/auth-showcase";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="container h-screen py-16">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Open<span className="text-primary">Tamago</span>
        </h1>
        <AuthShowcase />
      </div>
    </main>
  );
}
