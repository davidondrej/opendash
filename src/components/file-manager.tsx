"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileManagerSidebar, FileManagerWorkspace } from "@/components/file-manager-sections";
import {
  defaultDraftContent,
  FileRecord,
  FolderSummary,
  folderFromFileName,
  folderLabelFromId,
  isMarkdownFileName,
  isSystemFileName,
  markerFileNameForFolder,
  markdownToHtml,
  normalizeFolderId,
  storedNameForFolder,
  visibleNameFromStoredName,
} from "@/components/file-manager-utils";

type FileManagerProps = {
  initialFiles: FileRecord[];
};

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

  const sortedFolders = useMemo<FolderSummary[]>(() => {
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

  const loadFiles = useCallback(async (query = "") => {
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
  }, []);

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

  async function createFolder(folderName: string) {
    const folderId = normalizeFolderId(folderName);
    if (!folderId) {
      throw new Error("Folder name must contain letters or numbers.");
    }
    if (folderId === "general") {
      throw new Error("The general folder already exists.");
    }
    if (sortedFolders.some((entry) => entry.folder.id === folderId)) {
      throw new Error("Folder already exists.");
    }

    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: markerFileNameForFolder(folderId),
        content: `# ${folderLabelFromId(folderId)}\n`,
      }),
    });
    const data = (await res.json()) as { file?: FileRecord; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to create folder.");
    return folderId;
  }

  async function renameStoredFile(fileId: string, nextName: string) {
    const res = await fetch(`/api/files/${fileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName }),
    });
    const data = (await res.json()) as { file?: FileRecord; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to rename files in folder.");
  }

  async function deleteStoredFile(fileId: string) {
    const res = await fetch(`/api/files/${fileId}`, {
      method: "DELETE",
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to delete files in folder.");
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

  async function handleCreateFolder() {
    const input = window.prompt("New folder name");
    if (input === null) return;

    setLoading(true);
    setStatus("Creating folder...");
    try {
      const folderId = await createFolder(input);
      await loadFiles(search);
      setSelectedFolder(folderId);
      setSelectedFileId(null);
      setEditorName("new-file.md");
      setEditorContent(defaultDraftContent(folderLabelFromId(folderId)));
      setIsDraft(true);
      setStatus(`Created folder ${folderLabelFromId(folderId)}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create folder.";
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRenameFolder() {
    if (selectedFolder === "general") {
      setStatus("General folder cannot be renamed.");
      return;
    }

    const nextNameInput = window.prompt("Rename folder", folderLabelFromId(selectedFolder));
    if (nextNameInput === null) return;
    const nextFolderId = normalizeFolderId(nextNameInput);

    if (!nextFolderId) {
      setStatus("Folder name must contain letters or numbers.");
      return;
    }
    if (nextFolderId === selectedFolder) {
      setStatus("Folder name is unchanged.");
      return;
    }
    if (sortedFolders.some((entry) => entry.folder.id === nextFolderId)) {
      setStatus("A folder with that name already exists.");
      return;
    }

    const filesInFolder = files.filter((file) => folderFromFileName(file.name) === selectedFolder);
    if (!filesInFolder.length) {
      setStatus("This folder has no files to rename.");
      return;
    }

    setLoading(true);
    setStatus("Renaming folder...");
    try {
      for (const file of filesInFolder) {
        const nextName = storedNameForFolder(visibleNameFromStoredName(file.name), nextFolderId);
        await renameStoredFile(file.id, nextName);
      }
      await loadFiles(search);
      setSelectedFolder(nextFolderId);
      setStatus(`Renamed folder to ${folderLabelFromId(nextFolderId)}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to rename folder.";
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteFolder() {
    if (selectedFolder === "general") {
      setStatus("General folder cannot be deleted.");
      return;
    }

    const filesInFolder = files.filter((file) => folderFromFileName(file.name) === selectedFolder);
    const userFilesInFolder = filesInFolder.filter((file) => !isSystemFileName(file.name));
    const confirmed = window.confirm(
      `Delete folder "${folderLabelFromId(selectedFolder)}" and ${userFilesInFolder.length} file(s)? This cannot be undone.`,
    );
    if (!confirmed) return;

    const deletedSelectedFile = filesInFolder.some((file) => file.id === selectedFileId);

    setLoading(true);
    setStatus("Deleting folder...");
    try {
      for (const file of filesInFolder) {
        await deleteStoredFile(file.id);
      }
      await loadFiles(search);
      setSelectedFolder("general");
      if (deletedSelectedFile) {
        setSelectedFileId(null);
        setEditorName("new-file.md");
        setEditorContent(defaultDraftContent("General"));
        setIsDraft(true);
      }
      setStatus(`Deleted folder ${folderLabelFromId(selectedFolder)}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete folder.";
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="mx-auto grid min-h-screen w-full max-w-[1540px] gap-3 p-3 lg:grid-cols-[300px_1fr] lg:gap-4 lg:p-4">
        <FileManagerSidebar
          sortedFolders={sortedFolders}
          selectedFolder={selectedFolder}
          selectedFolderLabel={selectedFolderLabel}
          folderFiles={folderFiles}
          selectedFileId={selectedFileId}
          search={search}
          loading={loading}
          dateFormatter={dateFormatter}
          onSetSearch={setSearch}
          onSearch={handleSearch}
          onSelectFolder={setSelectedFolder}
          onOpenFile={openFile}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
        />

        <FileManagerWorkspace
          selectedFolderLabel={selectedFolderLabel}
          loading={loading}
          isDraft={isDraft}
          editorName={editorName}
          editorContent={editorContent}
          activeFile={activeFile}
          previewHtml={previewHtml}
          status={status}
          fileInputRef={fileInputRef}
          onStartNewFile={startNewFile}
          onClickUpload={() => fileInputRef.current?.click()}
          onUploadPickedFile={handleUploadPickedFile}
          onSaveFile={handleSaveFile}
          onRefresh={handleRefresh}
          onEditorNameChange={setEditorName}
          onEditorContentChange={setEditorContent}
        />
      </main>
    </div>
  );
}
