# WordPress Auto-Deployment Architecture

This project now has the foundation for a multi-client WordPress deployment SaaS.

## Target Flow

1. User completes the AI website workflow.
2. User starts WordPress deployment from the project dashboard.
3. The app creates:
   - `wordpress_sites`
   - `wordpress_deployments`
   - `wordpress_deployment_steps`
4. A production worker executes the queued deployment:
   - Create WordPress automatically
   - Create admin account
   - Install `ai-real-estate-property-manager`
   - Activate the plugin
   - Run the plugin setup wizard
   - Import Elementor template
   - Connect domain
5. Dashboard polls deployment status and shows progress.

Deployment status flow:

```text
queued -> validating -> deploying -> importing -> configuring -> completed
```

Failures move to `failed`. Retryable failures are moved back to `queued` with `retry_count`, `last_attempt_at`, and `next_retry_at` updated.

## Architecture Boundary

```text
Next.js dashboard
  -> Supabase deployment records
  -> Deployment worker
  -> Docker / WP-CLI / Hosting Provider API
  -> WordPress REST API
```

The Next.js API records the deployment plan. Long-running WP-CLI work should run outside Vercel in a worker, queue, or container host.

## Supabase Tables

Migration: `supabase/migrations/004_wordpress_deployment_schema.sql`

- `wordpress_sites`
- `wordpress_deployments`
- `wordpress_deployment_steps`

Every table is scoped by `user_id` and protected with RLS.

## Deployment Providers

Supported provider modes:

- `mock`: Save the deployment plan only.
- `docker`: Provision a WordPress container and run WP-CLI.
- `wp_cli`: Use WP-CLI against an existing server.
- `managed_host`: Delegate provisioning to a hosting provider adapter.

## WP-CLI Worker Commands

Run the TypeScript worker:

```bash
npm run wordpress:worker
```

Production command on the worker server:

```bash
cp .env.wordpress.production.example .env.production
set -a && . ./.env.production && set +a
npm run wordpress:worker
```

For process managers:

```bash
REAL_DEPLOYMENT=true WORDPRESS_DEPLOYMENT_MODE=real WORDPRESS_WORKER_DRY_RUN=false npm run wordpress:worker
```

The worker reads queued rows from `wordpress_deployments`, claims each job, updates deployment step rows, and stores logs in the `output.logs` / `metadata.logs` JSON fields.

If hosting credentials or `WORDPRESS_TARGET_PATH` are missing, the worker automatically runs in dry-run mode and records the commands it would execute.

Before real deployment, the worker runs preflight checks:

- Supabase connection and deployment table access
- `WORDPRESS_TARGET_PATH` exists
- `wp-config.php` exists inside `WORDPRESS_TARGET_PATH`
- WP-CLI responds to `wp --info`
- WordPress responds to `wp plugin list --format=json`
- Plugin ZIP exists
- Elementor template JSON exists

Every preflight result is saved into the deployment `output.logs`. If any check fails in real deployment mode, the worker marks the deployment as failed and refuses to execute WP-CLI deployment commands.

## Real Deployment Mode

For cPanel/ChemiCloud hosting where WordPress is already installed and WP-CLI is available, enable real execution only on the worker server:

```bash
REAL_DEPLOYMENT=true
WORDPRESS_DEPLOYMENT_MODE=real
WORDPRESS_WORKER_DRY_RUN=false
WORDPRESS_REQUIRE_DEPLOYMENT_CONFIRMATION=true
WORDPRESS_TARGET_PATH=/home/your-cpanel-user/public_html
WORDPRESS_WPCLI_BIN=wp
WORDPRESS_ADMIN_PASSWORD="generate-a-strong-password"
WORDPRESS_PLUGIN_PACKAGE_PATH=/absolute/path/ai-real-estate-property-manager-wizard.zip
WORDPRESS_ELEMENTOR_TEMPLATE_PATH=/absolute/path/elementor-template.json
```

The worker supports path-based cPanel deployments. `WORDPRESS_TARGET_PATH` should point to the existing WordPress document root, typically:

```text
/home/{cpanel-user}/public_html
```

Preflight must pass before real execution:

```bash
test -f "$WORDPRESS_TARGET_PATH/wp-config.php"
wp --info
wp plugin list --format=json --path="$WORDPRESS_TARGET_PATH"
```

The worker still refuses to execute real WP-CLI commands unless the queued `wordpress_deployments.input` contains one of:

```json
{
  "deploymentConfirmed": true,
  "confirmationStatus": "confirmed",
  "realDeploymentConfirmed": true
}
```

This confirmation gate prevents accidental destructive execution. Rollback is intentionally non-destructive: if a step fails, the worker attempts to deactivate the generated plugin and remove the uploaded plugin ZIP, but it does not delete the WordPress installation, pages, users, database tables, or domain configuration.

## What The Worker Executes

The real worker handles:

- queued deployment execution
- WP-CLI connection to an existing WordPress path
- plugin ZIP upload/copy
- plugin install and activation
- setup wizard execution, which creates pages, assigns front page, creates menus, and configures SEO defaults
- Elementor template import via WP-CLI when Elementor CLI is available
- deployment status tracking
- logs persisted to Supabase
- failed/success handling
- retry scheduling
- multi-client isolation through `project_id` and `user_id`

The worker executes commands equivalent to:

```bash
wp core install \
  --url="$SITE_URL" \
  --title="$SITE_NAME" \
  --admin_user="$ADMIN_USERNAME" \
  --admin_password="$ADMIN_PASSWORD" \
  --admin_email="$ADMIN_EMAIL"

wp plugin install ai-real-estate-property-manager-wizard.zip --force
wp plugin activate ai-real-estate-property-manager

wp eval 'AI_Real_Estate_Property_Manager::instance()->run_initial_setup(array(
  "business_type" => getenv("AIREPM_BUSINESS_TYPE"),
  "company_name" => getenv("AIREPM_COMPANY_NAME"),
  "main_color" => getenv("AIREPM_MAIN_COLOR"),
  "region" => getenv("AIREPM_REGION"),
));'
```

Elementor import depends on Elementor Pro/CLI availability. The stable fallback is to create pages with Elementor-ready HTML sections and shortcodes, which the plugin setup wizard already does.

## Local Docker Smoke Test

```bash
docker compose -f docker-compose.wordpress.yml up -d
docker compose -f docker-compose.wordpress.yml run --rm wpcli wp core version
docker compose -f docker-compose.wordpress.yml run --rm wpcli wp plugin activate ai-real-estate-property-manager
```

Open:

```text
http://localhost:8080
```

## Production Requirements

- A worker runtime that can run Docker or WP-CLI.
- Secure admin password generation and encryption.
- Provider-specific domain DNS adapter.
- Elementor plugin availability and import strategy.
- Deployment log streaming.
- Retry and rollback policy.
- Per-client resource isolation.

## Multi-Client Model

Each deployment belongs to a project and user:

```text
users
  -> projects
    -> wordpress_sites
      -> wordpress_deployments
        -> wordpress_deployment_steps
```

This keeps generated sites separated by tenant and allows one user to manage multiple client websites.
