"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  message?: string;
};

// ─────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const signUpSchema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ─────────────────────────────────────────────
// Sign In
// ─────────────────────────────────────────────

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Invalid email or password" };
  }

  redirect("/dashboard");
}

// ─────────────────────────────────────────────
// Sign Up
// Profile row is created automatically by the handle_new_user DB trigger.
// ─────────────────────────────────────────────

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { fullName, email, password } = parsed.data;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // No session = email confirmation is required
  if (!data.session) {
    return { message: "Check your email to confirm your account, then sign in." };
  }

  redirect("/dashboard");
}

// ─────────────────────────────────────────────
// Sign Out
// ─────────────────────────────────────────────

export async function signOutAction(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
