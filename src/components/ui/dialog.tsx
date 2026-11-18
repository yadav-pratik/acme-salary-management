"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./button";

export function Dialog({ title, busy, onClose, children }: {
  title: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="form-dialog"
      aria-labelledby="form-dialog-title"
      onCancel={event => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="dialog-header">
        <h2 id="form-dialog-title">{title}</h2>
        <Button variant="quiet" type="button" onClick={onClose} disabled={busy} aria-label="Close form">×</Button>
      </div>
      {children}
    </dialog>
  );
}
