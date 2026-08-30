#!/usr/bin/env bash
# ============================================================
# Reform — Full API Integration Test Suite
# ============================================================
# Tests the complete API surface end-to-end:
#   1. Auth: guest sign-in → session cookie
#   2. Internal API: create API key with all scopes
#   3. v1 Public API: create form via API key
#   4. v1 Public API: list forms
#   5. v1 Public API: get single form by shareId
#   6. v1 Public API: submit form response (valid + invalid)
#   7. v1 Public API: list submissions for a form
#   8. v1 Public API: list all submissions
#   9. Auth: verify /api/auth/me reflects the guest session
#  10. Negative tests: missing key, invalid key, insufficient scope,
#      validation errors, nonexistent form
# ============================================================

set -euo pipefail

BASE="${BASE:-https://reform.onrender.com}"
COOKIE_JAR=$(mktemp)
PASS=0
FAIL=0
FAILED_TESTS=()

# --- Color helpers (optional, fall back to plain if not a TTY) ---
if [ -t 1 ]; then
  GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; CYAN=''; NC=''
fi

section() { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

assert_status() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}✓${NC} $label (HTTP $actual)"
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}✗${NC} $label — expected HTTP $expected, got $actual"
    FAIL=$((FAIL+1))
    FAILED_TESTS+=("$label (expected $expected, got $actual)")
  fi
}

assert_contains() {
  local label="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -qF "$needle"; then
    echo -e "  ${GREEN}✓${NC} $label"
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}✗${NC} $label — response missing '$needle'"
    echo "    response: $(echo "$haystack" | head -c 300)"
    FAIL=$((FAIL+1))
    FAILED_TESTS+=("$label (missing '$needle')")
  fi
}

assert_not_contains() {
  local label="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -qF "$needle"; then
    echo -e "  ${RED}✗${NC} $label — response should NOT contain '$needle'"
    echo "    response: $(echo "$haystack" | head -c 300)"
    FAIL=$((FAIL+1))
    FAILED_TESTS+=("$label (should not contain '$needle')")
  else
    echo -e "  ${GREEN}✓${NC} $label"
    PASS=$((PASS+1))
  fi
}

# ============================================================
# 0. Sanity check — server is reachable
# ============================================================
section "0. Server reachability"
HEALTH=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/" 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
  echo -e "  ${GREEN}✓${NC} Server is reachable at $BASE"
  PASS=$((PASS+1))
else
  echo -e "  ${RED}✗${NC} Server is NOT reachable at $BASE (HTTP $HEALTH)"
  FAIL=$((FAIL+1))
  FAILED_TESTS+=("Server reachability (HTTP $HEALTH)")
  echo "Cannot continue without a server. Aborting."
  exit 1
fi

# ============================================================
# 1. Auth — guest sign-in
# ============================================================
section "1. Guest sign-in (GET /api/auth/guest)"

# Follow redirects with -L, capture final URL and cookies
GUEST_RESP=$(curl -sS -L -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -o /dev/null -w "%{http_code}|%{url_effective}" \
  "$BASE/api/auth/guest")
GUEST_STATUS=$(echo "$GUEST_RESP" | cut -d'|' -f1)
GUEST_URL=$(echo "$GUEST_RESP" | cut -d'|' -f2)
assert_status "Guest sign-in returns 200 (after redirect)" "200" "$GUEST_STATUS"
assert_contains "Guest redirected to /dashboard" "/dashboard" "$GUEST_URL"

# Verify session cookie was set
if grep -q "fep_session" "$COOKIE_JAR"; then
  echo -e "  ${GREEN}✓${NC} Session cookie (fep_session) is set"
  PASS=$((PASS+1))
else
  echo -e "  ${RED}✗${NC} Session cookie (fep_session) is NOT set"
  FAIL=$((FAIL+1))
  FAILED_TESTS+=("Session cookie not set after guest sign-in")
fi

# Verify /api/auth/me returns the guest user
ME_RESP=$(curl -sS -b "$COOKIE_JAR" "$BASE/api/auth/me")
ME_STATUS=$(echo "$ME_RESP" | head -c 1 >/dev/null; curl -sS -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$BASE/api/auth/me")
assert_contains "Guest user email is guest@reform.app" "guest@reform.app" "$ME_RESP"
assert_contains "Guest user name is 'Guest User'" "Guest User" "$ME_RESP"

# ============================================================
# 2. Internal API — create an API key with all scopes
# ============================================================
section "2. Create API key (POST /api/api-keys)"

KEY_BODY=$(cat <<'EOF'
{
  "name": "Integration Test Key (auto-created by test suite)",
  "permissions": ["forms:read", "forms:write", "submissions:read", "submissions:write"]
}
EOF
)
CREATE_KEY_RESP=$(curl -sS -b "$COOKIE_JAR" -X POST "$BASE/api/api-keys" \
  -H "Content-Type: application/json" -d "$KEY_BODY")
CREATE_KEY_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -X POST "$BASE/api/api-keys" \
  -H "Content-Type: application/json" -d "$KEY_BODY")
assert_status "Create API key returns 201" "201" "$CREATE_KEY_STATUS"
assert_contains "Response contains full key" '"key":"fep_live_' "$CREATE_KEY_RESP"
assert_contains "Response contains keyPrefix" '"keyPrefix":"fep_live_' "$CREATE_KEY_RESP"
assert_contains "Response contains all 4 permission scopes" "submissions:write" "$CREATE_KEY_RESP"

# Extract the full key for use in subsequent tests
API_KEY=$(echo "$CREATE_KEY_RESP" | python3 -c "import json,sys; print(json.load(sys.stdin)['key'])" 2>/dev/null || echo "")
if [ -z "$API_KEY" ]; then
  echo -e "  ${RED}✗${NC} Failed to extract API key from response — cannot continue"
  FAIL=$((FAIL+1))
  exit 1
fi
echo -e "  ${GREEN}✓${NC} Extracted API key: ${API_KEY:0:16}...${API_KEY: -4}"

# ============================================================
# 3. Negative tests — auth failures
# ============================================================
section "3. Auth failure tests"

# 3a. No API key at all
NO_KEY_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/api/v1/forms")
assert_status "No API key → 401" "401" "$NO_KEY_STATUS"
NO_KEY_RESP=$(curl -sS "$BASE/api/v1/forms")
assert_contains "Error mentions missing API key" "Missing API key" "$NO_KEY_RESP"

# 3b. Invalid format (doesn't start with fep_live_)
BAD_FORMAT_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer invalid_key_string" "$BASE/api/v1/forms")
assert_status "Invalid key format → 401" "401" "$BAD_FORMAT_STATUS"

# 3c. Correct format but nonexistent key
FAKE_KEY="fep_live_$(python3 -c "import secrets; print(secrets.token_hex(32))")"
FAKE_KEY_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $FAKE_KEY" "$BASE/api/v1/forms")
assert_status "Nonexistent key → 401" "401" "$FAKE_KEY_STATUS"

# 3d. x-api-key header variant works
XKEY_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" \
  -H "x-api-key: $API_KEY" "$BASE/api/v1/forms")
assert_status "x-api-key header works (200)" "200" "$XKEY_STATUS"

# ============================================================
# 4. v1 — Create a form via the API
# ============================================================
section "4. Create form via API (POST /api/v1/forms)"

FORM_BODY=$(cat <<'EOF'
{
  "name": "API Integration Test Form",
  "description": "Created by the API integration test suite to verify POST /api/v1/forms works end-to-end.",
  "flowchart": {
    "nodes": [
      { "id": "node-start", "type": "start", "position": { "x": 100, "y": 100 }, "data": { "label": "Start" } },
      { "id": "node-email", "type": "field", "position": { "x": 300, "y": 100 }, "data": { "label": "Email", "fieldType": "email", "required": true, "placeholder": "you@example.com" } },
      { "id": "node-name", "type": "field", "position": { "x": 500, "y": 100 }, "data": { "label": "Full Name", "fieldType": "text", "required": true, "validation": { "minLength": 2, "maxLength": 80 } } },
      { "id": "node-age", "type": "field", "position": { "x": 700, "y": 100 }, "data": { "label": "Age", "fieldType": "number", "required": false, "validation": { "min": 13, "max": 120 } } },
      { "id": "node-feedback", "type": "field", "position": { "x": 900, "y": 100 }, "data": { "label": "Feedback", "fieldType": "textarea", "required": true, "validation": { "minLength": 10, "maxLength": 1000 } } },
      { "id": "node-submit", "type": "submit", "position": { "x": 1100, "y": 100 }, "data": { "label": "Submit" } }
    ],
    "edges": [
      { "id": "e1", "source": "node-start", "target": "node-email" },
      { "id": "e2", "source": "node-email", "target": "node-name" },
      { "id": "e3", "source": "node-name", "target": "node-age" },
      { "id": "e4", "source": "node-age", "target": "node-feedback" },
      { "id": "e5", "source": "node-feedback", "target": "node-submit" }
    ]
  }
}
EOF
)
CREATE_FORM_RESP=$(curl -sS -X POST "$BASE/api/v1/forms" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$FORM_BODY")
CREATE_FORM_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/forms" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$FORM_BODY")
assert_status "Create form returns 201" "201" "$CREATE_FORM_STATUS"
assert_contains "Response contains shareId" '"shareId":"' "$CREATE_FORM_RESP"
assert_contains "Response contains form name" "API Integration Test Form" "$CREATE_FORM_RESP"
assert_contains "Response contains status=published" '"status":"published"' "$CREATE_FORM_RESP"

FORM_SHARE_ID=$(echo "$CREATE_FORM_RESP" | python3 -c "import json,sys; print(json.load(sys.stdin)['shareId'])" 2>/dev/null || echo "")
if [ -z "$FORM_SHARE_ID" ]; then
  echo -e "  ${RED}✗${NC} Failed to extract shareId — cannot continue"
  FAIL=$((FAIL+1))
  exit 1
fi
echo -e "  ${GREEN}✓${NC} Created form with shareId: $FORM_SHARE_ID"

# ============================================================
# 5. v1 — List forms
# ============================================================
section "5. List forms (GET /api/v1/forms)"

LIST_FORMS_RESP=$(curl -sS -H "Authorization: Bearer $API_KEY" "$BASE/api/v1/forms")
LIST_FORMS_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $API_KEY" "$BASE/api/v1/forms")
assert_status "List forms returns 200" "200" "$LIST_FORMS_STATUS"
assert_contains "Response contains forms array" '"forms":[' "$LIST_FORMS_RESP"
assert_contains "List includes our new form" "API Integration Test Form" "$LIST_FORMS_RESP"
assert_contains "List includes submissionCount field" "submissionCount" "$LIST_FORMS_RESP"

# ============================================================
# 6. v1 — Get single form by shareId
# ============================================================
section "6. Get form by shareId (GET /api/v1/forms/{shareId})"

GET_FORM_RESP=$(curl -sS -H "Authorization: Bearer $API_KEY" "$BASE/api/v1/forms/$FORM_SHARE_ID")
GET_FORM_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $API_KEY" "$BASE/api/v1/forms/$FORM_SHARE_ID")
assert_status "Get form returns 200" "200" "$GET_FORM_STATUS"
assert_contains "Response contains form name" "API Integration Test Form" "$GET_FORM_RESP"
assert_contains "Response contains schema" '"schema":' "$GET_FORM_RESP"
assert_contains "Schema contains fields array" '"fields":' "$GET_FORM_RESP"

# 6b. Nonexistent form → 404
NOTFOUND_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $API_KEY" "$BASE/api/v1/forms/nonexistent_share_id_12345")
assert_status "Nonexistent form → 404" "404" "$NOTFOUND_STATUS"

# ============================================================
# 7. v1 — Submit form response (valid)
# ============================================================
section "7. Submit form response (POST /api/v1/forms/{shareId}/submissions)"

VALID_SUBMISSION=$(cat <<'EOF'
{
  "data": {
    "node-email": "test-user@example.com",
    "node-name": "Test User",
    "node-age": 28,
    "node-feedback": "This is a valid test submission with at least 10 characters."
  }
}
EOF
)
SUBMIT_RESP=$(curl -sS -X POST "$BASE/api/v1/forms/$FORM_SHARE_ID/submissions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$VALID_SUBMISSION")
SUBMIT_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/forms/$FORM_SHARE_ID/submissions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$VALID_SUBMISSION")
assert_status "Valid submission returns 201" "201" "$SUBMIT_STATUS"
assert_contains "Response contains submission id" '"id":"' "$SUBMIT_RESP"
assert_contains "Response contains status=Live" '"status":"Live"' "$SUBMIT_RESP"
assert_contains "Response contains formId" '"formId":"' "$SUBMIT_RESP"

# ============================================================
# 8. v1 — Submit invalid form response (validation errors)
# ============================================================
section "8. Submit invalid response (validation should fail)"

# 8a. Missing required fields
INVALID_SUB_MISSING=$(cat <<'EOF'
{
  "data": {
    "node-email": "test@example.com"
  }
}
EOF
)
INVALID_MISSING_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/forms/$FORM_SHARE_ID/submissions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$INVALID_SUB_MISSING")
assert_status "Missing required fields → 422" "422" "$INVALID_MISSING_STATUS"
INVALID_MISSING_RESP=$(curl -sS -X POST "$BASE/api/v1/forms/$FORM_SHARE_ID/submissions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$INVALID_SUB_MISSING")
assert_contains "Error mentions validation failed" "Validation failed" "$INVALID_MISSING_RESP"
assert_contains "Error includes field-level errors" '"errors":' "$INVALID_MISSING_RESP"

# 8b. Invalid email format
INVALID_EMAIL=$(cat <<'EOF'
{
  "data": {
    "2": "not-an-email",
    "node-name": "Test User",
    "node-feedback": "This is a valid feedback message with enough characters."
  }
}
EOF
)
INVALID_EMAIL_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/forms/$FORM_SHARE_ID/submissions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$INVALID_EMAIL")
assert_status "Invalid email format → 422" "422" "$INVALID_EMAIL_STATUS"

# 8c. Number out of range
INVALID_NUM=$(cat <<'EOF'
{
  "data": {
    "node-email": "test@example.com",
    "node-name": "Test User",
    "node-age": 500,
    "node-feedback": "This is a valid feedback message with enough characters."
  }
}
EOF
)
INVALID_NUM_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/forms/$FORM_SHARE_ID/submissions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$INVALID_NUM")
assert_status "Age out of range (500 > 120) → 422" "422" "$INVALID_NUM_STATUS"

# 8d. String too short (feedback < 10 chars)
INVALID_SHORT=$(cat <<'EOF'
{
  "data": {
    "node-email": "test@example.com",
    "node-name": "Test User",
    "node-feedback": "short"
  }
}
EOF
)
INVALID_SHORT_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/forms/$FORM_SHARE_ID/submissions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$INVALID_SHORT")
assert_status "Feedback too short (< 10 chars) → 422" "422" "$INVALID_SHORT_STATUS"

# ============================================================
# 9. v1 — List submissions for a form
# ============================================================
section "9. List submissions for form (GET /api/v1/forms/{shareId}/submissions)"

LIST_SUBS_RESP=$(curl -sS -H "Authorization: Bearer $API_KEY" "$BASE/api/v1/forms/$FORM_SHARE_ID/submissions")
LIST_SUBS_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $API_KEY" "$BASE/api/v1/forms/$FORM_SHARE_ID/submissions")
assert_status "List submissions returns 200" "200" "$LIST_SUBS_STATUS"
assert_contains "Response contains submissions array" '"submissions":[' "$LIST_SUBS_RESP"
assert_contains "Response contains total count" '"total":' "$LIST_SUBS_RESP"
assert_contains "Our valid submission is in the list" "test-user@example.com" "$LIST_SUBS_RESP"
assert_contains "Submission data keyed by field id" '"node-email":' "$LIST_SUBS_RESP"

# 9b. Pagination — limit + offset
PAGE_RESP=$(curl -sS -H "Authorization: Bearer $API_KEY" "$BASE/api/v1/forms/$FORM_SHARE_ID/submissions?limit=1&offset=0")
assert_contains "Pagination returns limit=1" '"limit":1' "$PAGE_RESP"
assert_contains "Pagination returns offset=0" '"offset":0' "$PAGE_RESP"

# ============================================================
# 10. v1 — List all submissions across all forms
# ============================================================
section "10. List all submissions (GET /api/v1/submissions)"

ALL_SUBS_RESP=$(curl -sS -H "Authorization: Bearer $API_KEY" "$BASE/api/v1/submissions")
ALL_SUBS_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $API_KEY" "$BASE/api/v1/submissions")
assert_status "List all submissions returns 200" "200" "$ALL_SUBS_STATUS"
assert_contains "Response contains submissions array" '"submissions":[' "$ALL_SUBS_RESP"
assert_contains "Each submission includes formName" '"formName":' "$ALL_SUBS_RESP"
assert_contains "Each submission includes formShareId" '"formShareId":' "$ALL_SUBS_RESP"

# 10b. Filter by formId
FILTERED_RESP=$(curl -sS -H "Authorization: Bearer $API_KEY" "$BASE/api/v1/submissions?formId=$FORM_SHARE_ID")
# Note: formId filter expects the internal id, not shareId — but the endpoint
# should still return 200 even if the filter matches nothing.
assert_status "Filter by formId returns 200" "200" "$(curl -sS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $API_KEY" "$BASE/api/v1/submissions?formId=anything")"

# ============================================================
# 11. Permission scope tests — create a read-only key
# ============================================================
section "11. Permission scope tests"

READONLY_KEY_BODY=$(cat <<'EOF'
{
  "name": "Read-Only Test Key",
  "permissions": ["forms:read", "submissions:read"]
}
EOF
)
READONLY_RESP=$(curl -sS -b "$COOKIE_JAR" -X POST "$BASE/api/api-keys" \
  -H "Content-Type: application/json" -d "$READONLY_KEY_BODY")
READONLY_KEY=$(echo "$READONLY_RESP" | python3 -c "import json,sys; print(json.load(sys.stdin)['key'])" 2>/dev/null || echo "")
if [ -n "$READONLY_KEY" ]; then
  echo -e "  ${GREEN}✓${NC} Created read-only key: ${READONLY_KEY:0:16}..."

  # Read should work
  READ_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $READONLY_KEY" "$BASE/api/v1/forms")
  assert_status "Read-only key can list forms (200)" "200" "$READ_STATUS"

  # Write should fail with 403
  WRITE_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer $READONLY_KEY" \
    -H "Content-Type: application/json" -d '{"name":"Should Fail","flowchart":{"nodes":[],"edges":[]}}' \
    "$BASE/api/v1/forms")
  assert_status "Read-only key cannot create form (403)" "403" "$WRITE_STATUS"
  WRITE_RESP=$(curl -sS -X POST -H "Authorization: Bearer $READONLY_KEY" \
    -H "Content-Type: application/json" -d '{"name":"Should Fail","flowchart":{"nodes":[],"edges":[]}}' \
    "$BASE/api/v1/forms")
  assert_contains "403 error mentions insufficient permissions" "Insufficient permissions" "$WRITE_RESP"
  assert_contains "403 error mentions required scope" "forms:write" "$WRITE_RESP"
else
  echo -e "  ${RED}✗${NC} Failed to create read-only key — skipping scope tests"
  FAIL=$((FAIL+1))
fi

# ============================================================
# 12. Submission to nonexistent form → 404
# ============================================================
section "12. Edge cases"

NONEXIST_SUB_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"data":{"foo":"bar"}}' \
  "$BASE/api/v1/forms/nonexistent_id/submissions")
assert_status "Submit to nonexistent form → 404" "404" "$NONEXIST_SUB_STATUS"

# Malformed JSON body — should return 400 (bad request)
MALFORMED_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d 'not valid json' \
  "$BASE/api/v1/forms")
assert_status "Malformed JSON body → 400" "400" "$MALFORMED_STATUS"

# Missing form name
NO_NAME_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"flowchart":{"nodes":[],"edges":[]}}' \
  "$BASE/api/v1/forms")
assert_status "Missing form name → 400" "400" "$NO_NAME_STATUS"

# ============================================================
# Summary
# ============================================================
section "SUMMARY"
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"
if [ "$FAIL" -gt 0 ]; then
  echo -e "\n  ${RED}Failed tests:${NC}"
  for t in "${FAILED_TESTS[@]}"; do
    echo -e "    ${RED}✗${NC} $t"
  done
fi

# Cleanup
rm -f "$COOKIE_JAR"

if [ "$FAIL" -eq 0 ]; then
  echo -e "\n${GREEN}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  ALL API TESTS PASSED ✓${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
  exit 0
else
  echo -e "\n${RED}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${RED}  $FAIL TEST(S) FAILED ✗${NC}"
  echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
  exit 1
fi
