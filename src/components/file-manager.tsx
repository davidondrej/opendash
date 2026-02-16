"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type FileRecord = {
  id: string;
  name: string;
  content: string;
  updated_at: string;
};

type FileManagerProps = {
  initialFiles: FileRecord[];
};

type Folder = {
  id: string;
  label: string;
};

const FOLDER_MARKER_FILE = ".opendash-folder.md";

function normalizeFolderId(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function folderLabelFromId(id: string) {
  if (id === "general") return "General";
  const words = id
    .split(/[-_]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!words.length) return "General";
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function folderFromFileName(name: string) {
  const normalized = name.trim().replace(/^\/+/, "");
  const segments = normalized.split("/");
  if (segments.length < 2) return "general";
  const prefix = normalizeFolderId(segments[0] ?? "");
  return prefix || "general";
}

function visibleNameFromStoredName(name: string) {
  const normalized = name.trim().replace(/^\/+/, "");
  const segments = normalized.split("/");
  if (segments.length > 1) {
    return segments.slice(1).join("/");
  }
  return normalized;
}

function markerFileNameForFolder(folderId: string) {
  return `${folderId}/${FOLDER_MARKER_FILE}`;
}

function isFolderMarkerFileName(name: string) {
  return visibleNameFromStoredName(name).toLowerCase() === FOLDER_MARKER_FILE;
}

function isSystemFileName(name: string) {
  return isFolderMarkerFileName(name);
}

function normalizeMarkdownFileName(name: string) {
  const trimmed = name.trim().replace(/^\/+/, "");
  const base = trimmed || "untitled";
  return /\.md$/i.test(base) ? base : `${base}.md`;
}

function isMarkdownFileName(name: string) {
  return /\.(md|markdown)$/i.test(name.trim());
}

function storedNameForFolder(visibleName: string, folderId: string) {
  const normalized = normalizeMarkdownFileName(visibleName).replace(/^([^/]+)\//, "");
  return folderId === "general" ? normalized : `${folderId}/${normalized}`;
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInlineMarkdown(text: string) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function markdownToHtml(markdown: string) {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let inList = false;
  let inCode = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        html.push("</code></pre>");
        inCode = false;
      } else {
        if (inList) {
          html.push("</ul>");
          inList = false;
        }
        html.push('<pre><code>');
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      html.push(`${escapeHtml(line)}\n`);
      continue;
    }

    if (!line.trim()) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      continue;
    }

    if (line.startsWith("### ")) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push(`<h3>${renderInlineMarkdown(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith("## ")) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push(`<h2>${renderInlineMarkdown(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith("# ")) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push(`<h1>${renderInlineMarkdown(line.slice(2))}</h1>`);
      continue;
    }

    if (line.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${renderInlineMarkdown(line.slice(2))}</li>`);
      continue;
    }

    if (inList) {
      html.push("</ul>");
      inList = false;
    }
    html.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  if (inList) html.push("</ul>");
  if (inCode) html.push("</code></pre>");

  return html.join("");
}

function defaultDraftContent(folderLabel: string) {
  return `# ${folderLabel} Notes\n\n## Context\n\n## Decisions\n\n- `;
}

function FolderGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[var(--od-muted)]" aria-hidden="true">
      <path
        d="M3 6.75A2.75 2.75 0 0 1 5.75 4h4.1c.78 0 1.53.33 2.05.9l1.15 1.25c.24.26.58.42.94.42h4.26A2.75 2.75 0 0 1 21 9.32v7.93A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[var(--od-muted)]" aria-hidden="true">
      <path
        d="M7.75 3h6.5l4 4v13.25A1.75 1.75 0 0 1 16.5 22h-8A1.75 1.75 0 0 1 6.75 20.25V4.75A1.75 1.75 0 0 1 8.5 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M14.25 3v4h4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export default function FileManager({ initialFiles }: FileManagerProps) {
  const [files, setFiles] = useState<FileRecord[]>(initialFiles);
  const [selectedFolder, setSelectedFolder] = useState("general");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [editorName, setEditorName] = useState("new-file.md");
  const [editorContent, setEditorContent] = useState(defaultDraftContent("General"));
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(`Loaded ${initialFiles.length} file(s).`);
  const [isDraft, setIsDraft] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }),
    [],
  );

  const sortedFiles = useMemo(
    () =>
      [...files].sort((a, b) => {
        const aDate = new Date(a.updated_at).getTime();
        const bDate = new Date(b.updated_at).getTime();
        return bDate - aDate;
      }),
    [files],
  );

  const visibleFiles = useMemo(
    () => sortedFiles.filter((file) => !isSystemFileName(file.name)),
    [sortedFiles],
  );

  const folderFiles = useMemo(
    () => visibleFiles.filter((file) => folderFromFileName(file.name) === selectedFolder),
    [selectedFolder, visibleFiles],
  );

  const sortedFolders = useMemo(() => {
    const markdownCounts = new Map<string, number>();
    const folderIds = new Set<string>(["general"]);

    for (const file of files) {
      const folderId = folderFromFileName(file.name);
      folderIds.add(folderId);
      if (isSystemFileName(file.name) || !isMarkdownFileName(file.name)) continue;
      markdownCounts.set(folderId, (markdownCounts.get(folderId) ?? 0) + 1);
    }

    return Array.from(folderIds)
      .map((folderId) => ({
        folder: { id: folderId, label: folderLabelFromId(folderId) },
        count: markdownCounts.get(folderId) ?? 0,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.folder.label.localeCompare(b.folder.label);
      });
  }, [files]);

  const selectedFolderLabel = useMemo(
    () => sortedFolders.find((entry) => entry.folder.id === selectedFolder)?.folder.label ?? "General",
    [selectedFolder, sortedFolders],
  );

  const activeFile = useMemo(
    () => files.find((file) => file.id === selectedFileId) ?? null,
    [files, selectedFileId],
  );

  const previewHtml = useMemo(() => markdownToHtml(editorContent), [editorContent]);

  useEffect(() => {
    if (!sortedFolders.some((entry) => entry.folder.id === selectedFolder)) {
      setSelectedFolder(sortedFolders[0]?.folder.id ?? "general");
    }
  }, [selectedFolder, sortedFolders]);

  const loadFiles = useCallback(
    async (query = "") => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());

        const res = await fetch(`/api/files?${params.toString()}`);
        const data = (await res.json()) as { files?: FileRecord[]; error?: string };

        if (!res.ok) {
          setStatus(data.error ?? "Failed to load files.");
          return;
        }

        const loadedFiles = data.files ?? [];
        setFiles(loadedFiles);
        const visibleCount = loadedFiles.filter((file) => !isSystemFileName(file.name)).length;
        setStatus(`Loaded ${visibleCount} file(s).`);
      } catch {
        setStatus("Failed to load files.");
      }
    },
    [],
  );

  function openFile(file: FileRecord) {
    setSelectedFileId(file.id);
    setEditorName(visibleNameFromStoredName(file.name));
    setEditorContent(file.content);
    setSelectedFolder(folderFromFileName(file.name));
    setIsDraft(false);
    setStatus(`Opened ${visibleNameFromStoredName(file.name)}.`);
  }

  function startNewFile() {
    const folderLabel = folderLabelFromId(selectedFolder);
    setSelectedFileId(null);
    setEditorName("new-file.md");
    setEditorContent(defaultDraftContent(folderLabel));
    setIsDraft(true);
    setStatus(`New ${folderLabel} draft ready.`);
  }

  async function createFile(fileName: string, fileContent: string) {
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: storedNameForFolder(fileName, selectedFolder),
        content: fileContent,
      }),
    });
    const data = (await res.json()) as { file?: FileRecord; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to create file.");
    return data.file ?? null;
  }

  async function updateFile(fileId: string, fileName: string, fileContent: string) {
    const res = await fetch(`/api/files/${fileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: storedNameForFolder(fileName, selectedFolder),
        content: fileContent,
      }),
    });
    const data = (await res.json()) as { file?: FileRecord; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to save file.");
    return data.file ?? null;
  }

  async function handleSaveFile() {
    setLoading(true);
    setStatus(isDraft ? "Creating file..." : "Saving changes...");
    try {
      if (!editorName.trim()) {
        setStatus("File name is required.");
        return;
      }

      let saved: FileRecord | null = null;
      if (isDraft || !selectedFileId) {
        saved = await createFile(editorName, editorContent);
      } else {
        saved = await updateFile(selectedFileId, editorName, editorContent);
      }

      await loadFiles(search);

      if (saved) {
        setSelectedFileId(saved.id);
        setEditorName(visibleNameFromStoredName(saved.name));
        setEditorContent(saved.content);
        setIsDraft(false);
      }

      setStatus("File saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed.";
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadPickedFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus("Uploading markdown file...");
    try {
      const text = await file.text();
      const created = await createFile(file.name, text);
      await loadFiles(search);
      if (created) {
        setSelectedFileId(created.id);
        setEditorName(visibleNameFromStoredName(created.name));
        setEditorContent(created.content);
        setIsDraft(false);
      }
      setStatus("Upload complete.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      setStatus(message);
    } finally {
      event.target.value = "";
      setLoading(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("Searching files...");
    try {
      await loadFiles(search);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setLoading(true);
    setStatus("Refreshing files...");
    try {
      await loadFiles(search);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="mx-auto grid min-h-screen w-full max-w-[1540px] gap-3 p-3 lg:grid-cols-[300px_1fr] lg:gap-4 lg:p-4">
        <aside className="od-panel flex min-h-[760px] flex-col overflow-hidden">
          <div className="border-b border-[var(--od-border)] px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-semibold tracking-tight">OpenDash</h1>
              <span className="od-pill">v1</span>
            </div>
            <p className="mt-1 text-xs text-[var(--od-muted)]">Company folders</p>
          </div>

          <div className="px-4 pb-2 pt-3">
            <p className="od-overline">Folders</p>
            <div className="mt-2 space-y-1">
              {sortedFolders.map(({ folder, count }) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`od-channel-item flex w-full items-center justify-between text-left ${
                    selectedFolder === folder.id
                      ? "border-[var(--od-strong-border)] bg-[var(--od-surface-2)] text-[var(--od-text)]"
                      : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FolderGlyph />
                    <span>{folder.label.toLowerCase()}</span>
                  </span>
                  <span className="text-xs tabular-nums text-[var(--od-muted)]">{count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 pb-2 pt-2">
            <p className="od-overline">Search</p>
          </div>
          <form className="mt-4 flex gap-2" onSubmit={handleSearch}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files"
              className="od-input ml-4"
            />
            <button type="submit" className="od-button-ghost mr-4 px-3">
              Find
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between px-4">
            <p className="od-overline">{selectedFolderLabel} Files</p>
            <p className="text-xs text-[var(--od-muted)]">{folderFiles.length} total</p>
          </div>

          <div className="mt-2 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
            {folderFiles.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => openFile(file)}
                className={`od-file-item w-full px-3 py-2.5 text-left ${
                  selectedFileId === file.id
                    ? "border-[var(--od-strong-border)] bg-[var(--od-surface-3)] text-[var(--od-text)]"
                    : "border-[var(--od-border)] bg-transparent text-[var(--od-soft-text)] hover:bg-[var(--od-surface-2)]"
                }`}
              >
                <div className="truncate text-sm font-medium">
                  <span className="inline-flex items-center gap-2">
                    <FileGlyph />
                    <span>{visibleNameFromStoredName(file.name)}</span>
                  </span>
                </div>
                <div className="mt-1 truncate text-xs text-[var(--od-muted)]">
                  {dateFormatter.format(new Date(file.updated_at))}
                </div>
              </button>
            ))}
            {!folderFiles.length && (
              <p className="px-2 py-3 text-sm text-[var(--od-muted)]">
                No files in this folder yet.
              </p>
            )}
          </div>
        </aside>

        <section className="od-panel flex min-h-[760px] flex-col overflow-hidden">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,text/markdown,.txt,text/plain"
            className="hidden"
            onChange={handleUploadPickedFile}
          />

          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--od-border)] px-5 py-4">
            <div>
              <p className="od-overline">Folder</p>
              <h2 className="text-lg font-semibold tracking-tight">{selectedFolderLabel}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={startNewFile} className="od-button-ghost" disabled={loading}>
                Create file
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="od-button-ghost"
                disabled={loading}
              >
                Upload markdown
              </button>
              <button type="button" onClick={handleSaveFile} className="od-button-primary" disabled={loading}>
                {loading ? "Working..." : isDraft ? "Create" : "Save"}
              </button>
              <button type="button" onClick={handleRefresh} className="od-button-ghost" disabled={loading}>
                Refresh
              </button>
            </div>
          </header>

          <div className="grid flex-1 gap-0 border-t-0 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="flex min-h-0 flex-col border-b border-[var(--od-border)] lg:border-b-0 lg:border-r">
              <div className="border-b border-[var(--od-border)] px-5 py-3">
                <p className="od-overline">Editor</p>
                <input
                  value={editorName}
                  onChange={(event) => setEditorName(event.target.value)}
                  className="od-input mt-2 w-full"
                  placeholder="File name (example: q1-plan.md)"
                />
              </div>
              <div className="flex-1 px-5 py-4">
                <textarea
                  value={editorContent}
                  onChange={(event) => setEditorContent(event.target.value)}
                  className="od-input h-full min-h-[420px] w-full resize-none font-mono text-sm leading-6"
                  placeholder="Write markdown here..."
                />
              </div>
            </section>

            <section className="flex min-h-0 flex-col bg-[var(--od-surface-1)]">
              <div className="border-b border-[var(--od-border)] px-5 py-3">
                <p className="od-overline">Preview</p>
                <p className="mt-1 text-xs text-[var(--od-muted)]">
                  {activeFile ? `Editing: ${visibleNameFromStoredName(activeFile.name)}` : "Draft mode"}
                </p>
              </div>
              <div className="prose prose-invert max-w-none flex-1 overflow-auto px-5 py-4 text-sm text-[var(--od-soft-text)] [&_a]:text-[var(--od-text)] [&_code]:rounded [&_code]:bg-[var(--od-surface-3)] [&_code]:px-1 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:my-1 [&_p]:my-2 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-[var(--od-border)] [&_pre]:bg-[var(--od-surface-2)] [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5">
                <div dangerouslySetInnerHTML={{ __html: previewHtml || "<p></p>" }} />
              </div>
            </section>
          </div>

          <footer className="border-t border-[var(--od-border)] bg-[var(--od-surface-1)] px-5 py-3 text-sm text-[var(--od-soft-text)]">
            <span className="text-[var(--od-muted)]">Status</span>: {status}
          </footer>
        </section>
      </main>
    </div>
  );
}
