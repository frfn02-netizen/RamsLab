"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

export type CustomSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type SelectSize = "sm" | "md" | "lg";

type PanelPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: "top" | "bottom";
};

export type CustomSelectProps = {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  size?: SelectSize;
  className?: string;
  triggerClassName?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
  loadingMessage?: string;
  clearLabel?: string;
};

const SIZE_CLASSES: Record<SelectSize, string> = {
  sm: "min-h-9 px-2.5 py-1.5 text-sm",
  md: "min-h-[42px] px-3 py-2.5 text-sm",
  lg: "min-h-12 px-3.5 py-3 text-sm",
};

function ChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function ClearIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function filterOptions(options: CustomSelectOption[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return options;
  return options.filter((option) =>
    option.label.toLowerCase().includes(normalized),
  );
}

function firstEnabledIndex(options: CustomSelectOption[]) {
  return options.findIndex((option) => !option.disabled);
}

function enabledIndexFromEnd(options: CustomSelectOption[]) {
  for (let index = options.length - 1; index >= 0; index -= 1) {
    if (!options[index].disabled) return index;
  }
  return -1;
}

export default function CustomSelect({
  id,
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  loading = false,
  required = false,
  invalid = false,
  clearable = false,
  searchable,
  size = "md",
  className = "",
  triggerClassName = "",
  ariaLabel,
  ariaLabelledby,
  ariaDescribedby,
  emptyMessage = "No results found.",
  searchPlaceholder = "Search…",
  loadingMessage = "Loading…",
  clearLabel = "Clear selection",
}: CustomSelectProps) {
  const generatedId = useId();
  const resolvedId = id ?? generatedId;
  const listboxId = `${resolvedId}-listbox`;
  const showSearch = searchable ?? options.length > 8;
  const needsNativeSelect = Boolean(name || required);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );
  const displayLabel = loading
    ? loadingMessage
    : (selectedOption?.label ?? (value || placeholder || ""));

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [position, setPosition] = useState<PanelPosition | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const filteredOptions = useMemo(
    () => filterOptions(options, query),
    [options, query],
  );

  const activeHighlightedIndex = useMemo(() => {
    if (!open) return -1;
    if (
      highlightedIndex >= 0 &&
      highlightedIndex < filteredOptions.length &&
      !filteredOptions[highlightedIndex].disabled
    ) {
      return highlightedIndex;
    }
    return firstEnabledIndex(filteredOptions);
  }, [filteredOptions, highlightedIndex, open]);

  const panelVisible = open || closing;

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8;
    const width = Math.min(
      Math.max(rect.width, 220),
      viewportWidth - margin * 2,
    );
    const left = Math.min(
      Math.max(rect.left, margin),
      viewportWidth - width - margin,
    );
    const spaceBelow = viewportHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const placement =
      spaceBelow < 220 && spaceAbove > spaceBelow ? "top" : "bottom";
    const availableSpace = placement === "top" ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(160, Math.min(340, availableSpace - 6));

    setPosition({
      top: placement === "bottom" ? rect.bottom + 6 : undefined,
      bottom: placement === "top" ? viewportHeight - rect.top + 6 : undefined,
      left,
      width,
      maxHeight,
      placement,
    });
  }, []);

  const openMenu = useCallback(
    (fromEnd = false) => {
      if (disabled || loading) return;
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setClosing(false);
      updatePosition();
      setOpen(true);
      setQuery("");
      const selectedIndex = options.findIndex(
        (option) => option.value === value && !option.disabled,
      );
      setHighlightedIndex(
        selectedIndex >= 0
          ? selectedIndex
          : fromEnd
            ? enabledIndexFromEnd(options)
            : firstEnabledIndex(options),
      );
    },
    [disabled, loading, options, updatePosition, value],
  );

  const closeMenu = useCallback((restoreFocus = false) => {
    setOpen(false);
    setClosing(true);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setClosing(false);
      setQuery("");
      closeTimerRef.current = null;
    }, 150);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      if (showSearch) {
        searchRef.current?.focus();
      } else {
        triggerRef.current?.focus();
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, showSearch]);

  useEffect(() => {
    if (!panelVisible) return;
    updatePosition();
    const handleViewportChange = () => updatePosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [panelVisible, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      closeMenu();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open, closeMenu]);

  useEffect(() => {
    if (!open || activeHighlightedIndex < 0) return;
    const option = document.getElementById(
      `${resolvedId}-option-${activeHighlightedIndex}`,
    );
    option?.scrollIntoView?.({ block: "nearest" });
  }, [activeHighlightedIndex, open, resolvedId]);

  const moveHighlight = useCallback(
    (delta: number) => {
      if (filteredOptions.length === 0) return;
      let next = activeHighlightedIndex;
      for (let step = 0; step < filteredOptions.length; step += 1) {
        next = (next + delta + filteredOptions.length) % filteredOptions.length;
        if (!filteredOptions[next].disabled) {
          setHighlightedIndex(next);
          return;
        }
      }
    },
    [activeHighlightedIndex, filteredOptions],
  );

  const chooseOption = useCallback(
    (option: CustomSelectOption) => {
      if (option.disabled) return;
      onChange(option.value);
      closeMenu(true);
    },
    [closeMenu, onChange],
  );

  const chooseHighlighted = useCallback(() => {
    const option = filteredOptions[activeHighlightedIndex];
    if (option && !option.disabled) chooseOption(option);
  }, [activeHighlightedIndex, chooseOption, filteredOptions]);

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery);
    setHighlightedIndex(firstEnabledIndex(filterOptions(options, nextQuery)));
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (!open) openMenu(event.key === "ArrowUp");
        else if (!showSearch) moveHighlight(event.key === "ArrowDown" ? 1 : -1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (!open) openMenu();
        else if (!showSearch) chooseHighlighted();
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          closeMenu(true);
        }
        break;
      case "Tab":
        if (open) closeMenu();
        break;
      default:
        break;
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveHighlight(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveHighlight(-1);
        break;
      case "Enter":
        event.preventDefault();
        chooseHighlighted();
        break;
      case "Escape":
        event.preventDefault();
        closeMenu(true);
        break;
      case "Tab":
        closeMenu();
        break;
      default:
        break;
    }
  };

  const activeDescendant =
    open && activeHighlightedIndex >= 0
      ? `${resolvedId}-option-${activeHighlightedIndex}`
      : undefined;

  const panelStyle = position
    ? ({
        position: "fixed",
        top: position.top,
        bottom: position.bottom,
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
        zIndex: 1000,
        transformOrigin:
          position.placement === "top" ? "bottom center" : "top center",
        "--rams-select-enter-y": position.placement === "top" ? "4px" : "-4px",
      } as CSSProperties)
    : undefined;

  const triggerStateClasses = disabled
    ? "cursor-not-allowed border-black/10 bg-[var(--background-light)] text-[var(--rams-gray)]"
    : invalid
      ? "border-red-500 text-[var(--rams-charcoal)] hover:border-red-600"
      : open
        ? "border-[var(--rams-red)] text-[var(--rams-charcoal)] ring-2 ring-red-100"
        : "border-black/15 text-[var(--rams-charcoal)] hover:border-black/30";

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      {needsNativeSelect && (
        // Native control preserves label association, constraint validation,
        // and form submission for existing forms and assistive fallbacks.
        <select
          id={resolvedId}
          name={name}
          value={value}
          required={required}
          disabled={disabled || loading}
          aria-hidden="true"
          tabIndex={-1}
          className="sr-only"
          onChange={(event) => {
            onChange(event.target.value);
            if (open) closeMenu();
          }}
          onFocus={() => {
            if (!disabled && !loading) openMenu();
          }}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {value && !options.some((option) => option.value === value) && (
            <option value={value}>{value}</option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
      )}

      <button
        ref={triggerRef}
        type="button"
        id={needsNativeSelect ? `${resolvedId}-trigger` : resolvedId}
        role={open && showSearch ? "button" : "combobox"}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={panelVisible ? listboxId : undefined}
        aria-activedescendant={activeDescendant}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-labelledby={
          ariaLabelledby ?? (ariaLabel ? undefined : `${resolvedId}-label`)
        }
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        disabled={disabled || loading}
        onClick={() => {
          if (open) closeMenu();
          else openMenu();
        }}
        onKeyDown={handleTriggerKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white text-left outline-none transition-[border-color,box-shadow,background-color] duration-150 focus-visible:border-[var(--rams-red)] focus-visible:ring-2 focus-visible:ring-red-100 ${SIZE_CLASSES[size]} ${
          clearable && value && !disabled && !loading ? "pr-16" : "pr-9"
        } ${triggerStateClasses} ${triggerClassName}`.trim()}
      >
        <span
          className={`block min-w-0 flex-1 truncate ${
            selectedOption || (value && !loading)
              ? ""
              : "text-[var(--rams-gray)]"
          }`}
        >
          {displayLabel}
        </span>
        {loading && (
          <span
            aria-hidden="true"
            className="absolute right-9 h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--rams-red)] border-t-transparent"
          />
        )}
      </button>

      {clearable && value && !disabled && !loading && (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => {
            onChange("");
            triggerRef.current?.focus();
          }}
          className="absolute right-8 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-[var(--rams-gray)] transition-colors duration-150 hover:bg-[var(--background-light)] hover:text-[var(--rams-charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)]"
        >
          <ClearIcon className="h-3.5 w-3.5" />
        </button>
      )}

      <ChevronDown
        className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--rams-gray)] transition-transform duration-150 ${
          open ? "rotate-180" : ""
        }`}
      />

      {panelVisible &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            role="presentation"
            data-state={open ? "open" : "closing"}
            data-placement={position.placement}
            style={panelStyle}
            className="rams-select-panel flex flex-col overflow-hidden rounded-lg border border-black/10 bg-white text-[var(--rams-charcoal)] shadow-[0_12px_32px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.06)]"
          >
            {showSearch && (
              <div className="shrink-0 border-b border-black/8 p-2">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--rams-gray)]" />
                  <input
                    ref={searchRef}
                    type="text"
                    role="combobox"
                    aria-expanded="true"
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    aria-activedescendant={activeDescendant}
                    aria-label={searchPlaceholder}
                    value={query}
                    onChange={(event) => handleQueryChange(event.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={searchPlaceholder}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-md border border-black/10 bg-[var(--background-light)] py-1.5 pl-8 pr-2.5 text-sm text-[var(--rams-charcoal)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--rams-gray)] focus:border-[var(--rams-red)] focus:bg-white focus:ring-2 focus:ring-red-100"
                  />
                </div>
              </div>
            )}

            <ul
              id={listboxId}
              role="listbox"
              aria-labelledby={
                ariaLabelledby ??
                (ariaLabel ? undefined : `${resolvedId}-label`)
              }
              aria-label={ariaLabel}
              className="min-h-0 flex-1 list-none overflow-y-auto p-1"
            >
              {filteredOptions.length === 0 ? (
                <li
                  role="presentation"
                  className="px-3 py-6 text-center text-sm text-[var(--rams-gray)]"
                >
                  {emptyMessage}
                </li>
              ) : (
                filteredOptions.map((option, index) => {
                  const selected = option.value === value;
                  const highlighted = index === activeHighlightedIndex;
                  return (
                    <li
                      key={option.value}
                      id={`${resolvedId}-option-${index}`}
                      role="option"
                      aria-selected={selected}
                      aria-disabled={option.disabled || undefined}
                      onMouseMove={() => {
                        if (!option.disabled) setHighlightedIndex(index);
                      }}
                      aria-label={option.label}
                      onClick={() => chooseOption(option)}
                      className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
                        option.disabled
                          ? "cursor-not-allowed text-[var(--rams-gray)] opacity-50"
                          : selected
                            ? "bg-red-50 font-medium text-[var(--rams-red)]"
                            : highlighted
                              ? "bg-[var(--background-light)] text-[var(--rams-charcoal)]"
                              : "text-[var(--rams-charcoal)]"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate" title={option.label}>
                          {option.label}
                        </span>
                        {option.description && (
                          <span className="mt-0.5 block text-xs leading-5 text-[var(--rams-gray)]">
                            {option.description}
                          </span>
                        )}
                      </span>
                      {selected && (
                        <CheckIcon className="h-4 w-4 shrink-0 text-[var(--rams-red)]" />
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
