import type { ChangeEventHandler, FormEventHandler, RefObject } from "react";
import { FileRecord, FolderSummary, visibleNameFromStoredName } from "@/components/file-manager-utils";

type FileManagerSidebarProps = {
  sortedFolders: FolderSummary[];
  selectedFolder: string;
  selectedFolderLabel: string;
  folderFiles: FileRecord[];
  selectedFileId: string | null;
  search: string;
  loading: boolean;
  dateFormatter: Intl.DateTimeFormat;
  onSetSearch: (value: string) => void;
  onSearch: FormEventHandler<HTMLFormElement>;
  onSelectFolder: (folderId: string) => void;
  onOpenFile: (file: FileRecord) => void;
  onCreateFolder: () => void;
  onRenameFolder: () => void;
  onDeleteFolder: () => void;
};

type FileManagerWorkspaceProps = {
  selectedFolderLabel: string;
  loading: boolean;
  isDraft: boolean;
  editorName: string;
  editorContent: string;
  activeFile: FileRecord | null;
  previewHtml: string;
  status: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onStartNewFile: () => void;
  onClickUpload: () => void;
  onUploadPickedFile: ChangeEventHandler<HTMLInputElement>;
  onSaveFile: () => void;
  onRefresh: () => void;
  onEditorNameChange: (value: string) => void;
  onEditorContentChange: (value: string) => void;
};

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

export function FileManagerSidebar({
  sortedFolders,
  selectedFolder,
  selectedFolderLabel,
  folderFiles,
  selectedFileId,
  search,
  loading,
  dateFormatter,
  onSetSearch,
  onSearch,
  onSelectFolder,
  onOpenFile,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FileManagerSidebarProps) {
  return (
    <aside className="od-panel flex min-h-[760px] flex-col overflow-hidden">
      <div className="border-b border-[var(--od-border)] px-5 py-5">
        <div className="flex items-center justify-between">
          <h1 className="text-[2rem] font-semibold tracking-tight">OpenDash</h1>
          <span className="od-pill">v1</span>
        </div>
        <p className="mt-2 text-sm text-[var(--od-muted)]">Company folders</p>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-3 pb-3 pt-3">
        <section className="od-sidebar-section">
          <div className="od-sidebar-section-head">
            <p className="od-overline">Folders</p>
            <button type="button" onClick={onCreateFolder} disabled={loading} className="od-sidebar-action">
              New Folder
            </button>
          </div>
          <div className="mt-2 space-y-1.5">
            {sortedFolders.map(({ folder, count }) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => onSelectFolder(folder.id)}
                className={`od-folder-row ${
                  selectedFolder === folder.id
                    ? "border-[var(--od-strong-border)] bg-[var(--od-surface-3)] text-[var(--od-text)]"
                    : "text-[var(--od-soft-text)]"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <FolderGlyph />
                  <span className="truncate">{folder.label}</span>
                </span>
                <span className="od-count-pill">{count}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="od-sidebar-section">
          <p className="od-overline">Search</p>
          <form className="mt-2 flex gap-2" onSubmit={onSearch}>
            <input
              value={search}
              onChange={(event) => onSetSearch(event.target.value)}
              placeholder="Search files"
              className="od-input flex-1"
            />
            <button type="submit" className="od-button-ghost px-3">
              Find
            </button>
          </form>
        </section>

        <section className="od-sidebar-section flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="od-overline">{selectedFolderLabel} Files</p>
              <p className="mt-1 text-xs text-[var(--od-muted)]">{folderFiles.length} total</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onRenameFolder}
                disabled={loading || selectedFolder === "general"}
                className="od-sidebar-action"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={onDeleteFolder}
                disabled={loading || selectedFolder === "general"}
                className="od-sidebar-action od-sidebar-action-danger"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto">
            {folderFiles.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => onOpenFile(file)}
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
              <div className="rounded-xl border border-dashed border-[var(--od-border)] bg-[var(--od-surface-2)] px-3 py-4 text-sm text-[var(--od-muted)]">
                No files in this folder yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}

export function FileManagerWorkspace({
  selectedFolderLabel,
  loading,
  isDraft,
  editorName,
  editorContent,
  activeFile,
  previewHtml,
  status,
  fileInputRef,
  onStartNewFile,
  onClickUpload,
  onUploadPickedFile,
  onSaveFile,
  onRefresh,
  onEditorNameChange,
  onEditorContentChange,
}: FileManagerWorkspaceProps) {
  return (
    <section className="od-panel flex min-h-[760px] flex-col overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,text/markdown,.txt,text/plain"
        className="hidden"
        onChange={onUploadPickedFile}
      />

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--od-border)] px-5 py-4">
        <div>
          <p className="od-overline">Folder</p>
          <h2 className="text-lg font-semibold tracking-tight">{selectedFolderLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onStartNewFile} className="od-button-ghost" disabled={loading}>
            Create file
          </button>
          <button type="button" onClick={onClickUpload} className="od-button-ghost" disabled={loading}>
            Upload markdown
          </button>
          <button type="button" onClick={onSaveFile} className="od-button-primary" disabled={loading}>
            {loading ? "Working..." : isDraft ? "Create" : "Save"}
          </button>
          <button type="button" onClick={onRefresh} className="od-button-ghost" disabled={loading}>
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
              onChange={(event) => onEditorNameChange(event.target.value)}
              className="od-input mt-2 w-full"
              placeholder="File name (example: q1-plan.md)"
            />
          </div>
          <div className="flex-1 px-5 py-4">
            <textarea
              value={editorContent}
              onChange={(event) => onEditorContentChange(event.target.value)}
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
  );
}
