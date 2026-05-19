import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/dashboard" className="font-semibold">
          {APP_NAME}
        </Link>
      </div>
    </header>
  );
}
