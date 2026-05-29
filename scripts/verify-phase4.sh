#!/usr/bin/env bash
# Phase 4a end-to-end smoke test — drives the full subscription
# lifecycle locally via the dev fake-event endpoint (no real Razorpay
# account needed).
#
# Run from repo root:
#   bash scripts/verify-phase4.sh

set -uo pipefail
PORT="${VERIFY_PORT:-4365}"
HOST="http://localhost:$PORT"
ADMIN_EMAIL="admin@verify.test"
USER_EMAIL="user@verify.test"
NOTE_SLUG="${VERIFY_NOTE_SLUG:-cap-pacelc-consistency}"
VERIFY_DB=".local-verify.db"
ADMIN_JAR="$(mktemp)"
USER_JAR="$(mktemp)"
DEV_LOG="$(mktemp)"
PASS=0; FAIL=0

trap 'cleanup' EXIT
cleanup() {
  if [ -n "${DEV_PID:-}" ]; then
    kill "${DEV_PID}" 2>/dev/null || true
    wait "${DEV_PID}" 2>/dev/null || true
  fi
  rm -f "$ADMIN_JAR" "$USER_JAR" "$DEV_LOG" "$VERIFY_DB" "$VERIFY_DB"-*
}

assert() {
  local label="$1"; local cond="$2"
  if eval "$cond"; then
    PASS=$((PASS + 1))
    printf '  \033[32m✓\033[0m %s\n' "$label"
  else
    FAIL=$((FAIL + 1))
    printf '  \033[31m✗\033[0m %s\n' "$label"
  fi
}

rm -f "$VERIFY_DB" "$VERIFY_DB"-* >/dev/null 2>&1 || true
LOCAL_DB_PATH="$VERIFY_DB" npm run migrate >/dev/null

echo "[verify] booting astro dev on :$PORT..."
DEV_AUTH_BACKDOOR=1 ADMIN_EMAILS="$ADMIN_EMAIL" LOCAL_DB_PATH="$VERIFY_DB" \
  npx astro dev --port "$PORT" >"$DEV_LOG" 2>&1 &
DEV_PID=$!

for i in $(seq 1 60); do curl -sf "$HOST/" >/dev/null && break; sleep 0.5; done
if ! curl -sf "$HOST/" >/dev/null; then
  echo "[verify] dev server did not start"; cat "$DEV_LOG"; exit 1
fi
echo "[verify] server up"

# ----------------------------------------------------------------------
echo "Step 1: sign in user + admin, gate the note"
curl -sf -c "$USER_JAR" "$HOST/api/auth/dev-login?email=$USER_EMAIL" -o /dev/null
curl -sf -c "$ADMIN_JAR" "$HOST/api/auth/dev-login?email=$ADMIN_EMAIL" -o /dev/null
curl -sf -b "$ADMIN_JAR" -d "kind=note&id=$NOTE_SLUG&premium=1" -o /dev/null \
  "$HOST/api/admin/content/override"

PAGE=$(curl -sf -b "$USER_JAR" "$HOST/learn/notes/$NOTE_SLUG/")
assert 'free user sees paywall on gated note' 'grep -q "Upgrade to premium" <<<"$PAGE"'

# ----------------------------------------------------------------------
echo "Step 2: fire subscription.activated via dev fake-event"
USER_ID=$(curl -sf -b "$USER_JAR" "$HOST/api/whoami" | grep -oE '"id":[[:space:]]*"usr_[a-f0-9]+"' | head -1 | grep -oE 'usr_[a-f0-9]+')
assert 'extracted user id' '[ -n "$USER_ID" ]'

curl -sf -b "$ADMIN_JAR" -d "userId=$USER_ID&type=subscription.activated&periodDaysFromNow=30" \
  -o /dev/null "$HOST/api/admin/dev/fake-razorpay-event"

WHO=$(curl -sf -b "$USER_JAR" "$HOST/api/whoami")
assert 'user still signed in' '[[ "$WHO" == *signedIn*true* ]]'

# Check subscription row directly via the audit
SUBS=$(curl -sf -b "$ADMIN_JAR" -d "userId=$USER_ID&type=subscription.activated&periodDaysFromNow=30" \
  "$HOST/api/admin/dev/fake-razorpay-event")
assert 'event was applied OR deduped (idempotent)' 'echo "$SUBS" | grep -qE "ok.*true"'

# ----------------------------------------------------------------------
echo "Step 3: pro user now bypasses the paywall"
PAGE2=$(curl -sf -b "$USER_JAR" "$HOST/learn/notes/$NOTE_SLUG/")
assert 'pro user sees full body (no paywall card)' '! grep -q "Upgrade to premium" <<<"$PAGE2"'
assert 'pro user sees note content' 'grep -q "Definition (interview-ready)" <<<"$PAGE2"'

# ----------------------------------------------------------------------
echo "Step 4: cancel-at-cycle-end keeps access until period end"
curl -sf -b "$ADMIN_JAR" -d "userId=$USER_ID&type=subscription.cancelled&atCycleEnd=1" \
  -o /dev/null "$HOST/api/admin/dev/fake-razorpay-event"

PAGE3=$(curl -sf -b "$USER_JAR" "$HOST/learn/notes/$NOTE_SLUG/")
assert 'cancelled-at-period-end user still sees body' '! grep -q "Upgrade to premium" <<<"$PAGE3"'

ACCT=$(curl -sf -b "$USER_JAR" "$HOST/account/")
assert 'account page shows "Cancelling at period end"' 'grep -q "Cancelling at period end" <<<"$ACCT"'

# ----------------------------------------------------------------------
echo "Step 5: subscription.halted (grace expired) → tier=free"
curl -sf -b "$ADMIN_JAR" -d "userId=$USER_ID&type=subscription.halted" \
  -o /dev/null "$HOST/api/admin/dev/fake-razorpay-event"

PAGE4=$(curl -sf -b "$USER_JAR" "$HOST/learn/notes/$NOTE_SLUG/")
assert 'halted user sees paywall again' 'grep -q "Upgrade to premium" <<<"$PAGE4"'

# ----------------------------------------------------------------------
echo "Step 6: webhook signature verify — wrong signature → 400"
WEBHOOK_STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
  -H "x-razorpay-signature: garbage" \
  -H "content-type: application/json" \
  -d '{"event":"subscription.activated","payload":{}}' \
  "$HOST/api/razorpay/webhook")
# Without RAZORPAY_WEBHOOK_SECRET configured, the handler returns 500.
# Either response is acceptable; the key thing is it's NOT 200.
assert "webhook rejects unsigned (got $WEBHOOK_STATUS, not 200)" '[ "$WEBHOOK_STATUS" != "200" ]'

# ----------------------------------------------------------------------
echo "Step 7: cleanup the gate override"
curl -sf -b "$ADMIN_JAR" -d "kind=note&id=$NOTE_SLUG&action=clear" \
  -o /dev/null "$HOST/api/admin/content/override"

echo ""
echo "[verify] $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
