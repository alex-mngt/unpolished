"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";

export interface Option<T extends string> {
  value: T;
  label: string;
}

interface OptionSelectProps<T extends string> {
  id?: string;
  "aria-describedby"?: string;
  name?: string;
  items: readonly Option<T>[];
  value: T;
  onValueChange: (value: T) => void;
  placeholder?: string;
  className?: string;
}

/**
 * A single-value select over a fixed list that plays well with the pad
 * shortcuts: a focused trigger swallows typed letters, so a pointer pick lets
 * go of it, while keyboard users keep their place.
 */
export const OptionSelect = <T extends string>({
  id,
  "aria-describedby": describedBy,
  name,
  items,
  value,
  onValueChange,
  placeholder = "Select",
  className,
}: OptionSelectProps<T>) => (
  <Select
    name={name}
    items={items}
    value={value}
    onValueChange={(next) => {
      if (next !== null) onValueChange(next);
    }}
  >
    <SelectTrigger id={id} aria-describedby={describedBy} className={className}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent finalFocus={(closeType) => closeType === "keyboard"}>
      {items.map(({ value, label }) => (
        <SelectItem key={value} value={value}>
          {label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
