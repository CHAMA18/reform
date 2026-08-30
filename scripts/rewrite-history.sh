#!/usr/bin/env bash
# Rewrite entire git history of the Reform repo:
#   1. Set author/committer to CHAMA18 <chama18@users.noreply.github.com>
#   2. Replace UUID-based commit messages with detailed, descriptive ones
#
# Uses git filter-branch with --env-filter (author) + --msg-filter (message).
# $GIT_COMMIT inside the msg-filter refers to the ORIGINAL commit hash, so
# we can dispatch on it with a case statement.
#
# After this runs, the local branch must be force-pushed to GitHub.

set -euo pipefail
cd "$(dirname "$0")/.."

# Detailed messages per original commit hash.
declare -A MSGS

MSGS[9d5326b]="chore: scaffold base project structure

Initialize the Reform repository with the bare minimum:
- .env placeholder for local configuration
- .gitignore for Next.js / Bun / Prisma / IDE artifacts
- download/ README stub for generated deliverables

This is the foundation commit that all subsequent work builds on top of."

MSGS[f4626f3]="feat: scaffold Next.js 16 fullstack workspace

Add the complete development workspace for the Reform app:

Tooling & build pipeline
- Next.js 16.1.3 with App Router + Turbopack, TypeScript 5 strict
- Bun as the package manager + runtime (bun.lock)
- ESLint flat config with next-config preset
- Tailwind CSS 4 with shadcn/ui (New York style) component library
- PostCSS pipeline wired for Tailwind v4

Dev / deploy scripts (.zscripts/)
- dev.sh: auto-restart dev server with hot reload
- build.sh: production build with standalone output
- start.sh: production server launcher
- mini-services-{install,build,start}.sh: lifecycle helpers for
  auxiliary Bun services (websocket, etc.)

Infrastructure
- Caddyfile: reverse proxy gateway with XTransformPort routing
  for cross-port API + websocket requests
- prisma/schema.prisma: Prisma ORM config (PostgreSQL client)
- PostgreSQL database (via DATABASE_URL env var)
- examples/websocket/{frontend,server}.ts: socket.io reference
  implementation demonstrating the XTransformPort pattern

UI component baseline
- Full shadcn/ui component set under src/components/ui/
- use-toast + use-mobile hooks
- db + utils libs under src/lib/"

MSGS[315bcf3]="feat(particles): upgrade background to dense two-layer system

Rebuild ParticleBackground.tsx to fill the entire viewport with a
much richer, deeper particle field. Previously a single layer of
4,000 particles; now two stacked layers:

Layer 1 - Ambient field (8,000 particles)
- Wide volumetric bounds (30 x 20 x 14) so particles cover the
  whole viewport at every scroll position
- Boundary wrapping at +/-15 / +/-10 keeps density uniform with
  no empty edges
- Color mix: ~30% Hyper-Blue (#0066ff), ~68% Surface Variant
  (#32343e), ~2% warm accent (#ffb59d) for visual interest
- Additive blending, depthWrite disabled to avoid z-fighting

Layer 2 - Feature stars (500 particles)
- Larger size (0.09 vs 0.04) and higher opacity (0.85 vs 0.55)
  for glowing anchors in the field
- Slower drift velocities so they read as distant stars
- Mix of bright (#4d8bff) and standard (#0066ff) blue

Interaction
- Mouse parallax with smooth damping (0.05 lerp factor)
- Feature layer rotates at 0.32 (vs 0.2 for ambient) and counter-
  rotates on Z axis, producing a parallax depth effect

Also adds reference screenshots under scripts/ for visual QA."

MSGS[9f8d646]="feat(nav): rename primary CTA from 'Launch Engine' to 'Login'

Update the top-right navigation button label to 'Login' to reflect
the new product direction (the app now ships with explicit auth
flows). One-line copy change in src/app/page.tsx; no behavioral
or styling changes."

MSGS[796fb23]="feat(typography): switch global typeface to Satoshi

Replace Inter (loaded via next/font/google) with Satoshi from
Indian Type Foundry, served via the Fontshare CDN. Satoshi is now
the default sans-serif across the entire application.

Changes
- layout.tsx: drop the Inter next/font import; add a Fontshare
  <link> tag in <head> loading weights 300/400/500/700/900
- globals.css: update the Tailwind v4 --font-sans theme token to
  resolve to 'Satoshi' (was previously referencing an undefined
  --font-satoshi var, which silently fell back to Times New Roman
  and broke the entire visual hierarchy)
- globals.css: also hard-code 'Satoshi' in the dark-mode body
  styling block for the same reason
- page.tsx: add explicit font-mono class to the <pre> code block
  so JetBrains Mono wins over the browser's default pre UA rule
- layout.tsx: add suppressHydrationWarning to <body> to silence
  the Grammarly browser extension hydration mismatch warning

Verified via Agent Browser that all h1/h2/h3/p/button elements
resolve to Satoshi, while <pre> stays on JetBrains Mono."

MSGS[2713180]="feat(auth): add immersive auth and dashboard flows

First pass at turning the static marketing page into a real app.
Adds Supabase-backed authentication, a dashboard, and the first
template browsing experience.

New pages
- src/app/signin/page.tsx: full-screen sign-in screen with email +
  password form, particle background, and Satoshi typography
- src/app/signup/page.tsx: matching sign-up screen with email /
  password / confirm-password fields
- src/app/dashboard/page.tsx: initial authenticated dashboard shell
  with welcome hero and entry-point cards
- src/app/templates/page.tsx: browsable template gallery with
  filterable cards

Updated core
- src/app/page.tsx: wire the 'Login' CTA to /signin
- src/app/layout.tsx: minor layout adjustments for the new routes
- src/app/globals.css: large stylesheet expansion (+485 lines) for
  auth pages, dashboard layout, form controls, and animations
- src/components/ParticleBackground.tsx: refactor to support being
  embedded inside page-level containers (not just the global
  background), so auth pages can have their own particle canvas

Tooling
- package-lock.json: lockfile generated by npm install (note: the
  canonical lockfile for this repo is bun.lock - this file should
  probably be removed in a follow-up cleanup commit)"

MSGS[e067235]="feat(app): full app shell, theme toggle, and remaining pages

Complete the authenticated app surface. Adds a persistent app
shell with sidebar navigation, light/dark theme support, and the
remaining feature pages.

New components
- src/components/app-shell.tsx: persistent sidebar + topbar layout
  wrapping all authenticated routes; active-link highlighting,
  responsive collapse on mobile, glass-morphism styling matching
  the marketing site
- src/components/theme-provider.tsx: next-themes wrapper enabling
  class-based dark/light mode switching
- src/components/theme-toggle-button.tsx: animated sun/moon toggle
  using Material Symbols icons

New pages
- src/app/api-keys/page.tsx: API key management (create, list,
  revoke) with copy-to-clipboard
- src/app/forms/new/page.tsx: visual form builder with field type
  palette, live preview, and JSON schema export
- src/app/settings/page.tsx: user settings (profile, security,
  notifications, billing sections)
- src/app/submissions/page.tsx: submissions inbox with filtering,
  status badges, and per-row expand

Refinements
- src/app/dashboard/page.tsx: streamlined to a focused welcome
  hero (removed the experimental mock cards)
- src/app/templates/page.tsx: redesigned card layout, better
  empty states, and improved filter UX
- src/app/signin/page.tsx + signup/page.tsx: minor polish
- src/app/globals.css: +369 lines of new utility classes for the
  app shell, theme toggle, form builder, and submissions table
- src/components/ParticleBackground.tsx: small tweaks to opacity
  and parallax depth to feel less distracting inside the app shell
- src/app/layout.tsx: wrap children in ThemeProvider
- src/app/page.tsx: marketing page adjustments

Also adds Supabase CLI temp config under supabase/.temp/ (project
ref, pooler URL, version metadata). These files are typically not
committed - they should be gitignored in a follow-up."

MSGS[5d90a5d]="chore: rebase local changes onto latest origin/main

Replay the local working-tree changes on top of the remote
auth + dashboard work after \`git pull --rebase\`. Mostly file-mode
normalization (no line changes) plus a small set of touch-ups to
keep the marketing page in sync with the new app shell conventions.

No user-facing behavior change."

# Pick the message for the current commit (passed via $GIT_COMMIT).
msg_for() {
  local hash="$1"
  if [[ -n "${MSGS[$hash]:-}" ]]; then
    printf '%s\n' "${MSGS[$hash]}"
  else
    # Fallback: pass through the original message verbatim.
    cat
  fi
}
export -f msg_for
export MSGS

# Author / committer identity we are rewriting to.
export GIT_AUTHOR_NAME="CHAMA18"
export GIT_AUTHOR_EMAIL="chama18@users.noreply.github.com"
export GIT_COMMITTER_NAME="CHAMA18"
export GIT_COMMITTER_EMAIL="chama18@users.noreply.github.com"

# Back up the current branch tip so we can roll back if needed.
ORIG_REF="$(git rev-parse HEAD)"
echo "Original HEAD: $ORIG_REF"
echo "  (rollback with: git reset --hard $ORIG_REF)"
echo ""

# filter-branch: rewrite both env (author/committer) and message.
# --msg-filter receives the original message on stdin and must emit
# the new message on stdout. We dispatch on $GIT_COMMIT (original hash).
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f \
  --env-filter '
    export GIT_AUTHOR_NAME="CHAMA18"
    export GIT_AUTHOR_EMAIL="chama18@users.noreply.github.com"
    export GIT_COMMITTER_NAME="CHAMA18"
    export GIT_COMMITTER_EMAIL="chama18@users.noreply.github.com"
  ' \
  --msg-filter '
    hash="$GIT_COMMIT"
    case "$hash" in
      9d5326b*) cat <<\MSG_EOF
chore: scaffold base project structure

Initialize the Reform repository with the bare minimum:
- .env placeholder for local configuration
- .gitignore for Next.js / Bun / Prisma / IDE artifacts
- download/ README stub for generated deliverables

This is the foundation commit that all subsequent work builds on top of.
MSG_EOF
        ;;
      f4626f3*) cat <<\MSG_EOF
feat: scaffold Next.js 16 fullstack workspace

Add the complete development workspace for the Reform app:

Tooling & build pipeline
- Next.js 16.1.3 with App Router + Turbopack, TypeScript 5 strict
- Bun as the package manager + runtime (bun.lock)
- ESLint flat config with next-config preset
- Tailwind CSS 4 with shadcn/ui (New York style) component library
- PostCSS pipeline wired for Tailwind v4

Dev / deploy scripts (.zscripts/)
- dev.sh: auto-restart dev server with hot reload
- build.sh: production build with standalone output
- start.sh: production server launcher
- mini-services-{install,build,start}.sh: lifecycle helpers for
  auxiliary Bun services (websocket, etc.)

Infrastructure
- Caddyfile: reverse proxy gateway with XTransformPort routing
  for cross-port API + websocket requests
- prisma/schema.prisma: Prisma ORM config (PostgreSQL client)
- PostgreSQL database (via DATABASE_URL env var)
- examples/websocket/{frontend,server}.ts: socket.io reference
  implementation demonstrating the XTransformPort pattern

UI component baseline
- Full shadcn/ui component set under src/components/ui/
- use-toast + use-mobile hooks
- db + utils libs under src/lib/
MSG_EOF
        ;;
      315bcf3*) cat <<\MSG_EOF
feat(particles): upgrade background to dense two-layer system

Rebuild ParticleBackground.tsx to fill the entire viewport with a
much richer, deeper particle field. Previously a single layer of
4,000 particles; now two stacked layers:

Layer 1 - Ambient field (8,000 particles)
- Wide volumetric bounds (30 x 20 x 14) so particles cover the
  whole viewport at every scroll position
- Boundary wrapping at +/-15 / +/-10 keeps density uniform with
  no empty edges
- Color mix: ~30% Hyper-Blue (#0066ff), ~68% Surface Variant
  (#32343e), ~2% warm accent (#ffb59d) for visual interest
- Additive blending, depthWrite disabled to avoid z-fighting

Layer 2 - Feature stars (500 particles)
- Larger size (0.09 vs 0.04) and higher opacity (0.85 vs 0.55)
  for glowing anchors in the field
- Slower drift velocities so they read as distant stars
- Mix of bright (#4d8bff) and standard (#0066ff) blue

Interaction
- Mouse parallax with smooth damping (0.05 lerp factor)
- Feature layer rotates at 0.32 (vs 0.2 for ambient) and counter-
  rotates on Z axis, producing a parallax depth effect

Also adds reference screenshots under scripts/ for visual QA.
MSG_EOF
        ;;
      9f8d646*) cat <<\MSG_EOF
feat(nav): rename primary CTA from 'Launch Engine' to 'Login'

Update the top-right navigation button label to 'Login' to reflect
the new product direction (the app now ships with explicit auth
flows). One-line copy change in src/app/page.tsx; no behavioral
or styling changes.
MSG_EOF
        ;;
      796fb23*) cat <<\MSG_EOF
feat(typography): switch global typeface to Satoshi

Replace Inter (loaded via next/font/google) with Satoshi from
Indian Type Foundry, served via the Fontshare CDN. Satoshi is now
the default sans-serif across the entire application.

Changes
- layout.tsx: drop the Inter next/font import; add a Fontshare
  <link> tag in <head> loading weights 300/400/500/700/900
- globals.css: update the Tailwind v4 --font-sans theme token to
  resolve to 'Satoshi' (was previously referencing an undefined
  --font-satoshi var, which silently fell back to Times New Roman
  and broke the entire visual hierarchy)
- globals.css: also hard-code 'Satoshi' in the dark-mode body
  styling block for the same reason
- page.tsx: add explicit font-mono class to the <pre> code block
  so JetBrains Mono wins over the browser's default pre UA rule
- layout.tsx: add suppressHydrationWarning to <body> to silence
  the Grammarly browser extension hydration mismatch warning

Verified via Agent Browser that all h1/h2/h3/p/button elements
resolve to Satoshi, while <pre> stays on JetBrains Mono.
MSG_EOF
        ;;
      2713180*) cat <<\MSG_EOF
feat(auth): add immersive auth and dashboard flows

First pass at turning the static marketing page into a real app.
Adds Supabase-backed authentication, a dashboard, and the first
template browsing experience.

New pages
- src/app/signin/page.tsx: full-screen sign-in screen with email +
  password form, particle background, and Satoshi typography
- src/app/signup/page.tsx: matching sign-up screen with email /
  password / confirm-password fields
- src/app/dashboard/page.tsx: initial authenticated dashboard shell
  with welcome hero and entry-point cards
- src/app/templates/page.tsx: browsable template gallery with
  filterable cards

Updated core
- src/app/page.tsx: wire the 'Login' CTA to /signin
- src/app/layout.tsx: minor layout adjustments for the new routes
- src/app/globals.css: large stylesheet expansion (+485 lines) for
  auth pages, dashboard layout, form controls, and animations
- src/components/ParticleBackground.tsx: refactor to support being
  embedded inside page-level containers (not just the global
  background), so auth pages can have their own particle canvas

Tooling
- package-lock.json: lockfile generated by npm install (note: the
  canonical lockfile for this repo is bun.lock - this file should
  probably be removed in a follow-up cleanup commit)
MSG_EOF
        ;;
      e067235*) cat <<\MSG_EOF
feat(app): full app shell, theme toggle, and remaining pages

Complete the authenticated app surface. Adds a persistent app
shell with sidebar navigation, light/dark theme support, and the
remaining feature pages.

New components
- src/components/app-shell.tsx: persistent sidebar + topbar layout
  wrapping all authenticated routes; active-link highlighting,
  responsive collapse on mobile, glass-morphism styling matching
  the marketing site
- src/components/theme-provider.tsx: next-themes wrapper enabling
  class-based dark/light mode switching
- src/components/theme-toggle-button.tsx: animated sun/moon toggle
  using Material Symbols icons

New pages
- src/app/api-keys/page.tsx: API key management (create, list,
  revoke) with copy-to-clipboard
- src/app/forms/new/page.tsx: visual form builder with field type
  palette, live preview, and JSON schema export
- src/app/settings/page.tsx: user settings (profile, security,
  notifications, billing sections)
- src/app/submissions/page.tsx: submissions inbox with filtering,
  status badges, and per-row expand

Refinements
- src/app/dashboard/page.tsx: streamlined to a focused welcome
  hero (removed the experimental mock cards)
- src/app/templates/page.tsx: redesigned card layout, better
  empty states, and improved filter UX
- src/app/signin/page.tsx + signup/page.tsx: minor polish
- src/app/globals.css: +369 lines of new utility classes for the
  app shell, theme toggle, form builder, and submissions table
- src/components/ParticleBackground.tsx: small tweaks to opacity
  and parallax depth to feel less distracting inside the app shell
- src/app/layout.tsx: wrap children in ThemeProvider
- src/app/page.tsx: marketing page adjustments

Also adds Supabase CLI temp config under supabase/.temp/ (project
ref, pooler URL, version metadata). These files are typically not
committed - they should be gitignored in a follow-up.
MSG_EOF
        ;;
      5d90a5d*) cat <<\MSG_EOF
chore: rebase local changes onto latest origin/main

Replay the local working-tree changes on top of the remote
auth + dashboard work after \`git pull --rebase\`. Mostly file-mode
normalization (no line changes) plus a small set of touch-ups to
keep the marketing page in sync with the new app shell conventions.

No user-facing behavior change.
MSG_EOF
        ;;
      *) cat ;;
    esac
  ' \
  -- --all

echo ""
echo "============================================================"
echo "Rewritten history:"
echo "============================================================"
git log --pretty=format:'%h | %an <%ae> | %s' -10
echo ""
