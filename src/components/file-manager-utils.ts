export type FileRecord = {
  id: string;
  name: string;
  content: string;
  updated_at: string;
};

export type FolderSummary = {
  folder: {
    id: string;
    label: string;
  };
  count: number;
};

const FOLDER_MARKER_FILE = ".opendash-folder.md";

export function normalizeFolderId(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function folderLabelFromId(id: string) {
  if (id === "general") return "General";
  const words = id
    .split(/[-_]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!words.length) return "General";
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export function folderFromFileName(name: string) {
  const normalized = name.trim().replace(/^\/+/, "");
  const segments = normalized.split("/");
  if (segments.length < 2) return "general";
  const prefix = normalizeFolderId(segments[0] ?? "");
  return prefix || "general";
}

export function visibleNameFromStoredName(name: string) {
  const normalized = name.trim().replace(/^\/+/, "");
  const segments = normalized.split("/");
  if (segments.length > 1) {
    return segments.slice(1).join("/");
  }
  return normalized;
}

export function markerFileNameForFolder(folderId: string) {
  return `${folderId}/${FOLDER_MARKER_FILE}`;
}

function isFolderMarkerFileName(name: string) {
  return visibleNameFromStoredName(name).toLowerCase() === FOLDER_MARKER_FILE;
}

export function isSystemFileName(name: string) {
  return isFolderMarkerFileName(name);
}

function normalizeMarkdownFileName(name: string) {
  const trimmed = name.trim().replace(/^\/+/, "");
  const base = trimmed || "untitled";
  return /\.md$/i.test(base) ? base : `${base}.md`;
}

export function isMarkdownFileName(name: string) {
  return /\.(md|markdown)$/i.test(name.trim());
}

export function storedNameForFolder(visibleName: string, folderId: string) {
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

export function markdownToHtml(markdown: string) {
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
        html.push("<pre><code>");
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

export function defaultDraftContent(folderLabel: string) {
  return `# ${folderLabel} Notes\n\n## Context\n\n## Decisions\n\n- `;
}
