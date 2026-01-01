import Link from "next/link";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { LatestPost } from "~/app/_components/post";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });
  const session = await auth();

  if (session?.user) {
    void api.post.getLatest.prefetch();
  }

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Create <span className="text-primary">T3</span> App
          </h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
            <Card className="max-w-xs hover:bg-accent transition">
              <Link
                href="https://create.t3.gg/en/usage/first-steps"
                target="_blank"
              >
                <CardHeader>
                  <CardTitle className="text-2xl">First Steps →</CardTitle>
                </CardHeader>
                <CardContent className="text-lg text-muted-foreground">
                  Just the basics - Everything you need to know to set up your
                  database and authentication.
                </CardContent>
              </Link>
            </Card>
            <Card className="max-w-xs hover:bg-accent transition">
              <Link
                href="https://create.t3.gg/en/introduction"
                target="_blank"
              >
                <CardHeader>
                  <CardTitle className="text-2xl">Documentation →</CardTitle>
                </CardHeader>
                <CardContent className="text-lg text-muted-foreground">
                  Learn more about Create T3 App, the libraries it uses, and how
                  to deploy it.
                </CardContent>
              </Link>
            </Card>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-2xl">
              {hello ? hello.greeting : "Loading tRPC query..."}
            </p>

            <div className="flex flex-col items-center justify-center gap-4">
              <p className="text-center text-2xl">
                {session && <span>Logged in as {session.user?.name}</span>}
              </p>
              <Button asChild size="lg">
                <Link href={session ? "/api/auth/signout" : "/api/auth/signin"}>
                  {session ? "Sign out" : "Sign in"}
                </Link>
              </Button>
            </div>
          </div>

          {session?.user && <LatestPost />}
        </div>
      </main>
    </HydrateClient>
  );
}
