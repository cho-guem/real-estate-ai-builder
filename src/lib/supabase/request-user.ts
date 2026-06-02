import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/types/database.types";

export type RequestUser = Pick<Tables<"users">, "id" | "email">;

type RequestDbAndUser = {
  db: SupabaseClient<Database>;
  user: RequestUser;
  isFallbackUser: boolean;
};

const FALLBACK_USER_EMAIL =
  process.env.WEBSITE_GENERATOR_FALLBACK_USER_EMAIL ?? "admin@monopoint.co.kr";

export async function getRequestDbAndUser(): Promise<RequestDbAndUser> {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (user) {
    return {
      db,
      user: {
        id: user.id,
        email: user.email ?? FALLBACK_USER_EMAIL,
      },
      isFallbackUser: false,
    };
  }

  const serviceDb = await createServiceClient();
  const fallbackUser = await ensureFallbackUser(serviceDb);

  return {
    db: serviceDb,
    user: fallbackUser,
    isFallbackUser: true,
  };
}

async function ensureFallbackUser(db: SupabaseClient<Database>): Promise<RequestUser> {
  const { data: existingUser, error: existingUserError } = await db
    .from("users")
    .select("id,email")
    .eq("email", FALLBACK_USER_EMAIL)
    .maybeSingle();

  if (existingUserError) {
    throw existingUserError;
  }

  if (existingUser) {
    return existingUser;
  }

  const password = crypto.randomUUID() + crypto.randomUUID();
  const { data, error } = await db.auth.admin.createUser({
    email: FALLBACK_USER_EMAIL,
    password,
    email_confirm: true,
  });

  if (error) {
    throw error;
  }

  if (!data.user?.id) {
    throw new Error("Fallback Supabase auth user was not created.");
  }

  const { data: profile, error: profileError } = await db
    .from("users")
    .upsert({
      id: data.user.id,
      email: data.user.email ?? FALLBACK_USER_EMAIL,
    })
    .select("id,email")
    .single();

  if (profileError) {
    throw profileError;
  }

  return profile;
}
