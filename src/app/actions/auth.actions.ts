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
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

const signUpSchema = z
  .object({
    fullName: z.string().min(2, "이름은 2자 이상 입력해주세요"),
    email: z.string().email("올바른 이메일 주소를 입력해주세요"),
    password: z.string().min(8, "비밀번호는 8자 이상 입력해주세요"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
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
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다" };
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

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });

    console.warn("[auth.signUp] response", {
      hasUser: Boolean(data.user),
      userId: data.user?.id ?? null,
      email: data.user?.email ?? email,
      hasSession: Boolean(data.session),
      identitiesCount: data.user?.identities?.length ?? null,
    });

    if (error) {
      console.error("[auth.signUp] error", {
        message: error.message,
        status: error.status,
        code: error.code,
      });
      return { error: toSignUpErrorMessage(error.message) };
    }

    if (!data.user) {
      console.error("[auth.signUp] missing user", { email });
      return {
        error:
          "회원가입 요청은 처리되었지만 사용자 정보가 생성되지 않았습니다. 잠시 후 다시 시도해주세요.",
      };
    }

    if (data.user.identities && data.user.identities.length === 0) {
      console.error("[auth.signUp] existing email detected", { email });
      return {
        error: "이미 가입된 이메일입니다. 로그인하거나 비밀번호 재설정을 이용해주세요.",
      };
    }

    return {
      message: data.session
        ? "회원가입이 완료되었습니다."
        : "가입하신 이메일로 인증 링크를 보내드렸어요.",
    };
  } catch (error) {
    console.error("[auth.signUp] unexpected error", error);
    return {
      error:
        "네트워크 또는 인증 서버 오류로 회원가입을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

function toSignUpErrorMessage(message: string) {
  const lower = message.toLowerCase();

  if (
    lower.includes("already registered") ||
    lower.includes("already exists") ||
    lower.includes("user already")
  ) {
    return "이미 가입된 이메일입니다. 로그인하거나 비밀번호 재설정을 이용해주세요.";
  }

  if (lower.includes("password")) {
    return "비밀번호 조건을 확인해주세요.";
  }

  if (lower.includes("email")) {
    return "이메일 주소를 확인해주세요.";
  }

  return message || "회원가입 중 오류가 발생했습니다.";
}

// ─────────────────────────────────────────────
// Sign Out
// ─────────────────────────────────────────────

export async function signOutAction(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
