"use client";

import { ChangeEvent, FormEvent, useCallback, useMemo, useRef, useState } from "react";

type FileRecord = {
  id: string;
  name: string;
  content: string;
  updated_at: string;
};

type FileManagerProps = {
  initialFiles: FileRecord[];
};

type Department = {
  id: string;
  label: string;
};

const departments: Department[] = [
  { id: "marketing", label: "Marketing" },
  { id: "product", label: "Product" },
  { id: "sales", label: "Sales" },
  { id: "development", label: "Development" },
  { id: "operations", label: "Operations" },
  { id: "finance", label: "Finance" },
  { id: "hr", label: "HR" },
  { id: "general", label: "General" },
];

function findDepartmentById(id: string) {
  return departments.find((department) => department.id === id);
}

function departmentFromFileName(name: string) {
  const prefix = name.split("/")[0]?.toLowerCase() ?? "";
  return findDepartmentById(prefix)?.id ?? "general";
}

function visibleNameFromStoredName(name: string) {
  const segments = name.split("/");
  if (segments.length > 1 && findDepartmentById(segments[0]?.toLowerCase() ?? "")) {
    return segments.slice(1).join("/");
  }
  return name;
}

function normalizeMarkdownFileName(name: string) {
  const trimmed = name.trim().replace(/^\/+/, "");
  const base = trimmed || "untitled";
  return /\.md$/i.test(base) ? base : `${base}.md`;
}

function storedNameForDepartment(visibleName: string, departmentId: string) {
  const normalized = normalizeMarkdownFileName(visibleName).replace(/^([^/]+)\//, "");
  return departmentId === "general" ? normalized : `${departmentId}/${normalized}`;
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

function defaultDraftContent(departmentLabel: string) {
  return `# ${departmentLabel} Notes\n\n## Context\n\n## Decisions\n\n- `;
}

export default function FileManager({ initialFiles }: FileManagerProps) {
  const [files, setFiles] = useState<FileRecord[]>(initialFiles);
  const [selectedDepartment, setSelectedDepartment] = useState("marketing");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [editorName, setEditorName] = useState("new-file.md");
  const [editorContent, setEditorContent] = useState(defaultDraftContent("Marketing"));
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

  const selectedDepartmentLabel = useMemo(
    () => findDepartmentById(selectedDepartment)?.label ?? "General",
    [selectedDepartment],
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

  const departmentFiles = useMemo(
    () => sortedFiles.filter((file) => departmentFromFileName(file.name) === selectedDepartment),
    [selectedDepartment, sortedFiles],
  );

  const activeFile = useMemo(
    () => files.find((file) => file.id === selectedFileId) ?? null,
    [files, selectedFileId],
  );

  const previewHtml = useMemo(() => markdownToHtml(editorContent), [editorContent]);

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
        setStatus(`Loaded ${loadedFiles.length} file(s).`);
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
    setSelectedDepartment(departmentFromFileName(file.name));
    setIsDraft(false);
    setStatus(`Opened ${visibleNameFromStoredName(file.name)}.`);
  }

  function startNewFile() {
    const deptLabel = findDepartmentById(selectedDepartment)?.label ?? "General";
    setSelectedFileId(null);
    setEditorName("new-file.md");
    setEditorContent(defaultDraftContent(deptLabel));
    setIsDraft(true);
    setStatus(`New ${deptLabel} draft ready.`);
  }

  async function createFile(fileName: string, fileContent: string) {
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: storedNameForDepartment(fileName, selectedDepartment),
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
        name: storedNameForDepartment(fileName, selectedDepartment),
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
      <main className="mx-auto grid min-h-screen w-full max-w-[1640px] gap-3 p-3 lg:grid-cols-[72px_300px_1fr] lg:gap-4 lg:p-4">
        <aside className="od-rail hidden min-h-[760px] flex-col items-center gap-3 py-4 lg:flex">
          <button type="button" className="od-rail-badge">
            O
          </button>
          <button type="button" className="od-rail-item">
            D
          </button>
          <button type="button" className="od-rail-item">
            F
          </button>
          <button type="button" className="od-rail-item">
            +
          </button>
        </aside>

        <aside className="od-panel flex min-h-[760px] flex-col overflow-hidden">
          <div className="border-b border-[var(--od-border)] px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-semibold tracking-tight">OpenDash</h1>
              <span className="od-pill">v1</span>
            </div>
            <p className="mt-1 text-xs text-[var(--od-muted)]">Company departments</p>
          </div>

          <div className="px-4 pb-2 pt-3">
            <p className="od-overline">Departments</p>
            <div className="mt-2 space-y-1">
              {departments.map((department) => (
                <button
                  key={department.id}
                  type="button"
                  onClick={() => setSelectedDepartment(department.id)}
                  className={`od-channel-item w-full text-left ${
                    selectedDepartment === department.id
                      ? "border-[var(--od-strong-border)] bg-[var(--od-surface-2)] text-[var(--od-text)]"
                      : ""
                  }`}
                >
                  # {department.label.toLowerCase()}
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
            <p className="od-overline">{selectedDepartmentLabel} Files</p>
            <p className="text-xs text-[var(--od-muted)]">{departmentFiles.length} total</p>
          </div>

          <div className="mt-2 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
            {departmentFiles.map((file) => (
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
                <div className="truncate text-sm font-medium"># {visibleNameFromStoredName(file.name)}</div>
                <div className="mt-1 truncate text-xs text-[var(--od-muted)]">
                  {dateFormatter.format(new Date(file.updated_at))}
                </div>
              </button>
            ))}
            {!departmentFiles.length && (
              <p className="px-2 py-3 text-sm text-[var(--od-muted)]">
                No files in this department yet.
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
              <p className="od-overline">Department</p>
              <h2 className="text-lg font-semibold tracking-tight">{selectedDepartmentLabel}</h2>
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
