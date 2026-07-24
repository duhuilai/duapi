import React from "react";
import { useStore } from "../store/AppContext";

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className={"modal" + (wide ? " wide" : "")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="x-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmText = "确定",
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel} footer={
      <>
        <button className="btn ghost" onClick={onCancel}>
          取消
        </button>
        <button
          className={"btn " + (danger ? "danger" : "primary")}
          onClick={onConfirm}
        >
          {confirmText}
        </button>
      </>
    }>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-soft)" }}>
        {message}
      </div>
    </Modal>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={"toast " + t.kind}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export function PromptModal({
  title,
  label,
  defaultValue = "",
  onOk,
  onCancel,
}: {
  title: string;
  label: string;
  defaultValue?: string;
  onOk: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = React.useState(defaultValue);
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn ghost" onClick={onCancel}>
            取消
          </button>
          <button
            className="btn primary"
            disabled={!value.trim()}
            onClick={() => onOk(value.trim())}
          >
            确定
          </button>
        </>
      }
    >
      <label style={{ fontSize: 12, color: "var(--text-soft)", fontWeight: 600 }}>
        {label}
      </label>
      <input
        className="input"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ marginTop: 8 }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) onOk(value.trim());
        }}
      />
    </Modal>
  );
}
