"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileEditorModal, FileManagerExplorer, FileUploadInput } from "@/components/file-manager-sections";
import {
  defaultDraftContent,
  FileRecord,
  FolderSummary,
  folderFromFileName,
  folderLabelFromId,
  isMarkdownFileName,
  isSystemFileName,
  markerFileNameForFolder,
  normalizeFolderId,
  storedNameForFolder,
  visibleNameFromStoredName,
} from "@/components/file-manager-utils";

type FileManagerProps = {
  initialFiles: FileRecord[];
};

export default function FileManager({ initialFiles }: FileManagerProps) {
  const initialVisibleCount = initialFiles.filter((file) => !isSystemFileName(file.name)).length;

  const [files, setFiles] = useState<FileRecord[]>(initialFiles);
  const [selectedFolder, setSelectedFolder] = useState("general");
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(`Loaded ${initialVisibleCount} file(s).`);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIsDraft, setModalIsDraft] = useState(true);
  const [modalFileId, setModalFileId] = useState<string | null>(null);
  const [modalFolderId, setModalFolderId] = useState("general");
  const [modalFileName, setModalFileName] = useState("new-file.md");
  const [modalFileContent, setModalFileContent] = useState(defaultDraftContent("General"));

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

  const visibleFiles = useMemo(() => sortedFiles.filter((file) => !isSystemFileName(file.name)), [sortedFiles]);

  const filesByFolder = useMemo(() => {
    const grouped: Record<string, FileRecord[]> = {};
    for (const file of visibleFiles) {
      const folderId = folderFromFileName(file.name);
      if (!grouped[folderId]) grouped[folderId] = [];
      grouped[folderId].push(file);
    }
    return grouped;
  }, [visibleFiles]);

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
        if (b.count !== a.count) return b.count - a.count;
        return a.folder.label.localeCompare(b.folder.label);
      });
  }, [files]);

  useEffect(() => {
    if (!sortedFolders.some((entry) => entry.folder.id === selectedFolder)) {
      setSelectedFolder(sortedFolders[0]?.folder.id ?? "general");
    }
  }, [selectedFolder, sortedFolders]);

  const loadFiles = useCallback(async (query = "") => {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());

      const res = await fetch(`/api/files?${params.toString()}`, {
        credentials: "include",
      });
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

  async function createFile(folderId: string, fileName: string, fileContent: string) {
    const res = await fetch("/api/files", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: storedNameForFolder(fileName, folderId),
        content: fileContent,
      }),
    });
    const data = (await res.json()) as { file?: FileRecord; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to create file.");
    return data.file ?? null;
  }

  async function updateFile(fileId: string, folderId: string, fileName: string, fileContent: string) {
    const res = await fetch(`/api/files/${fileId}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: storedNameForFolder(fileName, folderId),
        content: fileContent,
      }),
    });
    const data = (await res.json()) as { file?: FileRecord; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to save file.");
    return data.file ?? null;
  }

  async function createFolder(folderName: string) {
    const folderId = normalizeFolderId(folderName);
    if (!folderId) throw new Error("Folder name must contain letters or numbers.");
    if (folderId === "general") throw new Error("The general folder already exists.");
    if (sortedFolders.some((entry) => entry.folder.id === folderId)) throw new Error("Folder already exists.");

    const res = await fetch("/api/files", {
      method: "POST",
      credentials: "include",
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
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName }),
    });
    const data = (await res.json()) as { file?: FileRecord; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to rename files in folder.");
  }

  async function deleteStoredFile(fileId: string) {
    const res = await fetch(`/api/files/${fileId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to delete file.");
  }

  function openFile(file: FileRecord) {
    const folderId = folderFromFileName(file.name);
    setSelectedFolder(folderId);
    setCollapsedFolders((prev) => ({ ...prev, [folderId]: false }));

    setModalFileId(file.id);
    setModalFolderId(folderId);
    setModalFileName(visibleNameFromStoredName(file.name));
    setModalFileContent(file.content);
    setModalIsDraft(false);
    setIsModalOpen(true);

    setStatus(`Opened ${visibleNameFromStoredName(file.name)}.`);
  }

  function startNewFile(folderId = selectedFolder) {
    const label = folderLabelFromId(folderId);
    setSelectedFolder(folderId);
    setCollapsedFolders((prev) => ({ ...prev, [folderId]: false }));

    setModalFileId(null);
    setModalFolderId(folderId);
    setModalFileName("new-file.md");
    setModalFileContent(defaultDraftContent(label));
    setModalIsDraft(true);
    setIsModalOpen(true);

    setStatus(`New ${label} file ready.`);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  async function handleSaveModalFile() {
    setLoading(true);
    setStatus(modalIsDraft ? "Creating file..." : "Saving file...");

    try {
      if (!modalFileName.trim()) {
        setStatus("File name is required.");
        return;
      }

      let saved: FileRecord | null = null;
      if (modalIsDraft || !modalFileId) {
        saved = await createFile(modalFolderId, modalFileName, modalFileContent);
      } else {
        saved = await updateFile(modalFileId, modalFolderId, modalFileName, modalFileContent);
      }

      await loadFiles(search);

      if (saved) {
        const folderId = folderFromFileName(saved.name);
        setSelectedFolder(folderId);
        setCollapsedFolders((prev) => ({ ...prev, [folderId]: false }));

        setModalFileId(saved.id);
        setModalFolderId(folderId);
        setModalFileName(visibleNameFromStoredName(saved.name));
        setModalFileContent(saved.content);
        setModalIsDraft(false);
      }

      setStatus("File saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed.";
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteModalFile() {
    if (!modalFileId) return;

    const confirmed = window.confirm("Delete this file? This cannot be undone.");
    if (!confirmed) return;

    setLoading(true);
    setStatus("Deleting file...");
    try {
      await deleteStoredFile(modalFileId);
      await loadFiles(search);
      setIsModalOpen(false);
      setModalFileId(null);
      setStatus("File deleted.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed.";
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
      const created = await createFile(selectedFolder, file.name, text);
      await loadFiles(search);

      if (created) {
        openFile(created);
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
      setCollapsedFolders((prev) => ({ ...prev, [folderId]: false }));
      setStatus(`Created folder ${folderLabelFromId(folderId)}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create folder.";
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRenameFolder(folderId: string) {
    if (folderId === "general") {
      setStatus("General folder cannot be renamed.");
      return;
    }

    const nextNameInput = window.prompt("Rename folder", folderLabelFromId(folderId));
    if (nextNameInput === null) return;

    const nextFolderId = normalizeFolderId(nextNameInput);
    if (!nextFolderId) {
      setStatus("Folder name must contain letters or numbers.");
      return;
    }
    if (nextFolderId === folderId) {
      setStatus("Folder name is unchanged.");
      return;
    }
    if (sortedFolders.some((entry) => entry.folder.id === nextFolderId)) {
      setStatus("A folder with that name already exists.");
      return;
    }

    const filesInFolder = files.filter((file) => folderFromFileName(file.name) === folderId);
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

      if (selectedFolder === folderId) {
        setSelectedFolder(nextFolderId);
      }
      if (modalFolderId === folderId) {
        setModalFolderId(nextFolderId);
      }

      setStatus(`Renamed folder to ${folderLabelFromId(nextFolderId)}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to rename folder.";
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteFolder(folderId: string) {
    if (folderId === "general") {
      setStatus("General folder cannot be deleted.");
      return;
    }

    const filesInFolder = files.filter((file) => folderFromFileName(file.name) === folderId);
    const userFilesInFolder = filesInFolder.filter((file) => !isSystemFileName(file.name));
    const confirmed = window.confirm(
      `Delete folder "${folderLabelFromId(folderId)}" and ${userFilesInFolder.length} file(s)? This cannot be undone.`,
    );
    if (!confirmed) return;

    setLoading(true);
    setStatus("Deleting folder...");
    try {
      for (const file of filesInFolder) {
        await deleteStoredFile(file.id);
      }

      await loadFiles(search);

      if (selectedFolder === folderId) {
        setSelectedFolder("general");
      }

      if (modalFolderId === folderId) {
        setIsModalOpen(false);
        setModalFileId(null);
      }

      setStatus(`Deleted folder ${folderLabelFromId(folderId)}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete folder.";
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectFolder(folderId: string) {
    setSelectedFolder(folderId);
    setCollapsedFolders((prev) => ({ ...prev, [folderId]: false }));
  }

  function handleToggleFolder(folderId: string) {
    setCollapsedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="mx-auto w-full max-w-[1380px] p-3 lg:p-4">
        <FileUploadInput onUploadPickedFile={handleUploadPickedFile} fileInputRef={fileInputRef} />

        <FileManagerExplorer
          sortedFolders={sortedFolders}
          filesByFolder={filesByFolder}
          selectedFolder={selectedFolder}
          search={search}
          loading={loading}
          status={status}
          collapsedFolders={collapsedFolders}
          dateFormatter={dateFormatter}
          onSetSearch={setSearch}
          onSearch={handleSearch}
          onRefresh={handleRefresh}
          onSelectFolder={handleSelectFolder}
          onToggleFolder={handleToggleFolder}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onCreateFile={startNewFile}
          onOpenFile={openFile}
          onClickUpload={() => fileInputRef.current?.click()}
        />

        <FileEditorModal
          isOpen={isModalOpen}
          loading={loading}
          status={status}
          sortedFolders={sortedFolders}
          activeFolderId={modalFolderId}
          fileName={modalFileName}
          fileContent={modalFileContent}
          isDraft={modalIsDraft}
          onClose={closeModal}
          onSave={handleSaveModalFile}
          onDelete={handleDeleteModalFile}
          onSetFileName={setModalFileName}
          onSetFileContent={setModalFileContent}
          onSetFolderId={setModalFolderId}
        />
      </main>
    </div>
  );
}
