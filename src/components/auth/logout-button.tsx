"use client";

import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/actions/auth.actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={signOutAction}>
      <Button
        type="submit"
        variant="ghost"
        className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        로그아웃
      </Button>
    </form>
  );
}
