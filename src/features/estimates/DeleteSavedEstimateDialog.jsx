import { useEffect, useRef } from "react";
import { Archive, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

const REMOVAL_REASON_LABELS = {
  customer_sent: "고객에게 발송된 견적입니다.",
  customer_viewed: "고객이 견적을 확인한 기록이 있습니다.",
  customer_request: "고객 문의 또는 수정 요청이 연결되어 있습니다.",
  customer_approved: "고객이 확정한 견적입니다.",
  customer_message: "고객 메시지 기록이 연결되어 있습니다.",
  change_order: "변경공사 기록이 연결되어 있습니다.",
  customer_operations_history: "계약 또는 고객운영 기록이 연결되어 있습니다.",
};

export default function DeleteSavedEstimateDialog({
  estimate,
  title,
  estimateNumber,
  createdAt,
  mode = "",
  modeLoading = false,
  reasons = [],
  password = "",
  deleting = false,
  error = "",
  onPasswordChange,
  onClose,
  onConfirm,
}) {
  const dialogRef = useRef(null);
  const isHardDelete = mode === "hard_delete";
  const isArchive = mode === "archive";
  const hasModeError = !modeLoading && !mode;
  const reasonLabels = [...new Set(reasons)]
    .map((reason) => REMOVAL_REASON_LABELS[reason])
    .filter(Boolean);

  useEffect(() => {
    if (modeLoading) return;
    const focusTarget = isHardDelete
      ? dialogRef.current?.querySelector('input[type="password"]')
      : dialogRef.current?.querySelector("button");
    focusTarget?.focus();
  }, [error, isHardDelete, modeLoading]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !deleting) {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleting, onClose]);

  if (!estimate) return null;

  return (
    <div
      className="modal-backdrop saved-estimate-delete-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className={`saved-estimate-delete-dialog ${isArchive ? "is-archive" : ""}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-estimate-delete-title"
        aria-describedby="saved-estimate-delete-description"
      >
        <div className="saved-estimate-delete-dialog__header">
          <span className="saved-estimate-delete-dialog__icon" aria-hidden="true">
            {isArchive
              ? <Archive size={18} strokeWidth={1.5} />
              : <Trash2 size={18} strokeWidth={1.5} />}
          </span>
          <div>
            <h2 id="saved-estimate-delete-title">
              {modeLoading && "견적 상태를 확인하고 있습니다"}
              {isHardDelete && "이 견적을 영구 삭제하시겠습니까?"}
              {isArchive && "이 견적은 보관함으로 이동됩니다"}
              {hasModeError && "견적 상태를 확인하지 못했습니다"}
            </h2>
            <p id="saved-estimate-delete-description">
              {modeLoading && "고객 관련 기록과 공유 상태를 안전하게 확인합니다."}
              {isHardDelete && "삭제하면 복구할 수 없습니다."}
              {isArchive && "고객에게 발송되었거나 관련 업무 기록이 있어 영구 삭제할 수 없습니다."}
              {hasModeError && "창을 닫고 잠시 후 다시 시도해주세요."}
            </p>
          </div>
        </div>

        <dl className="saved-estimate-delete-dialog__summary">
          <div>
            <dt>견적</dt>
            <dd>{title}</dd>
          </div>
          {estimateNumber ? (
            <div>
              <dt>견적번호</dt>
              <dd>{estimateNumber}</dd>
            </div>
          ) : null}
          {createdAt ? (
            <div>
              <dt>작성일</dt>
              <dd>{createdAt}</dd>
            </div>
          ) : null}
        </dl>

        {isHardDelete ? (
          <div className="saved-estimate-delete-dialog__password">
            <p className="saved-estimate-delete-dialog__preservation-note">
              계속하려면 현재 계정 비밀번호를 입력하세요.
            </p>
            <Input
              label="계정 비밀번호"
              type="password"
              value={password}
              autoComplete="current-password"
              disabled={deleting}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
          </div>
        ) : null}

        {isArchive ? (
          <div className="saved-estimate-delete-dialog__archive-copy">
            <p>
              저장 견적 목록에서는 숨겨지고, 보관함에서 확인하거나 복원할 수 있습니다.
            </p>
            {reasonLabels.length > 0 ? (
              <ul>
                {reasonLabels.map((label) => <li key={label}>{label}</li>)}
              </ul>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="saved-estimate-delete-dialog__error" role="alert">{error}</p>
        ) : null}

        <div className="saved-estimate-delete-dialog__actions">
          <Button
            variant="secondary"
            disabled={deleting}
            onClick={onClose}
          >
            취소
          </Button>
          {mode ? (
            <Button
              variant={isHardDelete ? "danger" : "primary"}
              leftIcon={isArchive ? <Archive /> : <Trash2 />}
              disabled={deleting || modeLoading || (isHardDelete && !password)}
              onClick={onConfirm}
            >
              {deleting && isHardDelete && "삭제 중..."}
              {deleting && isArchive && "보관 중..."}
              {!deleting && isHardDelete && "영구 삭제"}
              {!deleting && isArchive && "보관함으로 이동"}
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
