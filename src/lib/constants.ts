export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Real Estate AI Builder";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  projects: "/projects",
  settings: "/settings",
} as const;

export const AUTH_REDIRECT_URL = `${APP_URL}/auth/callback`;
