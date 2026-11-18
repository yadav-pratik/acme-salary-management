import type { ReactNode } from "react";

export function Field({ id, label, error, children }: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <p className="form-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}
