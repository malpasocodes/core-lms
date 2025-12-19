"use client";

import { useState } from "react";

type PasswordInputProps = {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  minLength?: number;
  className?: string;
};

export function PasswordInput({
  id,
  name,
  label,
  required,
  minLength,
  className = "",
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-xs font-semibold text-foreground" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          className="w-full rounded-md border border-border bg-background px-3 py-2 pr-16 text-sm text-foreground"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-2 rounded-md px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
