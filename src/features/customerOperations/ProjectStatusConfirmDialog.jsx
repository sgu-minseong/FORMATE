import { useEffect, useRef } from "react";
import Button from "../../components/ui/Button";

const COPY = {
  completed: {
    title: "이 현장을 완료 처리하시겠습니까?",
    description: "견적과 요청, 메시지 및 활동 기록은 유지됩니다.",
    confirmLabel: "현장 완료",
  },
  cancelled: {
    title: "이 현장을 취소 처리하시겠습니까?",
    description: "취소된 현장은 취소 필터에서 계속 확인할 수 있습니다.",
    confirmLabel: "현장 취소",
  },
};

export default function ProjectStatusConfirmDialog({
  status,
  projectName,
  processing = false,
  error = "",
  onClose,
  onConfirm,
}) {
  const dialogRef = useRef(null);
  const copy = COPY[status];

  useEffect(() => {
    dialogRef.current?.querySelector("button")?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !processing) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, processing]);

  if (!copy) return null;

  return (
    <div
      className="customer-project-status-dialog__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !processing) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="customer-project-status-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-project-status-dialog-title"
        aria-describedby="customer-project-status-dialog-description"
      >
        <div>
          <span>{projectName || "현장"}</span>
          <h2 id="customer-project-status-dialog-title">{copy.title}</h2>
          <p id="customer-project-status-dialog-description">{copy.description}</p>
        </div>
        {error ? <p className="customer-project-status-dialog__error" role="alert">{error}</p> : null}
        <footer>
          <Button variant="secondary" size="sm" disabled={processing} onClick={onClose}>
            취소
          </Button>
          <Button
            variant={status === "cancelled" ? "danger" : "primary"}
            size="sm"
            disabled={processing}
            onClick={onConfirm}
          >
            {processing ? "처리 중..." : copy.confirmLabel}
          </Button>
        </footer>
      </section>
    </div>
  );
}
