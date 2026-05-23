// src/components/shared/FileUpload.tsx

"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  X,
  FileText,
  Image,
  File,
  CheckCircle,
  AlertCircle,
  Loader2,
  CloudUpload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_TYPES: Record<
  string,
  { label: string; icon: React.ElementType }
> = {
  "application/pdf": { label: "PDF", icon: FileText },
  "image/jpeg": { label: "JPG", icon: Image },
  "image/jpg": { label: "JPG", icon: Image },
  "image/png": { label: "PNG", icon: Image },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    label: "DOCX",
    icon: File,
  },
};

const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadedDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  createdAt: string;
}

type FileStatus = "idle" | "validating" | "uploading" | "success" | "error";

interface FileItem {
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
  result?: UploadedDocument;
}

interface FileUploadProps {
  patientId: string;
  recordId?: string;
  onSuccess?: (document: UploadedDocument) => void;
  onError?: (error: string) => void;
  className?: string;
  label?: string;
  description?: string;
  disabled?: boolean;
}

// ─── File icon helper ─────────────────────────────────────────────────────────

function FileIcon({
  mimeType,
  className,
}: {
  mimeType: string;
  className?: string;
}) {
  const config = ALLOWED_TYPES[mimeType];
  const Icon = config?.icon ?? File;
  return <Icon className={className} />;
}

// ─── Format file size ─────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// ─── Single file row ──────────────────────────────────────────────────────────

function FileRow({ item, onRemove }: { item: FileItem; onRemove: () => void }) {
  const isImage = item.file.type.startsWith("image/");

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
        item.status === "success" &&
          "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20",
        item.status === "error" &&
          "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20",
        item.status === "uploading" &&
          "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20",
        item.status === "idle" && "border-border/50 bg-muted/20",
      )}
    >
      {/* File icon / preview */}
      <div
        className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
          item.status === "success"
            ? "bg-emerald-100 dark:bg-emerald-950/50"
            : item.status === "error"
              ? "bg-red-100 dark:bg-red-950/50"
              : "bg-muted",
        )}
      >
        {isImage && item.status === "idle" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={URL.createObjectURL(item.file)}
            alt={item.file.name}
            className="h-10 w-10 rounded-lg object-cover"
          />
        ) : (
          <FileIcon
            mimeType={item.file.type}
            className={cn(
              "h-5 w-5",
              item.status === "success"
                ? "text-emerald-600 dark:text-emerald-400"
                : item.status === "error"
                  ? "text-red-500"
                  : "text-muted-foreground",
            )}
          />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {item.file.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatSize(item.file.size)}
          {item.status === "uploading" && (
            <span className="ml-2 text-blue-600 dark:text-blue-400">
              Uploading...
            </span>
          )}
          {item.status === "success" && (
            <span className="ml-2 text-emerald-600 dark:text-emerald-400">
              Uploaded successfully
            </span>
          )}
          {item.status === "error" && item.error && (
            <span className="ml-2 text-red-500">{item.error}</span>
          )}
        </p>

        {/* Progress bar during upload */}
        {item.status === "uploading" && (
          <Progress value={item.progress} className="h-1 mt-2" />
        )}
      </div>

      {/* Status icon + remove button */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {item.status === "uploading" && (
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
        )}
        {item.status === "success" && (
          <CheckCircle className="h-4 w-4 text-emerald-500" />
        )}
        {item.status === "error" && (
          <AlertCircle className="h-4 w-4 text-red-500" />
        )}

        {item.status !== "uploading" && (
          <button
            type="button"
            onClick={onRemove}
            className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FileUpload({
  patientId,
  recordId,
  onSuccess,
  onError,
  className,
  label = "Upload Documents",
  description = "Drag and drop or click to upload",
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Validate file ──────────────────────────────────────────────────────────
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES[file.type]) {
      return `"${file.name}" — invalid type. Only PDF, JPG, PNG, DOCX allowed.`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `"${file.name}" exceeds 5MB limit (${formatSize(file.size)})`;
    }
    return null;
  };

  // ── Add files to queue ─────────────────────────────────────────────────────
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    const validatedItems: FileItem[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      validatedItems.push({
        file,
        status: error ? "error" : "idle",
        progress: 0,
        error: error ?? undefined,
      });
    }

    setFiles((prev) => [...prev, ...validatedItems]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      // Reset input so same file can be re-added
      e.target.value = "";
    }
  };

  // ── Upload single file ─────────────────────────────────────────────────────
  const uploadFile = async (index: number): Promise<void> => {
    const item = files[index];
    if (!item || item.status !== "idle") return;

    // Mark as uploading
    setFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, status: "uploading", progress: 10 } : f,
      ),
    );

    try {
      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("patientId", patientId);
      if (recordId) formData.append("recordId", recordId);

      // Simulate progress (real XHR progress not available with fetch)
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index && f.status === "uploading" && f.progress < 85
              ? { ...f, progress: f.progress + 15 }
              : f,
          ),
        );
      }, 300);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Upload failed");
      }

      // Success
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? { ...f, status: "success", progress: 100, result: data.document }
            : f,
        ),
      );

      toast.success(`"${item.file.name}" uploaded successfully`);
      onSuccess?.(data.document);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";

      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? { ...f, status: "error", progress: 0, error: message }
            : f,
        ),
      );

      toast.error(message);
      onError?.(message);
    }
  };

  // ── Upload all idle files ──────────────────────────────────────────────────
  const uploadAll = async () => {
    const idleIndices = files
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => f.status === "idle")
      .map(({ i }) => i);

    if (idleIndices.length === 0) return;

    setIsUploading(true);

    // Upload sequentially to avoid overwhelming the server
    for (const index of idleIndices) {
      await uploadFile(index);
    }

    setIsUploading(false);
  };

  // ── Remove file from queue ─────────────────────────────────────────────────
  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const idleCount = files.filter((f) => f.status === "idle").length;
  const hasFiles = files.length > 0;
  const hasReadyFiles = idleCount > 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3",
          "rounded-2xl border-2 border-dashed p-8 text-center",
          "cursor-pointer transition-all duration-200",
          isDragging
            ? "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/30 scale-[1.01]"
            : "border-border/60 hover:border-blue-300 hover:bg-muted/30 dark:hover:border-blue-700",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        )}
      >
        {/* Upload icon */}
        <div
          className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center transition-colors",
            isDragging ? "bg-blue-100 dark:bg-blue-900" : "bg-muted/50",
          )}
        >
          {isDragging ? (
            <CloudUpload className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          ) : (
            <Upload className="h-7 w-7 text-muted-foreground" />
          )}
        </div>

        {/* Text */}
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>

        {/* Accepted types */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {["PDF", "JPG", "PNG", "DOCX"].map((type) => (
            <span
              key={type}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50"
            >
              {type}
            </span>
          ))}
          <span className="text-[10px] text-muted-foreground">
            · Max {MAX_SIZE_MB}MB each
          </span>
        </div>

        {/* Hidden input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.docx"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={disabled}
        />
      </div>

      {/* File queue */}
      {hasFiles && (
        <div className="space-y-2">
          {files.map((item, index) => (
            <FileRow
              key={`${item.file.name}-${index}`}
              item={item}
              onRemove={() => removeFile(index)}
            />
          ))}
        </div>
      )}

      {/* Upload button */}
      {hasReadyFiles && (
        <Button
          type="button"
          onClick={uploadAll}
          disabled={isUploading || disabled}
          className="w-full h-10 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading {idleCount} file{idleCount !== 1 ? "s" : ""}...
            </>
          ) : (
            <>
              <CloudUpload className="h-4 w-4" />
              Upload {idleCount} file{idleCount !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
