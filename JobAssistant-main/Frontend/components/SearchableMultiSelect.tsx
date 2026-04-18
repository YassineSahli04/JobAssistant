"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface SearchableMultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
}

export default function SearchableMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Search...",
  label,
}: SearchableMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedQuery = query.trim();

  const filtered = options.filter(
    (opt) =>
      opt.toLowerCase().includes(normalizedQuery.toLowerCase()) &&
      !selected.includes(opt)
  );

  const canAddCustomOption =
    normalizedQuery.length > 0 &&
    !options.some((opt) => opt.toLowerCase() === normalizedQuery.toLowerCase()) &&
    !selected.some((item) => item.toLowerCase() === normalizedQuery.toLowerCase());

  const handleSelect = (option: string) => {
    onChange([...selected, option]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleAddCustom = () => {
    if (!normalizedQuery) return;
    onChange([...selected, normalizedQuery]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleRemove = (option: string) => {
    onChange(selected.filter((s) => s !== option));
  };

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-gray-300">{label}</label>
      )}

      <div
        className={`
          min-h-[44px] w-full flex flex-wrap gap-2 items-center
          bg-[#1a1f2e] border rounded-xl px-3 py-2 cursor-text
          transition-colors duration-150
          ${
            open
              ? "border-indigo-500 ring-1 ring-indigo-500/40"
              : "border-gray-700 hover:border-gray-500"
          }
        `}
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {selected.map((item) => (
          <span
            key={item}
            className="flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 text-xs font-medium px-2.5 py-1 rounded-lg border border-indigo-500/30"
          >
            {item}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(item);
              }}
              className="text-indigo-400 hover:text-white transition-colors leading-none"
              aria-label={`Remove ${item}`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
        />
      </div>

      {open && (
        <div className="relative z-50">
          <div className="absolute top-0 left-0 right-0 bg-[#1a1f2e] border border-gray-700 rounded-xl shadow-xl overflow-hidden">
            {filtered.length > 0 || canAddCustomOption ? (
              <ul className="max-h-52 overflow-y-auto py-1 divide-y divide-gray-800/50">
                {filtered.map((opt) => (
                  <li key={opt}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(opt)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors"
                    >
                      {opt}
                    </button>
                  </li>
                ))}

                {canAddCustomOption && (
                  <li>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleAddCustom}
                      className="w-full text-left px-4 py-2.5 text-sm text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                    >
                      Add "{normalizedQuery}"
                    </button>
                  </li>
                )}
              </ul>
            ) : (
              <p className="px-4 py-3 text-sm text-gray-500">
                {query ? `No results for "${query}"` : "All options selected"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}