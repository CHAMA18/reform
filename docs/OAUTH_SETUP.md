# Enabling GitHub & Google OAuth — Reform

The code is fully wired. The only remaining step is enabling the providers
in your Supabase dashboard and pasting OAuth credentials from GitHub and
Google. This is a one-time setup that takes ~10 minutes per provider.

**Supabase project:** `tibkqqptnsfynihykmsl`
**OAuth callback URL (same for both providers):**
```
https://tibkqqptnsfynihykmsl.supabase.co/auth/v1/callback
```

---

## Part 1 — Enable GitHub OAuth

### 1.1 Create a GitHub OAuth App

1. Go to **https://github.com/settings/developers**
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name:** `Reform`
   - **Homepage URL:** `http://localhost:3000` (use your production URL later)
   - **Authorization callback URL:**
     `https://tibkqqptnsfynihykmsl.supabase.co/auth/v1/callback`
4. Click **"Register application"**
5. On the next page, click **"Generate a new client secret"**
6. **Copy both values now:**
   - Client ID (looks like `Iv1.abc123...`)
   - Client Secret (looks like `abc123...` — only shown once!)

### 1.2 Enable GitHub in Supabase

1. Go to **https://supabase.com/dashboard/project/tibkqqptnsfynihykmsl/auth/providers**
2. Find **GitHub** in the list
3. Toggle the **"Enable GitHub"** switch on
4. Paste the **Client ID** and **Client Secret** from step 1.1
5. Click **"Save"**

GitHub sign-in is now live. Test it at `http://localhost:3000/signin`.

---

## Part 2 — Enable Google OAuth

### 2.1 Create a Google OAuth Client

1. Go to **https://console.cloud.google.com/**
2. Create or select a project (e.g., `Reform`)
3. Configure the OAuth consent screen:
   - Navigate to **APIs & Services → OAuth consent screen**
   - Choose **External** (unless you have a Google Workspace)
   - Fill in app name (`Reform`), support email, developer email
   - Click **Save and Continue** through Scopes and Test Users
4. Create the OAuth Client ID:
   - Navigate to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Reform Supabase`
   - **Authorized JavaScript origins:** add `https://tibkqqptnsfynihykmsl.supabase.co`
   - **Authorized redirect URIs:** add
     `https://tibkqqptnsfynihykmsl.supabase.co/auth/v1/callback`
   - Click **Create**
5. **Copy both values now:**
   - Client ID (looks like `xxxxx.apps.googleusercontent.com`)
   - Client Secret (looks like `GOCSPX-xxxxx`)

### 2.2 Enable Google in Supabase

1. Go to **https://supabase.com/dashboard/project/tibkqqptnsfynihykmsl/auth/providers**
2. Find **Google** in the list
3. Toggle the **"Enable Google"** switch on
4. Paste the **Client ID** and **Client Secret** from step 2.1
5. Click **"Save"**

Google sign-in is now live. Test it at `http://localhost:3000/signin`.

---

## Part 3 — Verify it works

1. Open `http://localhost:3000/signin` (or `/signup`)
2. Click the **GitHub** button → should redirect to `github.com/login/oauth/authorize`
3. Authorize → should redirect back to `/auth/callback` → then to `/dashboard`
4. Repeat for **Google** → should redirect to `accounts.google.com/o/oauth2/v2/auth`

If you see a red alert saying *"GitHub sign-in is not configured for this project yet"*, the provider isn't enabled in Supabase yet — repeat the steps above.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `redirect_uri_mismatch` from GitHub/Google | The callback URL in the GitHub/Google OAuth app doesn't exactly match `https://tibkqqptnsfynihykmsl.supabase.co/auth/v1/callback` |
| `Unsupported provider: provider is not enabled` | You forgot to toggle "Enable" in the Supabase dashboard, or forgot to click Save |
| `invalid_client` from Google | Wrong Client ID / Secret pasted in Supabase |
| Google shows "This app isn't verified" | Normal for dev mode — click "Advanced" → "Go to Reform (unsafe)" |
| OAuth works locally but not in production | Add your production URL to the GitHub/Google OAuth app's authorized origins |

## Production deployment

When you deploy to a real domain (e.g., `https://reform.vercel.app`):

1. Update the **Homepage URL** in your GitHub OAuth app
2. Add the production origin to **Authorized JavaScript origins** in Google
3. The Supabase callback URL stays the same — it always points to Supabase, not your app
4. Update the `redirect_to` param if you want OAuth to land somewhere other than `/dashboard`
