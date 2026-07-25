import { AlertCircle, Inbox } from "lucide-react";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";

export function StatusText({ status }) {
  return (
    <span className={`customer-operation-status customer-operation-status--${status?.tone || "muted"}`}>
      <span className="customer-operation-status__dot" aria-hidden="true" />
      {status?.label || "미입력"}
    </span>
  );
}

export function OperationsLoadState({
  loading,
  error,
  empty,
  emptyTitle,
  emptyDescription,
  onRetry,
}) {
  if (loading) {
    return (
      <div className="customer-operations__loading" role="status">
        불러오는 중
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<AlertCircle size={20} strokeWidth={1.5} />}
        title="데이터를 불러오지 못했습니다"
        description={error}
        action={<Button variant="secondary" size="sm" onClick={onRetry}>다시 불러오기</Button>}
        className="customer-operations__empty"
      />
    );
  }

  if (empty) {
    return (
      <EmptyState
        icon={<Inbox size={20} strokeWidth={1.5} />}
        title={emptyTitle}
        description={emptyDescription}
        className="customer-operations__empty"
      />
    );
  }

  return null;
}

export function DetailField({ label, children }) {
  return (
    <span className="customer-operations__detail-field">
      <strong>{label}</strong>
      <span>{children || "-"}</span>
    </span>
  );
}
