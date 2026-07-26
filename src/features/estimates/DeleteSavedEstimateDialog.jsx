import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import PriceText from "../../components/PriceText";

export default function DeleteSavedEstimateDialog({
  estimate,
  title,
  address,
  estimateNumber,
  totalAmount = 0,
  deleting = false,
  error = "",
  onClose,
  onConfirm,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.querySelector("button")?.focus();
  }, [error]);

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
        className="saved-estimate-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-estimate-delete-title"
        aria-describedby="saved-estimate-delete-description"
      >
        <div className="saved-estimate-delete-dialog__header">
          <span className="saved-estimate-delete-dialog__icon" aria-hidden="true">
            <Trash2 size={18} strokeWidth={1.5} />
          </span>
          <div>
            <h2 id="saved-estimate-delete-title">이 견적을 삭제하시겠습니까?</h2>
            <p id="saved-estimate-delete-description">
              삭제한 견적은 저장 견적 목록에서 사라지고 휴지통으로 이동합니다.
            </p>
          </div>
        </div>

        <dl className="saved-estimate-delete-dialog__summary">
          <div>
            <dt>고객/현장</dt>
            <dd>{title}</dd>
          </div>
          <div>
            <dt>주소</dt>
            <dd>{address || "주소 미입력"}</dd>
          </div>
          <div>
            <dt>견적번호</dt>
            <dd>{estimateNumber || "-"}</dd>
          </div>
          <div>
            <dt>총액</dt>
            <dd><PriceText value={totalAmount} size="sm" /></dd>
          </div>
        </dl>

        <div className="saved-estimate-delete-dialog__preservation-note">
          <strong>공유 링크가 있는 경우</strong>
          <p>고객에게 공유된 견적 링크는 더 이상 열 수 없습니다.</p>
          <p>고객의 요청과 활동 기록은 유지됩니다.</p>
        </div>

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
          <Button
            variant="danger"
            leftIcon={<Trash2 />}
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? "삭제 중..." : "삭제"}
          </Button>
        </div>
      </section>
    </div>
  );
}
