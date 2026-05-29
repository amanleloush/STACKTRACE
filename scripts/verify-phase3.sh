#!/usr/bin/env bash
# Phase 3 end-to-end smoke test (plan §9 Phase 3 verify step).
#
# Boots `astro dev` with DEV_AUTH_BACKDOOR=1 + ADMIN_EMAILS, then walks the
# whole gating loop via curl:
#   1. Anonymous fetch of a default-free note → 200, body present
#   2. /api/auth/dev-login as an admin → session cookie minted
#   3. /admin/content as admin → 200
#   4. POST /api/admin/content/override → flip a note to premium
#   5. Anonymous fetch again → paywall card rendered, body absent
#   6. Authenticated admin fetch → body back
#   7. Reset the override
#
# Run from repo root:
#   bash scripts/verify-phase3.sh
#
# Exits non-zero on any assertion failure. Tears down the dev server
# whether the script succeeds or fails.

set -euo pipefail

PORT="${VERIFY_PORT:-4321}"
HOST="http://localhost:${PORT}"
ADMIN_EMAIL="admin@verify.test"
NOTE_SLUG="${VERIFY_NOTE_SLUG:-cap-pacelc-consistency}"
COOKIE_JAR="$(mktemp -t sysviz-verify-XXXXXX)"
DEV_LOG="$(mktemp -t sysviz-dev-XXXXXX)"
PASS=0
FAIL=0

trap 'cleanup' EXIT
cleanup() {
  if [ -n "${DEV_PID:-}" ]; then
    kill "${DEV_PID}" 2>/dev/null || true
    wait "${DEV_PID}" 2>/dev/null || true
  fi
  rm -f "${COOKIE_JAR}" "${DEV_LOG}"
}

assert() {
  local label="$1"; local cond="$2"
  if eval "${cond}"; then
    PASS=$((PASS + 1))
    printf '  \033[32m✓\033[0m %s\n' "${label}"
  else
    FAIL=$((FAIL + 1))
    printf '  \033[31m✗\033[0m %s\n' "${label}"
  fi
}

# Fresh local DB so the verify run is repeatable.
rm -f .local.db .local.db-* >/dev/null 2>&1 || true
npm run migrate >/dev/null

echo "[verify] booting astro dev on :${PORT}…"
DEV_AUTH_BACKDOOR=1 ADMIN_EMAILS="${ADMIN_EMAIL}" \
  npx astro dev --port "${PORT}" >"${DEV_LOG}" 2>&1 &
DEV_PID=$!

# Wait up to 30s for the server to come up.
for i in $(seq 1 60); do
  if curl -sf "${HOST}/" >/dev/null 2>&1; then break; fi
  sleep 0.5
done
if ! curl -sf "${HOST}/" >/dev/null 2>&1; then
  echo "[verify] dev server did not start; log:"; cat "${DEV_LOG}"; exit 1
fi
echo "[verify] dev server up"

# ---------------------------------------------------------------------------
# Step 1 — anonymous fetch of the default-free note.
# ---------------------------------------------------------------------------
echo "Step 1: anon fetch of /learn/notes/${NOTE_SLUG}/ (default free)"
ANON_BODY="$(curl -sf "${HOST}/learn/notes/${NOTE_SLUG}/")"
assert 'note renders (200)' '[ -n "${ANON_BODY}" ]'
assert 'no paywall card present' '! grep -q "See pricing" <<<"${ANON_BODY}"'
assert 'body content present' 'grep -q "Definition (interview-ready)" <<<"${ANON_BODY}"'

# ---------------------------------------------------------------------------
# Step 2 — admin sign-in via dev backdoor.
# ---------------------------------------------------------------------------
echo "Step 2: dev-login as ${ADMIN_EMAIL}"
curl -sf -c "${COOKIE_JAR}" \
  "${HOST}/api/auth/dev-login?email=${ADMIN_EMAIL}" -o /dev/null
assert 'session cookie set' 'grep -q "sysviz_session" "${COOKIE_JAR}"'

# ---------------------------------------------------------------------------
# Step 3 — admin can reach /admin/content.
# ---------------------------------------------------------------------------
echo "Step 3: GET /admin/content/ as admin"
ADMIN_BODY="$(curl -sf -b "${COOKIE_JAR}" "${HOST}/admin/content/")"
assert 'admin panel renders' 'grep -q "Content gating" <<<"${ADMIN_BODY}"'
assert "note row exists in panel" 'grep -q "${NOTE_SLUG}" <<<"${ADMIN_BODY}"'

# Anonymous /admin/content should 404.
echo "Step 3b: anon /admin/content/ → 404"
ANON_ADMIN_STATUS="$(curl -s -o /dev/null -w '%{http_code}' "${HOST}/admin/content/")"
assert "anon admin → 404 (got ${ANON_ADMIN_STATUS})" '[ "${ANON_ADMIN_STATUS}" = "404" ]'

# ---------------------------------------------------------------------------
# Step 4 — flip the note to premium via the admin POST.
# ---------------------------------------------------------------------------
echo "Step 4: POST override → gate ${NOTE_SLUG}"
curl -sf -b "${COOKIE_JAR}" \
  -d "kind=note&id=${NOTE_SLUG}&premium=1" \
  -o /dev/null \
  "${HOST}/api/admin/content/override"
assert "override applied (no body check yet)" 'true'

# ---------------------------------------------------------------------------
# Step 5 — anonymous fetch now hits the paywall.
# ---------------------------------------------------------------------------
echo "Step 5: anon fetch after gate-flip"
GATED_ANON_BODY="$(curl -sf "${HOST}/learn/notes/${NOTE_SLUG}/")"
assert 'paywall card rendered' 'grep -q "See pricing" <<<"${GATED_ANON_BODY}"'
assert 'body absent' '! grep -q "note__body.*Definition" <<<"${GATED_ANON_BODY}"'

# ---------------------------------------------------------------------------
# Step 6 — admin still sees the full body.
# ---------------------------------------------------------------------------
echo "Step 6: admin fetch after gate-flip"
GATED_ADMIN_BODY="$(curl -sf -b "${COOKIE_JAR}" "${HOST}/learn/notes/${NOTE_SLUG}/")"
assert 'admin bypasses paywall' '! grep -q "See pricing" <<<"${GATED_ADMIN_BODY}"'
assert 'admin sees full body' 'grep -q "note__body" <<<"${GATED_ADMIN_BODY}"'

# ---------------------------------------------------------------------------
# Step 7 — reset the override so dev DB stays clean between runs.
# ---------------------------------------------------------------------------
echo "Step 7: reset override"
curl -sf -b "${COOKIE_JAR}" \
  -d "kind=note&id=${NOTE_SLUG}&action=clear" \
  -o /dev/null \
  "${HOST}/api/admin/content/override"
RESET_ANON="$(curl -sf "${HOST}/learn/notes/${NOTE_SLUG}/")"
assert 'after reset, anon no longer paywalled' '! grep -q "See pricing" <<<"${RESET_ANON}"'

echo
echo "[verify] ${PASS} passed, ${FAIL} failed"
if [ "${FAIL}" -gt 0 ]; then exit 1; fi
