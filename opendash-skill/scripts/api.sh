#!/usr/bin/env bash
set -euo pipefail

: "${OPENDASH_URL:?Set OPENDASH_URL}"
: "${OPENDASH_API_KEY:?Set OPENDASH_API_KEY}"
OPENDASH_AGENT_NAME="${OPENDASH_AGENT_NAME:-OpenDashSkill}"
BASE="${OPENDASH_URL%/}"

request() {
  local method="$1" path="$2" body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "${BASE}${path}" \
      -H "Authorization: Bearer ${OPENDASH_API_KEY}" \
      -H "X-OpenDash-Agent-Name: ${OPENDASH_AGENT_NAME}" \
      -H "Content-Type: application/json" \
      -d "$body"
  else
    curl -sS -X "$method" "${BASE}${path}" \
      -H "Authorization: Bearer ${OPENDASH_API_KEY}" \
      -H "X-OpenDash-Agent-Name: ${OPENDASH_AGENT_NAME}"
  fi
  echo
}

usage() {
  cat <<'USAGE'
Usage:
  api.sh list
  api.sh search <query>
  api.sh get <file_id>
  api.sh create <name> <content>
  api.sh update <file_id> <name> <content>
  api.sh delete <file_id>
USAGE
}

cmd="${1:-}"

case "$cmd" in
  list)
    request GET "/api/files"
    ;;
  search)
    q="${2:-}"
    [[ -n "$q" ]] || { usage; exit 1; }
    request GET "/api/files?q=$(printf '%s' "$q" | sed 's/ /%20/g')"
    ;;
  get)
    id="${2:-}"
    [[ -n "$id" ]] || { usage; exit 1; }
    request GET "/api/files/${id}"
    ;;
  create)
    name="${2:-}"; content="${3:-}"
    [[ -n "$name" ]] || { usage; exit 1; }
    request POST "/api/files" "{\"name\":\"${name}\",\"content\":\"${content}\"}"
    ;;
  update)
    id="${2:-}"; name="${3:-}"; content="${4:-}"
    [[ -n "$id" && -n "$name" ]] || { usage; exit 1; }
    request PUT "/api/files/${id}" "{\"name\":\"${name}\",\"content\":\"${content}\"}"
    ;;
  delete)
    id="${2:-}"
    [[ -n "$id" ]] || { usage; exit 1; }
    request DELETE "/api/files/${id}"
    ;;
  *)
    usage
    exit 1
    ;;
esac
