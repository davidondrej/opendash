"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";

type FileRecord = {
  id: string;
  name: string;
  content: string;
  updated_at: string;
};

type FileManagerProps = {
  initialFiles: FileRecord[];
};

export default function FileManager({ initialFiles }: FileManagerProps) {
  const [files, setFiles] = useState<FileRecord[]>(initialFiles);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(`Loaded ${initialFiles.length} file(s).`);

  const loadFiles = useCallback(async (query = "") => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());

    const res = await fetch(`/api/files?${params.toString()}`);
    const data = (await res.json()) as { files?: FileRecord[]; error?: string };

    if (!res.ok) {
      setStatus(data.error ?? "Failed to load files.");
      setLoading(false);
      return;
    }

    const loadedFiles = data.files ?? [];
    setFiles(loadedFiles);
    if (selectedFile) {
      const nextSelected = loadedFiles.find((file) => file.id === selectedFile.id) ?? null;
      setSelectedFile(nextSelected);
    }
    setStatus(`Loaded ${loadedFiles.length} file(s).`);
    setLoading(false);
  }, [selectedFile]);

  const sortedFiles = useMemo(
    () =>
      [...files].sort((a, b) => {
        const aDate = new Date(a.updated_at).getTime();
        const bDate = new Date(b.updated_at).getTime();
        return bDate - aDate;
      }),
    [files],
  );

  async function handleCreateFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setStatus("File name is required.");
      return;
    }

    setLoading(true);
    setStatus("Uploading file...");
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, content }),
    });

    const data = (await res.json()) as { file?: FileRecord; error?: string };
    if (!res.ok) {
      setStatus(data.error ?? "Failed to upload file.");
      setLoading(false);
      return;
    }

    if (data.file) {
      setName("");
      setContent("");
      setSelectedFile(data.file);
    }
    await loadFiles(search);
    setStatus("File uploaded.");
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("Loading files...");
    await loadFiles(search);
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <main className="mx-auto grid w-full max-w-6xl gap-6 p-6 md:grid-cols-[300px_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h1 className="text-2xl font-bold">OpenDash</h1>
          <p className="mt-1 text-sm text-slate-600">v1 local MVP</p>

          <form className="mt-4 flex gap-2" onSubmit={handleSearch}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
            >
              Find
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {sortedFiles.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => setSelectedFile(file)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                  selectedFile?.id === file.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="truncate font-medium">{file.name}</div>
                <div className="text-xs opacity-80">
                  {new Date(file.updated_at).toLocaleString()}
                </div>
              </button>
            ))}
            {!sortedFiles.length && (
              <p className="text-sm text-slate-500">No files yet. Upload your first file.</p>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Upload File</h2>
            <form className="mt-3 space-y-3" onSubmit={handleCreateFile}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="File name (example: prompt.md)"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="File content..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                disabled={loading}
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {loading ? "Working..." : "Upload"}
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Selected File</h2>
            {selectedFile ? (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-sm text-slate-500">Name</p>
                  <p className="font-medium">{selectedFile.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Content</p>
                  <pre className="max-h-80 overflow-auto rounded-md bg-slate-50 p-3 text-xs whitespace-pre-wrap">
                    {selectedFile.content}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Select a file from the left panel.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600 shadow-sm">
            Status: {status}
          </div>
        </section>
      </main>
    </div>
  );
}
