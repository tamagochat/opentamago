import Link from "next/link";
import { Egg, Github } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <Egg className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <span className="text-base sm:text-lg font-bold">OpenTamago</span>
            </Link>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Open-source AI character platform. Create, share, and interact with AI characters.
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-xs sm:text-sm font-semibold">Product</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <Link href="/charx" className="hover:text-foreground transition-colors">
                  CharX Viewer
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-xs sm:text-sm font-semibold">Resources</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <Link href="/docs" className="hover:text-foreground transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/tamagochat/opentamago"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors inline-flex items-center gap-1"
                >
                  <Github className="h-3 w-3 sm:h-4 sm:w-4" />
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-xs sm:text-sm font-semibold">Legal</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 sm:pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
            &copy; {new Date().getFullYear()} OpenTamago. All rights reserved.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-right">
            Built with breakfast 🍳
          </p>
        </div>
      </div>
    </footer>
  );
}
