"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import chevronsUpDown from "./assets/chevrons-up-down.svg";
import { CheckIcon } from "./icons";

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  /** Matched against a filter id. Options without a group show under every filter. */
  group?: string;
};

/** `group` omitted means the filter shows every option. */
export type SelectFilter = { id: string; label: string; group?: string };

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  wide = false,
  filters,
  filtersLabel,
  renderOptionAction,
}: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  /** Open menu spans the neighboring control as well. */
  wide?: boolean;
  /** Optional choices. The first one is selected when the menu opens. Left/right arrows switch. */
  filters?: SelectFilter[];
  filtersLabel?: string;
  /** Extra control rendered at the start of an option, such as a preview button. */
  renderOptionAction?: (option: SelectOption<T>) => ReactNode;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [filterIndex, setFilterIndex] = useState(0);

  const groupFor = (index: number) => filters?.[index]?.group;
  const visible = filteredOptions(options, groupFor(filterIndex));
  const selectedIndex = visible.findIndex((option) => option.value === value);
  const selected = options.find((option) => option.value === value) ?? visible[0];

  const applyFilter = (index: number) => {
    const nextVisible = filteredOptions(options, groupFor(index));
    const selectedAt = nextVisible.findIndex((option) => option.value === value);
    setFilterIndex(index);
    setActive(selectedAt >= 0 ? selectedAt : 0);
  };

  const openMenu = () => {
    const nextVisible = filteredOptions(options, groupFor(0));
    setFilterIndex(0);
    setActive(Math.max(0, nextVisible.findIndex((option) => option.value === value)));
    setOpen(true);
  };

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const choose = (index: number) => {
    const option = visible[index];
    if (!option) return;
    onChange(option.value);
    close();
  };

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, id, open]);

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu();
    }
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = visible.length - 1;
    if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && filters && filters.length > 1) {
      event.preventDefault();
      const step = event.key === "ArrowRight" ? 1 : -1;
      applyFilter((filterIndex + step + filters.length) % filters.length);
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((index) => Math.min(last, index + 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActive((index) => Math.max(0, index - 1));
        return;
      case "Home":
        event.preventDefault();
        setActive(0);
        return;
      case "End":
        event.preventDefault();
        setActive(last);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        return;
      case "Escape":
        event.preventDefault();
        close();
        return;
      case "Tab":
        close(false);
        return;
    }
    if (event.key.length === 1) {
      const key = event.key.toLowerCase();
      const match = visible.findIndex((option) => option.label.toLowerCase().startsWith(key));
      if (match >= 0) setActive(match);
    }
  };

  const renderOption = (option: SelectOption<T>, index: number) => (
    <div
      key={`${index}-${option.value}`}
      id={`${id}-option-${index}`}
      role="option"
      aria-selected={index === selectedIndex}
      className="ls-select-option"
      data-active={index === active ? "" : undefined}
      onMouseMove={() => setActive(index)}
      onMouseDown={(event) => {
        if (event.target instanceof Element && event.target.closest("[data-option-action]")) return;
        event.preventDefault();
      }}
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("[data-option-action]")) return;
        choose(index);
      }}
    >
      {renderOptionAction?.(option)}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{option.label}</span>
        {option.description && (
          <span className="truncate text-xs font-normal leading-4 opacity-50">{option.description}</span>
        )}
      </span>
      {index === selectedIndex && <CheckIcon className="shrink-0" />}
    </div>
  );

  return (
    <div ref={rootRef} className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span id={`${id}-label`} className="text-sm font-medium leading-5 opacity-50">
        {label}
      </span>
      <div className="relative">
        <button
          ref={triggerRef}
          id={`${id}-trigger`}
          type="button"
          className="ls-select-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-labelledby={`${id}-label ${id}-trigger`}
          data-open={open ? "" : undefined}
          onClick={() => (open ? close() : openMenu())}
          onKeyDown={onTriggerKeyDown}
        >
          <span className="truncate">{selected?.label}</span>
          <img className="shrink-0" src={chevronsUpDown} alt="" width={16} height={16} />
        </button>
        {open && (
          <div
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={`${id}-label`}
            aria-activedescendant={`${id}-option-${active}`}
            className={["ls-select-menu", wide ? "ls-select-menu-wide" : "", filters ? "ls-select-menu-filters" : ""]
              .filter(Boolean)
              .join(" ")}
            data-side="top"
            onKeyDown={onListKeyDown}
          >
            <div className={filters ? "ls-select-scroll" : undefined}>
              {visible.map((option, index) => renderOption(option, index))}
            </div>
            {filters && filters.length > 0 && (
              <div
                className="ls-select-filters"
                role="group"
                aria-label={filtersLabel}
                onMouseDown={(event) => event.preventDefault()}
              >
                {filters.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={index === filterIndex}
                    tabIndex={-1}
                    onClick={() => applyFilter(index)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function filteredOptions<T extends string>(options: SelectOption<T>[], group: string | undefined) {
  if (!options.some((option) => option.group)) return options;
  const pinned = options.filter((option) => !option.group);
  const named = options
    .filter((option) => option.group && (!group || option.group === group))
    .sort((a, b) => a.label.localeCompare(b.label));
  return [...pinned, ...named];
}
