import type { ChangeEventHandler, FormEventHandler, RefObject } from "react";
import { FileRecord, FolderSummary, folderLabelFromId, visibleNameFromStoredName } from "@/components/file-manager-utils";

type FileManagerExplorerProps = {
  sortedFolders: FolderSummary[];
  filesByFolder: Record<string, FileRecord[]>;
  selectedFolder: string;
  search: string;
  loading: boolean;
  status: string;
  collapsedFolders: Record<string, boolean>;
  dateFormatter: Intl.DateTimeFormat;
  onSetSearch: (value: string) => void;
  onSearch: FormEventHandler<HTMLFormElement>;
  onRefresh: () => void;
  onSelectFolder: (folderId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onCreateFolder: () => void;
  onRenameFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onCreateFile: (folderId: string) => void;
  onOpenFile: (file: FileRecord) => void;
  onClickUpload: () => void;
};

type FileEditorModalProps = {
  isOpen: boolean;
  loading: boolean;
  status: string;
  sortedFolders: FolderSummary[];
  activeFolderId: string;
  fileName: string;
  fileContent: string;
  isDraft: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  onSetFileName: (value: string) => void;
  onSetFileContent: (value: string) => void;
  onSetFolderId: (folderId: string) => void;
};

type UploadInputProps = {
  onUploadPickedFile: ChangeEventHandler<HTMLInputElement>;
  fileInputRef: RefObject<HTMLInputElement | null>;
};

function FolderGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--od-muted)]" aria-hidden="true">
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

function ChevronGlyph({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 text-[var(--od-muted)] transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`}
      aria-hidden="true"
    >
      <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function FileUploadInput({ onUploadPickedFile, fileInputRef }: UploadInputProps) {
  return (
    <input
      ref={fileInputRef}
      type="file"
      accept=".md,.markdown,text/markdown,.txt,text/plain"
      className="hidden"
      onChange={onUploadPickedFile}
    />
  );
}

export function FileManagerExplorer({
  sortedFolders,
  filesByFolder,
  selectedFolder,
  search,
  loading,
  status,
  collapsedFolders,
  dateFormatter,
  onSetSearch,
  onSearch,
  onRefresh,
  onSelectFolder,
  onToggleFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onCreateFile,
  onOpenFile,
  onClickUpload,
}: FileManagerExplorerProps) {
  const selectedLabel = folderLabelFromId(selectedFolder);

  return (
    <section className="od-panel flex min-h-[760px] flex-col overflow-hidden">
      <header className="border-b border-[var(--od-border)] px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="od-overline">OpenDash</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Folder Explorer</h1>
            <p className="mt-2 text-sm text-[var(--od-muted)]">
              Browse folders and markdown files. Open any file to edit raw text.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onCreateFolder} disabled={loading} className="od-button-ghost">
              New folder
            </button>
            <button
              type="button"
              onClick={() => onCreateFile(selectedFolder)}
              disabled={loading}
              className="od-button-ghost"
            >
              New file
            </button>
            <button type="button" onClick={onClickUpload} disabled={loading} className="od-button-ghost">
              Upload markdown
            </button>
            <button type="button" onClick={onRefresh} disabled={loading} className="od-button-primary">
              {loading ? "Working..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <form className="flex min-w-[280px] flex-1 gap-2" onSubmit={onSearch}>
            <input
              value={search}
              onChange={(event) => onSetSearch(event.target.value)}
              placeholder="Search files by name or content"
              className="od-input flex-1"
            />
            <button type="submit" className="od-button-ghost px-4">
              Search
            </button>
          </form>
          <span className="rounded-lg border border-[var(--od-border)] bg-[var(--od-surface-2)] px-3 py-2 text-xs text-[var(--od-muted)]">
            Active: {selectedLabel}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-5 py-4">
        {sortedFolders.map(({ folder, count }) => {
          const folderFiles = filesByFolder[folder.id] ?? [];
          const collapsed = collapsedFolders[folder.id] ?? false;
          const isSelected = folder.id === selectedFolder;

          return (
            <article
              key={folder.id}
              className={`mb-3 rounded-xl border bg-[var(--od-surface-1)]/70 ${
                isSelected ? "border-[var(--od-strong-border)]" : "border-[var(--od-border)]"
              }`}
            >
              <div className="flex items-center gap-1 border-b border-[var(--od-border)] px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onToggleFolder(folder.id)}
                  className="rounded-md border border-transparent p-1 hover:border-[var(--od-border)] hover:bg-[var(--od-surface-2)]"
                  aria-label={collapsed ? "Expand folder" : "Collapse folder"}
                >
                  <ChevronGlyph collapsed={collapsed} />
                </button>

                <button
                  type="button"
                  onClick={() => onSelectFolder(folder.id)}
                  className="flex flex-1 items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-[var(--od-surface-2)]"
                >
                  <FolderGlyph />
                  <span className="font-medium text-[var(--od-text)]">{folder.label}</span>
                </button>

                <span className="rounded-md border border-[var(--od-border)] bg-[var(--od-surface-2)] px-2 py-0.5 text-xs tabular-nums text-[var(--od-muted)]">
                  {count}
                </span>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onCreateFile(folder.id);
                  }}
                  disabled={loading}
                  className="rounded-md border border-[var(--od-border)] px-2 py-1 text-xs text-[var(--od-soft-text)] hover:bg-[var(--od-surface-2)] disabled:opacity-50"
                >
                  New file
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRenameFolder(folder.id);
                  }}
                  disabled={loading || folder.id === "general"}
                  className="rounded-md border border-[var(--od-border)] px-2 py-1 text-xs text-[var(--od-soft-text)] hover:bg-[var(--od-surface-2)] disabled:opacity-50"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteFolder(folder.id);
                  }}
                  disabled={loading || folder.id === "general"}
                  className="rounded-md border border-[var(--od-border)] px-2 py-1 text-xs text-[var(--od-soft-text)] hover:bg-[var(--od-surface-2)] disabled:opacity-50"
                >
                  Delete
                </button>
              </div>

              {!collapsed && (
                <div className="space-y-1 px-3 py-2">
                  {folderFiles.length ? (
                    folderFiles.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => onOpenFile(file)}
                        className="flex w-full items-center justify-between rounded-lg border border-transparent bg-transparent px-2 py-2 text-left transition hover:border-[var(--od-border)] hover:bg-[var(--od-surface-2)]"
                      >
                        <span className="flex items-center gap-2 text-sm text-[var(--od-soft-text)]">
                          <FileGlyph />
                          <span className="truncate">{visibleNameFromStoredName(file.name)}</span>
                        </span>
                        <span className="text-xs text-[var(--od-muted)]">{dateFormatter.format(new Date(file.updated_at))}</span>
                      </button>
                    ))
                  ) : (
                    <p className="rounded-lg border border-dashed border-[var(--od-border)] bg-[var(--od-surface-2)] px-3 py-3 text-sm text-[var(--od-muted)]">
                      No markdown files in this folder.
                    </p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <footer className="border-t border-[var(--od-border)] bg-[var(--od-surface-1)] px-5 py-3 text-sm text-[var(--od-soft-text)]">
        <span className="text-[var(--od-muted)]">Status</span>: {status}
      </footer>
    </section>
  );
}

export function FileEditorModal({
  isOpen,
  loading,
  status,
  sortedFolders,
  activeFolderId,
  fileName,
  fileContent,
  isDraft,
  onClose,
  onSave,
  onDelete,
  onSetFileName,
  onSetFileContent,
  onSetFolderId,
}: FileEditorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-3 backdrop-blur-sm md:p-6">
      <section className="mx-auto flex h-full w-full max-w-6xl flex-col rounded-2xl border border-[var(--od-border)] bg-[var(--od-surface-1)] shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
        <header className="border-b border-[var(--od-border)] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="od-overline">Raw Markdown Editor</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">{isDraft ? "New File" : "Edit File"}</h2>
            </div>
            <div className="flex items-center gap-2">
              {!isDraft && (
                <button type="button" onClick={onDelete} disabled={loading} className="od-button-ghost">
                  Delete
                </button>
              )}
              <button type="button" onClick={onClose} className="od-button-ghost">
                Close
              </button>
              <button type="button" onClick={onSave} disabled={loading} className="od-button-primary">
                {loading ? "Working..." : isDraft ? "Create" : "Save"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_240px]">
            <input
              value={fileName}
              onChange={(event) => onSetFileName(event.target.value)}
              className="od-input"
              placeholder="File name (example: roadmap.md)"
            />
            <select
              value={activeFolderId}
              onChange={(event) => onSetFolderId(event.target.value)}
              className="od-input"
            >
              {sortedFolders.map(({ folder }) => (
                <option key={folder.id} value={folder.id}>
                  {folder.label}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="flex-1 px-5 py-4">
          <textarea
            value={fileContent}
            onChange={(event) => onSetFileContent(event.target.value)}
            className="od-input h-full min-h-[340px] w-full resize-none font-mono text-sm leading-6"
            placeholder="Write raw markdown text..."
          />
        </div>

        <footer className="border-t border-[var(--od-border)] bg-[var(--od-surface-2)] px-5 py-3 text-sm text-[var(--od-soft-text)]">
          <span className="text-[var(--od-muted)]">Status</span>: {status}
        </footer>
      </section>
    </div>
  );
}
