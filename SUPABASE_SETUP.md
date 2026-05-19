# Supabase Setup Guide

Connect your local project to a real Supabase project in ~10 minutes.

---

## Step 1 — Create a Supabase project

1. Go to **https://supabase.com** and sign in (or create a free account).
2. Click **"New project"**.
3. Fill in:
   - **Name:** `real-estate-ai-builder` (or anything you like)
   - **Database Password:** generate a strong one and save it somewhere safe
   - **Region:** pick the closest to you
4. Click **"Create new project"** and wait ~2 minutes for provisioning.

---

## Step 2 — Get your API credentials

Once the project is ready:

1. In the left sidebar click **Project Settings** (gear icon at the bottom).
2. Click **API** under Project Settings.
3. Copy these three values:

| Setting | Where to find it | Env var name |
|---|---|---|
| Project URL | **Project URL** box at the top | `NEXT_PUBLIC_SUPABASE_URL` |
| Anon / public key | **Project API keys → anon public** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Service role key | **Project API keys → service_role** (click reveal) | `SUPABASE_SERVICE_ROLE_KEY` |

> **Never commit the service role key.** It bypasses all RLS policies.

---

## Step 3 — Update your .env.local

Open `.env.local` in the project root and replace the placeholders:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=replace-with-your-supabase-service-role-key
```

Save the file. The Next.js dev server picks up `.env.local` changes on the next
request (no restart needed for env vars in dev).

---

## Step 4 — Run the database migration

1. In your Supabase dashboard left sidebar, click **SQL Editor**.
2. Click **"New query"** (top-right of the editor panel).
3. Open `supabase/migrations/001_initial_schema.sql` from this project.
4. Copy the entire file contents and paste into the SQL editor.
5. Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`).

You should see:

```
Success. No rows returned
```

---

## Step 5 — Verify the tables exist

1. In the left sidebar click **Table Editor**.
2. You should see two tables: **users** and **projects**.
3. Click each one — the columns should match this structure:

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, foreign key → auth.users |
| `email` | text | not null |
| `full_name` | text | nullable |
| `avatar_url` | text | nullable |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | auto-updated by trigger |

### `projects`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() |
| `user_id` | uuid | FK → users.id, cascade delete |
| `name` | text | not null |
| `slug` | text | not null, unique per user |
| `description` | text | nullable |
| `status` | enum | draft / published / archived |
| `config` | jsonb | AI-generated website config (see SQL for schema) |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | auto-updated by trigger |

---

## Step 6 — Enable Email Auth

1. In the left sidebar click **Authentication**.
2. Click **Providers**.
3. Confirm **Email** is enabled (it is by default).
4. Optional for development: under **Authentication → Settings** scroll to
   **"Confirm email"** and turn it **off** so you can test signup without
   checking your inbox each time. Turn it back on before going to production.

---

## Step 7 — Set the Site URL (for auth redirects)

1. In the left sidebar click **Authentication → URL Configuration**.
2. Set **Site URL** to `http://localhost:3000`.
3. Under **Redirect URLs** click **"Add URL"** and add:
   ```
   http://localhost:3000/auth/callback
   ```
4. Click **Save**.

---

## Step 8 — Verify the app connects

With your real credentials in `.env.local` and the dev server running at
`http://localhost:3000`:

- The middleware will no longer skip session refresh (the `isSupabaseConfigured()`
  guard in `src/lib/supabase/middleware.ts` will return `true`).
- Visiting any protected route (e.g. `/dashboard`) should redirect to `/login`.
- No runtime errors in the terminal output.

---

## What's configured but not yet built

| Feature | Status | File to implement |
|---|---|---|
| Login / register UI forms | Scaffolded | `src/components/auth/login-form.tsx` |
| Auth service (sign in, sign up, sign out) | Scaffolded | `src/services/auth.service.ts` |
| Dashboard data loading | Scaffolded | `src/app/(dashboard)/dashboard/page.tsx` |
| Project CRUD via API | Scaffolded | `src/app/api/v1/` |
| AI listing generation | **TODO** | `src/agents/real-estate/listing.agent.ts` |
| AI SEO generation | **TODO** | `src/agents/real-estate/seo.agent.ts` |

---

## Production checklist (before going live)

- [ ] Re-enable email confirmation in Supabase Auth settings
- [ ] Update `NEXT_PUBLIC_SITE_URL` and Supabase redirect URLs to your production domain
- [ ] Set `NEXT_PUBLIC_APP_URL` to your production URL
- [ ] Rotate your service role key after any accidental exposure
- [ ] Uncomment the `projects_config_gin_idx` GIN index in the migration once AI listing data is stored
- [ ] Uncomment the "Anyone can view published projects" RLS policy when building public site previews
