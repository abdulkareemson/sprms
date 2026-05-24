// src/components/shared/SearchBar.tsx

"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  className,
  isLoading,
}: SearchBarProps) {
  return (
    <div className={cn("relative group", className)}>
      {/* Search icon */}
      <Search
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
          "transition-colors duration-200 pointer-events-none",
          value
            ? "text-blue-500"
            : "text-slate-400 group-focus-within:text-blue-500",
        )}
      />

      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={isLoading}
        className={cn(
          "pl-9 rounded-xl border-slate-200 bg-white",
          "focus:border-blue-400 focus:ring-2 focus:ring-blue-100",
          "placeholder:text-slate-400 transition-all duration-200",
          "shadow-sm hover:shadow focus:shadow",
          value ? "pr-9" : "pr-4",
          isLoading && "opacity-60 cursor-not-allowed",
        )}
      />

      {/* Clear button — uses your existing shadcn Button */}
      {value && !isLoading && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onChange("")}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}