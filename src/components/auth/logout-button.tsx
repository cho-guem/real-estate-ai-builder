"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      disabled={isSigningOut}
      onClick={handleSignOut}
      className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
    >
      <LogOut className="h-4 w-4 shrink-0" />
      {isSigningOut ? "로그아웃 중..." : "로그아웃"}
    </Button>
  );
}
