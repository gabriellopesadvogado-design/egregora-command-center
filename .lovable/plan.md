

## Problem

The root project has a minimal `package.json` (no `dev` script, no Vite) and an almost-empty `src/` folder. The full application lives under `futuro-astra-main/` and cannot be reached by the dev server.

## Plan

### 1. Restore root package.json
Copy the full `package.json` from `futuro-astra-main/` to the root, keeping the Supabase connection env vars. Merge the existing `@supabase/supabase-js` dependency.

### 2. Restore root config files
Copy these from `futuro-astra-main/` to root:
- `vite.config.ts`
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- `index.html`
- `postcss.config.js`
- `tailwind.config.ts`
- `eslint.config.js`
- `components.json`

### 3. Restore source code
Copy from `futuro-astra-main/src/` to `src/`:
- `main.tsx`, `App.tsx`, `App.css`, `index.css`, `vite-env.d.ts`
- `pages/`, `components/`, `hooks/`, `lib/`, `utils/`, `assets/`, `test/`
- Update `src/integrations/supabase/client.ts` to use the already-existing root version (which points to the connected Supabase project)

### 4. Restore public assets
Copy `futuro-astra-main/public/` contents to `public/`.

### 5. Update Supabase client
Ensure `src/integrations/supabase/client.ts` and `types.ts` use the connected project's credentials (already in `.env`). The types file should reflect the new `egregora-command-center` schema (tables like `core_users`, `crm_meetings`, `crm_leads`, etc.) rather than the old project's schema.

### 6. Verify build
The `dev` script will now work since Vite + React are properly configured at the root.

### Technical details
- ~40 files need to be created/copied at root level
- The Supabase types will need regeneration to match the new schema, but the app will compile and render immediately
- Existing components reference old table names (`meetings`, `leads`, `profiles`); these will need updates in a follow-up to work with the new schema (`crm_meetings`, `crm_leads`, `core_users`)

