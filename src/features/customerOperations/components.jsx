import {
  AlertCircle,
  Check,
  Inbox,
  Pause,
  Play,
  RotateCcw,
  XCircle,
} from "lucide-react";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import { getCustomerRequestLogicalStatus } from "./utils";

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

export function OperationsListHeader({
  label,
  count = 0,
  hint = "",
}) {
  return (
    <div className="customer-operations__list-header">
      <div className="customer-operations__list-header-title">
        <strong>{label}</strong>
        <span>{count}건</span>
      </div>
      {hint ? <span className="customer-operations__list-header-hint">{hint}</span> : null}
    </div>
  );
}

export function DetailField({ label, children }) {
  const value = children === null || children === undefined || children === "" ? "-" : children;

  return (
    <span className="customer-operations__detail-field">
      <strong>{label}</strong>
      <span>{value}</span>
    </span>
  );
}

export function RequestProcessingControls({
  request,
  memo,
  onMemoChange,
  onStatusChange,
  processing = false,
  error = "",
  notice = "",
}) {
  const status = request?.status;
  const logicalStatus = getCustomerRequestLogicalStatus(status);

  const renderActions = () => {
    if (logicalStatus === "received") {
      return (
        <>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<XCircle />}
            disabled={processing}
            onClick={() => onStatusChange("rejected")}
          >
            반려·종료
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Play />}
            disabled={processing}
            onClick={() => onStatusChange("reviewing")}
          >
            {processing ? "처리 중..." : "처리 시작"}
          </Button>
        </>
      );
    }

    if (logicalStatus === "in_progress") {
      return (
        <>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Pause />}
            disabled={processing}
            onClick={() => onStatusChange("received")}
          >
            처리 보류
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Check />}
            disabled={processing}
            onClick={() => onStatusChange("closed")}
          >
            {processing ? "처리 중..." : "처리 완료"}
          </Button>
        </>
      );
    }

    if (logicalStatus === "completed" || logicalStatus === "rejected") {
      return (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RotateCcw />}
          disabled={processing}
          onClick={() => onStatusChange(logicalStatus === "completed" ? "reviewing" : "received")}
        >
          {processing
            ? "처리 중..."
            : logicalStatus === "completed"
              ? "처리 다시 열기"
              : "다시 열기"}
        </Button>
      );
    }

    return null;
  };

  return (
    <div className="customer-operations__processing">
      <Input
        as="textarea"
        label="관리자 처리 메모"
        value={memo}
        maxLength={2000}
        placeholder="처리 내용이나 확인 사항을 기록합니다."
        onChange={(event) => onMemoChange(event.target.value)}
      />
      <div className="customer-operations__processing-actions">
        {renderActions()}
      </div>
      {notice ? <p className="customer-operations__inline-notice" role="status">{notice}</p> : null}
      {error ? <p className="customer-operations__inline-error" role="alert">{error}</p> : null}
    </div>
  );
}
