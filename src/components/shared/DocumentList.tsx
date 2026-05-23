// src/components/shared/DocumentList.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Image,
  File,
  Download,
  Trash2,
  ExternalLink,
  Loader2,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { usePermission } from "@/hooks/usePermission";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentItem {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  signedUrl: string | null;
  patientId: string;
  recordId: string | null;
  uploadedById: string;
  createdAt: string;
}

interface DocumentListProps {
  patientId: string;
  recordId?: string; // If provided, filters to this record's docs only
  refreshKey?: number; // Increment to trigger a refresh from parent
  compact?: boolean; // Compact mode for embedding in other cards
  className?: string;
}

// ─── File type config ─────────────────────────────────────────────────────────

function getFileConfig(mimeType: string): {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
} {
  if (mimeType === "application/pdf") {
    return {
      label: "PDF",
      icon: FileText,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-950/50",
    };
  }
  if (mimeType.startsWith("image/")) {
    return {
      label: "Image",
      icon: Image,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-950/50",
    };
  }
  if (mimeType.includes("wordprocessingml")) {
    return {
      label: "DOCX",
      icon: File,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-100 dark:bg-indigo-950/50",
    };
  }
  return {
    label: "File",
    icon: File,
    color: "text-muted-foreground",
    bg: "bg-muted",
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DocumentSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-xl border border-border/50"
        >
          <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DocumentList({
  patientId,
  recordId,
  refreshKey = 0,
  compact = false,
  className,
}: DocumentListProps) {
  const { role } = usePermission();

  const canDelete = role === "ADMIN" || role === "DOCTOR";

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  // ── Fetch documents ────────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ patientId });
      if (recordId) params.set("recordId", recordId);

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (!res.ok) throw new Error();

      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  }, [patientId, recordId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, refreshKey]);

  // ── Open / download document ───────────────────────────────────────────────
  const handleOpen = async (doc: DocumentItem) => {
    // If we have a signed URL and it might still be valid, use it directly
    if (doc.signedUrl) {
      window.open(doc.signedUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // Otherwise fetch a fresh signed URL
    setOpeningId(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}`);
      const data = await res.json();

      if (!res.ok || !data.document?.signedUrl) {
        throw new Error("Failed to get download URL");
      }

      window.open(data.document.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Failed to open document");
    } finally {
      setOpeningId(null);
    }
  };

  // ── Delete document ────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/documents/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete");
      }

      toast.success(`"${deleteTarget.fileName}" deleted`);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete document",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Documents
            {!isLoading && (
              <span className="ml-1.5 font-normal">({documents.length})</span>
            )}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={fetchDocuments}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground",
                isLoading && "animate-spin",
              )}
            />
          </Button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <DocumentSkeleton count={compact ? 2 : 3} />
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl border border-dashed border-border/50">
          <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
            <FolderOpen className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-foreground">
            No documents yet
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Upload files using the upload area above
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const cfg = getFileConfig(doc.fileType);
            const Icon = cfg.icon;
            const isOpening = openingId === doc.id;

            return (
              <div
                key={doc.id}
                className="group flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-border hover:bg-muted/20 transition-all duration-150"
              >
                {/* File icon */}
                <div
                  className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    cfg.bg,
                  )}
                >
                  <Icon className={cn("h-5 w-5", cfg.color)} />
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {doc.fileName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {cfg.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatSize(doc.fileSize)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(doc.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {!compact && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {format(
                        new Date(doc.createdAt),
                        "MMM d, yyyy 'at' h:mm a",
                      )}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => handleOpen(doc)}
                    disabled={isOpening}
                    title="Open / Download"
                  >
                    {isOpening ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : doc.signedUrl ? (
                      <ExternalLink className="h-3.5 w-3.5" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </Button>

                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(doc)}
                      title="Delete document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Document"
        description={
          deleteTarget
            ? `Permanently delete "${deleteTarget.fileName}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
