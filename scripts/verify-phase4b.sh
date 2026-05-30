#!/usr/bin/env bash
# Phase 4b end-to-end smoke. Exercises the /api/v1/* public API:
#   1. Sign in as admin, gate a note
#   2. Sign in as a free-tier user, mint an API key
#   3. Hit /api/v1/notes/<gated> with bearer → paywall stub (no body)
#   4. Fire dev fake-event subscription.activated → flip to pro
#   5. Re-hit /api/v1/notes/<gated> → full body returned
#   6. Hit /api/v1/anims, /api/v1/roadmap, /api/v1/me
#   7. Revoke the key → subsequent calls 401
#   8. Cleanup the gate

set -uo pipefail
PORT=4366
HOST="http://localhost:$PORT"
DB=".local-verify4b.db"
ADMIN_EMAIL="admin@verify.test"
USER_EMAIL="user@verify.test"
NOTE_SLUG="cap-pacelc-consistency"
PASS=0; FAIL=0
check() { if eval "$2"; then echo "  ✓ $1"; PASS=$((PASS+1)); else echo "  ✗ $1"; FAIL=$((FAIL+1)); fi; }

rm -f "$DB" "$DB"-*
LOCAL_DB_PATH="$DB" npm run migrate >/dev/null

DEV_AUTH_BACKDOOR=1 ADMIN_EMAILS="$ADMIN_EMAIL" LOCAL_DB_PATH="$DB" \
  npx astro dev --port "$PORT" > /tmp/v4b.log 2>&1 &
PID=$!
trap "kill $PID 2>/dev/null; wait $PID 2>/dev/null; rm -f $DB $DB-*" EXIT
for i in $(seq 1 60); do curl -sf "$HOST/" >/dev/null && break; sleep 0.5; done
echo "[verify] server up"

ADMIN_JAR=$(mktemp); USER_JAR=$(mktemp)
curl -sf -c "$ADMIN_JAR" "$HOST/api/auth/dev-login?email=$ADMIN_EMAIL" -o /dev/null
curl -sf -c "$USER_JAR" "$HOST/api/auth/dev-login?email=$USER_EMAIL" -o /dev/null
USER_ID=$(curl -sf -b "$USER_JAR" "$HOST/api/whoami" | grep -oE '"id":[[:space:]]*"usr_[a-f0-9]+"' | head -1 | grep -oE 'usr_[a-f0-9]+')
echo "[verify] admin + user signed in (user=$USER_ID)"

# Gate the note + verify
curl -sf -b "$ADMIN_JAR" -d "kind=note&id=$NOTE_SLUG&premium=1" -o /dev/null "$HOST/api/admin/content/override"

echo ""
echo "Step 1: mint an API key via the UI"
MINT_RESP=$(mktemp)
curl -sf -b "$USER_JAR" -i -d "name=verify-key&daily_quota=1000" "$HOST/api/me/api-keys/create" > "$MINT_RESP" 2>&1
KEY=$(grep -i "^location:" "$MINT_RESP" | grep -oE 'just_minted=[^&[:space:]]+' | sed 's/just_minted=//' | python3 -c "import sys,urllib.parse;print(urllib.parse.unquote(sys.stdin.read().strip()))")
check "key minted (got non-empty bearer)" '[ -n "$KEY" ]'
check "key looks like sk_test_*" '[[ "$KEY" == sk_test_* ]]'
rm -f "$MINT_RESP"

echo ""
echo "Step 2: /api/v1/* without bearer → 401"
NO_AUTH_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$HOST/api/v1/notes")
check "GET /api/v1/notes anon → 401 (got $NO_AUTH_STATUS)" '[ "$NO_AUTH_STATUS" = "401" ]'
BAD_AUTH=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer not-a-key" "$HOST/api/v1/notes")
check "GET /api/v1/notes bad bearer → 401 (got $BAD_AUTH)" '[ "$BAD_AUTH" = "401" ]'

echo ""
echo "Step 3: with bearer, /api/v1/notes returns the list"
NOTES_LIST=$(curl -sf -H "Authorization: Bearer $KEY" "$HOST/api/v1/notes")
check "response has a notes array" 'grep -q "\"notes\":" <<< "$NOTES_LIST"'
check "response carries _meta.licensed_to" 'grep -q "\"licensed_to\":" <<< "$NOTES_LIST"'
check "tier is free in _meta" 'grep -q "\"tier\":[[:space:]]*\"free\"" <<< "$NOTES_LIST"'

echo ""
echo "Step 4: gated note as free → paywall stub, no body"
GATED=$(curl -sf -H "Authorization: Bearer $KEY" "$HOST/api/v1/notes/$NOTE_SLUG")
check "free response includes paywall:true" 'grep -q "\"paywall\":[[:space:]]*true" <<< "$GATED"'
check "free response does NOT include full body" '! grep -q "\"body\":" <<< "$GATED"'

echo ""
echo "Step 5: fire subscription.activated → tier flips to pro"
curl -sf -b "$ADMIN_JAR" -d "userId=$USER_ID&type=subscription.activated" -o /dev/null "$HOST/api/admin/dev/fake-razorpay-event"

# A fresh request — quota will be 4/1000.
ME=$(curl -sf -H "Authorization: Bearer $KEY" "$HOST/api/v1/me")
check "me.tier is pro after activation" 'grep -q "\"tier\":[[:space:]]*\"pro\"" <<< "$ME"'

echo ""
echo "Step 6: gated note as pro → full body returned"
PRO_BODY=$(curl -sf -H "Authorization: Bearer $KEY" "$HOST/api/v1/notes/$NOTE_SLUG")
check "pro response includes body" 'grep -q "\"body\":" <<< "$PRO_BODY"'
check "pro response does NOT include paywall" '! grep -q "\"paywall\":[[:space:]]*true" <<< "$PRO_BODY"'

echo ""
echo "Step 7: /api/v1/anims + /api/v1/roadmap"
ANIMS=$(curl -sf -H "Authorization: Bearer $KEY" "$HOST/api/v1/anims")
check "anims list returns array" 'grep -q "\"anims\":" <<< "$ANIMS"'
ROAD=$(curl -sf -H "Authorization: Bearer $KEY" "$HOST/api/v1/roadmap?pillar=systems")
check "roadmap pillars.systems present" 'grep -q "\"systems\":" <<< "$ROAD"'
check "roadmap pillars.dsa NOT present (filtered)" '! grep -q "\"dsa\":" <<< "$ROAD"'

echo ""
echo "Step 8: revoke key → 401 on next call"
# Find the key id from the listApiKeys page or just match the public id from the bearer
KEY_PUBLIC_ID=$(echo "$KEY" | grep -oE 'ak_[a-f0-9]+')
curl -sf -b "$USER_JAR" -d "id=$KEY_PUBLIC_ID" -o /dev/null "$HOST/api/me/api-keys/revoke"
REVOKED_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $KEY" "$HOST/api/v1/notes")
check "revoked key → 401 (got $REVOKED_STATUS)" '[ "$REVOKED_STATUS" = "401" ]'

echo ""
echo "Cleanup: drop the override"
curl -sf -b "$ADMIN_JAR" -d "kind=note&id=$NOTE_SLUG&action=clear" -o /dev/null "$HOST/api/admin/content/override"

rm -f "$ADMIN_JAR" "$USER_JAR"
echo ""
echo "[verify] $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
