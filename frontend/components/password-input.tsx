"use client";

import { useId, useState, type ChangeEvent } from "react";
import { inputClass } from "@/components/ui";

type PasswordInputProps = {
  id?: string;
  name?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  ariaDescribedBy?: string;
  label?: string;
};

export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  autoComplete,
  required,
  minLength,
  maxLength,
  disabled,
  placeholder,
  className = inputClass,
  ariaDescribedBy,
  label = "password",
}: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={inputId}
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        disabled={disabled}
        placeholder={placeholder}
        aria-describedby={ariaDescribedBy}
        className={`${className} pr-20`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 my-auto mr-1 inline-flex h-8 items-center rounded bg-white px-3 text-xs font-bold text-[var(--rams-red)] transition hover:text-[var(--rams-red-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
