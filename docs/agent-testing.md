# OpenDash Agent Testing Instructions

You are testing the OpenDash API as an AI agent. OpenDash is running at `http://localhost:3000`.

## Step 1: Register yourself

Go to the Agents page in the dashboard and register a new agent called "Codex". You'll get an API key starting with `odak_`. Use that key for all requests below.

## Step 2: Run these tests in order

Every request needs these two headers:
```
Authorization: Bearer <YOUR_API_KEY>
X-OpenDash-Agent-Name: Codex
```

### Test 1 — List files
```bash
curl -s -H "Authorization: Bearer <KEY>" -H "X-OpenDash-Agent-Name: Codex" http://localhost:3000/api/files
```
Expected: JSON list of files with metadata only (no content field).

### Test 2 — Create a file
```bash
curl -s -X POST -H "Authorization: Bearer <KEY>" -H "X-OpenDash-Agent-Name: Codex" -H "Content-Type: application/json" -d '{"name":"test/hello-from-codex.md","content":"# Hello from Codex\n\nThis file was created by Codex via the OpenDash API."}' http://localhost:3000/api/files
```
Expected: 201 with file object. Content should be wrapped with a prompt harness (security text prepended).

### Test 3 — Read the file back
Use the `id` from Test 2:
```bash
curl -s -H "Authorization: Bearer <KEY>" -H "X-OpenDash-Agent-Name: Codex" http://localhost:3000/api/files/<FILE_ID>
```
Expected: File content wrapped with prompt harness.

### Test 4 — Update the file
```bash
curl -s -X PUT -H "Authorization: Bearer <KEY>" -H "X-OpenDash-Agent-Name: Codex" -H "Content-Type: application/json" -d '{"content":"# Hello from Codex\n\nUpdated by Codex."}' http://localhost:3000/api/files/<FILE_ID>
```
Expected: Updated file with harness-wrapped content.

### Test 5 — Search
```bash
curl -s -H "Authorization: Bearer <KEY>" -H "X-OpenDash-Agent-Name: Codex" "http://localhost:3000/api/files?q=codex"
```
Expected: Your file appears in results.

## Step 3: Report results

For each test, report: passed/failed and any unexpected output. Do NOT delete the test file.
