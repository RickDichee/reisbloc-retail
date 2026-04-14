#!/usr/bin/env bash
# =============================================================================
# scrub-history.sh — Step 2: Rewrite git history to remove leaked secrets
#
# Run this script ONCE from your local machine (not in the sandbox).
# It will rewrite all 115 commits, replacing leaked tokens/IDs/passwords
# with safe placeholders, then force-push to GitHub.
#
# Prerequisites:
#   pip install git-filter-repo     (or: brew install git-filter-repo)
#
# Usage:
#   chmod +x scripts/scrub-history.sh
#   ./scripts/scrub-history.sh
# =============================================================================

set -euo pipefail

REPO_URL="https://github.com/RickDichee/reisbloc-retail"
REPLACEMENTS_FILE="$(mktemp)"

# ---------------------------------------------------------------------------
# Preflight checks
# ---------------------------------------------------------------------------
if ! command -v git-filter-repo &>/dev/null; then
  echo "❌  git-filter-repo not found. Install it first:"
  echo "       pip install git-filter-repo"
  echo "   or  brew install git-filter-repo"
  exit 1
fi

if [ ! -d ".git" ]; then
  echo "❌  Run this script from the root of the cloned repository."
  exit 1
fi

echo "✅  git-filter-repo found."
echo ""

# ---------------------------------------------------------------------------
# Unshallow if needed (required for filter-repo on a shallow clone)
# ---------------------------------------------------------------------------
if git rev-parse --is-shallow-repository 2>/dev/null | grep -q true; then
  echo "⚙️   Unshallowing repository..."
  git fetch --unshallow origin
fi

echo "📋  Total commits to rewrite: $(git log --oneline | wc -l | tr -d ' ')"
echo ""

# ---------------------------------------------------------------------------
# Build replacements file
# Each line: <literal-secret>==>REPLACEMENT
# Lines starting with # are comments.
# ---------------------------------------------------------------------------
cat > "$REPLACEMENTS_FILE" << 'REPEOF'
***REMOVED***
***REDACTED_META_TOKEN***==>***REDACTED_META_TOKEN***
***REMOVED***
***REDACTED_PASSWORD***==>***REDACTED_PASSWORD***
***REMOVED***
WHATSAPP_VERIFY_TOKEN_PLACEHOLDER==>WHATSAPP_VERIFY_TOKEN_PLACEHOLDER
***REMOVED***
YOUR_VERIFY_TOKEN_HERE==>YOUR_VERIFY_TOKEN_HERE
***REMOVED***
***REDACTED_WA_BUSINESS_ID***==>***REDACTED_WA_BUSINESS_ID***
***REMOVED***
process.env.WHATSAPP_PHONE_NUMBER_ID==>process.env.WHATSAPP_PHONE_NUMBER_ID
***REMOVED***
Identificador de número de teléfono: [REDACTED]==>Identificador de número de teléfono: [REDACTED]
REPEOF

echo "🔏  Replacements file ready. Running git filter-repo over full history..."
echo ""

# ---------------------------------------------------------------------------
# Rewrite history
# ---------------------------------------------------------------------------
git filter-repo --replace-text "$REPLACEMENTS_FILE" --force

echo ""
echo "🔍  Verifying: scanning rewritten history for any remaining secrets..."
REMAINING=$(git log --all --format="%H" | \
  xargs -I{} git grep -l \
    "EAATGj3s\|jhNggmkE2V4xTa\|WHATSAPP_VERIFY_TOKEN_PLACEHOLDER\|***REDACTED_WA_BUSINESS_ID***\|YOUR_VERIFY_TOKEN_HERE" \
    {} 2>/dev/null | wc -l | tr -d ' ')

if [ "$REMAINING" -gt 0 ]; then
  echo "⚠️   WARNING: $REMAINING file(s) in history still contain secrets. Review manually."
else
  echo "✅  Clean — 0 occurrences of any secret found in rewritten history."
fi

echo ""

# ---------------------------------------------------------------------------
# Restore remote (filter-repo removes it) and force-push ALL branches
# ---------------------------------------------------------------------------
echo "🌐  Re-adding origin remote..."
git remote add origin "$REPO_URL"

echo "🚀  Force-pushing all branches and tags to GitHub..."
git push origin --force --all
git push origin --force --tags

echo ""
echo "============================================================"
echo "✅  Step 2 complete! Git history has been scrubbed."
echo ""
echo "👉  NEXT: Contact GitHub Support to purge cached object views:"
echo "    https://support.github.com"
echo "    Subject: 'Force-push history rewrite — please purge CDN cache'"
echo "    (GitHub caches old commits for ~90 days)"
echo ""
echo "👉  You can now safely make the repository public."
echo "============================================================"

# Cleanup
rm -f "$REPLACEMENTS_FILE"
