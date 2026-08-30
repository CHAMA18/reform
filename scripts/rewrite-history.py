#!/usr/bin/env python3
"""
Rewrite the entire git history of the Reform repo:
  1. Set author + committer to CHAMA18 <chama18@users.noreply.github.com>
  2. Replace UUID-based / terse commit messages with detailed, descriptive ones

Strategy: walk commits oldest -> newest, and for each one do
`git cherry-pick` then `git commit --amend` with the new author and message.
This avoids the heredoc parsing pain of `git filter-branch --msg-filter`.

After this script runs, the local `main` branch must be force-pushed.
"""

import os
import subprocess
import sys
import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

AUTHOR = "CHAMA18 <chama18@users.noreply.github.com>"

# Map: original commit hash (short) -> new detailed commit message.
# Hashes are matched by prefix so the script keeps working even if
# filter-branch rewrote them once already.
MSGS = {
    "9d5326b": """chore: scaffold base project structure

Initialize the Reform repository with the bare minimum:
- .env placeholder for local configuration
- .gitignore for Next.js / Bun / Prisma / IDE artifacts
- download/ README stub for generated deliverables

This is the foundation commit that all subsequent work builds on top of.""",

    "f4626f3": """feat: scaffold Next.js 16 fullstack workspace

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
- prisma/schema.prisma: Prisma ORM config (SQLite client)
- db/custom.db: local SQLite database file
- examples/websocket/{frontend,server}.ts: socket.io reference
  implementation demonstrating the XTransformPort pattern

UI component baseline
- Full shadcn/ui component set under src/components/ui/
- use-toast + use-mobile hooks
- db + utils libs under src/lib/""",

    "315bcf3": """feat(particles): upgrade background to dense two-layer system

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

Also adds reference screenshots under scripts/ for visual QA.""",

    "9f8d646": """feat(nav): rename primary CTA from 'Launch Engine' to 'Login'

Update the top-right navigation button label to 'Login' to reflect
the new product direction (the app now ships with explicit auth
flows). One-line copy change in src/app/page.tsx; no behavioral
or styling changes.""",

    "796fb23": """feat(typography): switch global typeface to Satoshi

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
resolve to Satoshi, while <pre> stays on JetBrains Mono.""",

    "2713180": """feat(auth): add immersive auth and dashboard flows

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
  probably be removed in a follow-up cleanup commit)""",

    "e067235": """feat(app): full app shell, theme toggle, and remaining pages

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
committed - they should be gitignored in a follow-up.""",

    "5d90a5d": """chore: rebase local changes onto latest origin/main

Replay the local working-tree changes on top of the remote
auth + dashboard work after `git pull --rebase`. Mostly file-mode
normalization (no line changes) plus a small set of touch-ups to
keep the marketing page in sync with the new app shell conventions.

No user-facing behavior change.""",
}


def run(cmd, check=True, capture=False):
    """Run a shell command, optionally capturing output."""
    if capture:
        r = subprocess.run(cmd, shell=True, cwd=REPO, capture_output=True, text=True)
        if check and r.returncode != 0:
            sys.stderr.write(f"Command failed: {cmd}\n{r.stderr}\n")
            sys.exit(1)
        return r.stdout.strip()
    else:
        r = subprocess.run(cmd, shell=True, cwd=REPO)
        if check and r.returncode != 0:
            sys.stderr.write(f"Command failed: {cmd}\n")
            sys.exit(1)
        return None


def find_message(short_hash: str) -> str | None:
    """Return the new message for a commit, matching by hash prefix."""
    for prefix, msg in MSGS.items():
        if short_hash.startswith(prefix) or prefix.startswith(short_hash):
            return msg
    return None


def main():
    # Save the current branch tip so we can roll back.
    orig_head = run("git rev-parse HEAD", capture=True)
    print(f"Original HEAD: {orig_head}")
    print(f"  rollback with: git reset --hard {orig_head}")
    print()

    # Get the list of commits oldest -> newest.
    log = run("git log --reverse --pretty=format:'%h|%an|%s'", capture=True)
    commits = []
    for line in log.splitlines():
        parts = line.split("|", 2)
        if len(parts) == 3:
            commits.append({"hash": parts[0], "author": parts[1], "subject": parts[2]})

    print(f"Found {len(commits)} commits to rewrite:")
    for c in commits:
        new_msg = find_message(c["hash"])
        marker = "OK" if new_msg else "PASS-THROUGH"
        print(f"  [{marker}] {c['hash']}  {c['subject'][:60]}")
    print()

    # Create an orphan branch and rebuild history commit-by-commit.
    # We use `git checkout --orphan` to start fresh, then replay each
    # original commit's tree with the new author + message.
    backup_branch = "backup/pre-rewrite-" + orig_head[:8]
    run(f"git branch -f {backup_branch} HEAD", check=False)
    print(f"Created backup branch: {backup_branch}")
    print()

    # Use git rebase --root with a custom sequence editor that rewrites
    # every `pick` line to `reword`, plus a custom GIT_EDITOR that picks
    # the right message per commit. This is the most reliable approach
    # because it walks every commit in order without orphan shenanigans.

    # Build the new-message lookup as a Python dict the editor script can read.
    msgs_json = json.dumps({k: v for k, v in MSGS.items()})

    editor_script = REPO / "scripts" / "_reword_editor.py"
    editor_script.write_text(f"""#!/usr/bin/env python3
import json, os, sys

MSGS = json.loads({json.dumps(msgs_json)})

def find_message(short_hash):
    for prefix, msg in MSGS.items():
        if short_hash.startswith(prefix) or prefix.startswith(short_hash):
            return msg
    return None

# The file path is passed as argv[1]. For `git commit --amend` style,
# this file contains the current commit message. We want to replace it.
path = sys.argv[1]
with open(path) as f:
    content = f.read()

# Get the current commit hash from the environment. GIT_EDITOR is invoked
# per-commit during rebase -i, so we can look up the right message.
# Actually, GIT_EDITOR is invoked without per-commit env vars. Instead we
# parse the original subject line from the file (the first non-comment line)
# and match on that.
lines = [l for l in content.splitlines() if not l.startswith('#')]
print(f"Editor saw lines: {{lines[:3]}}", file=sys.stderr)
# We can't easily get the commit hash here, so this approach won't work.
# Bail out - we'll use a different strategy below.
sys.exit(0)
""")
    editor_script.chmod(0o755)

    # The above approach doesn't work because GIT_EDITOR doesn't have
    # per-commit context. Use the much simpler approach: cherry-pick
    # each commit onto an orphan branch, then amend.
    print("Rebuilding history via cherry-pick + amend...")
    run("git checkout --orphan _rewrite_temp", check=False)
    run("git rm -rf .", check=False)

    for i, c in enumerate(commits, 1):
        print(f"[{i}/{len(commits)}] Cherry-picking {c['hash']} ({c['subject'][:50]})")
        # Cherry-pick with no commit so we can re-commit with new metadata
        r = subprocess.run(
            f"git cherry-pick --no-commit {c['hash']}",
            shell=True, cwd=REPO, capture_output=True, text=True
        )
        if r.returncode != 0:
            # Likely an empty cherry-pick (mode-only changes). Stage everything
            # from the original tree instead.
            print(f"  cherry-pick returned {r.returncode}: {r.stderr.strip()[:120]}")
            # Force checkout the tree from the original commit
            run(f"git checkout {c['hash']} -- .", check=False)
            run("git add -A", check=False)

        new_msg = find_message(c["hash"])
        if new_msg is None:
            # Pass through the original message
            new_msg = run(f"git log -1 --pretty=%B {c['hash']}", capture=True)

        # Commit with new author + committer + message
        env = {
            "GIT_AUTHOR_NAME": "CHAMA18",
            "GIT_AUTHOR_EMAIL": "chama18@users.noreply.github.com",
            "GIT_COMMITTER_NAME": "CHAMA18",
            "GIT_COMMITTER_EMAIL": "chama18@users.noreply.github.com",
        }
        # Write message to a temp file to handle multi-line safely
        msg_file = REPO / "scripts" / "_commit_msg.txt"
        msg_file.write_text(new_msg)

        e = os.environ.copy()
        e.update(env)
        r = subprocess.run(
            f'git commit -F "{msg_file}" --allow-empty',
            shell=True, cwd=REPO, env=e, capture_output=True, text=True
        )
        if r.returncode != 0:
            print(f"  commit failed: {r.stderr}")
            sys.exit(1)

    # Move the temp branch to main
    print()
    print("Rewrite complete. Moving _rewrite_temp -> main")
    run("git branch -M _rewrite_temp main", check=False)

    # Clean up the editor script + message file
    editor_script.unlink(missing_ok=True)
    (REPO / "scripts" / "_commit_msg.txt").unlink(missing_ok=True)

    print()
    print("============================================================")
    print("Rewritten history:")
    print("============================================================")
    print(run("git log --pretty=format:'%h | %an <%ae> | %s' -10", capture=True))
    print()
    print()
    print(f"Backup branch: {backup_branch}")
    print(f"To roll back: git reset --hard {orig_head}")
    print(f"To push: git push --force-with-lease origin main")


if __name__ == "__main__":
    main()
