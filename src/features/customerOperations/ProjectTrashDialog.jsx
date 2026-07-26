import { useEffect, useRef } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";

const IMPACT_ITEMS = [
  { key: "estimateCount", label: "연결된 견적" },
  { key: "totalRequestCount", label: "받은 요청" },
  { key: "pendingRequestCount", label: "처리되지 않은 요청" },
  { key: "messageCount", label: "메시지" },
  { key: "activityCount", label: "활동 기록" },
  { key: "activeShareLinkCount", label: "활성 공유 링크" },
];

export default function ProjectTrashDialog({
  mode,
  projectName,
  impact,
  processing = false,
  error = "",
  onClose,
  onConfirm,
}) {
  const dialogRef = useRef(null);
  const isRestore = mode === "restore";

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

  return (
    <div
      className="customer-project-status-dialog__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !processing) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="customer-project-status-dialog customer-project-trash-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-project-trash-dialog-title"
        aria-describedby="customer-project-trash-dialog-description"
      >
        <div>
          <span>{projectName || "현장"}</span>
          <h2 id="customer-project-trash-dialog-title">
            {isRestore
              ? "이 현장을 복원하시겠습니까?"
              : "이 현장을 휴지통으로 이동하시겠습니까?"}
          </h2>
          <p id="customer-project-trash-dialog-description">
            {isRestore ? (
              <>
                현장과 연결된 요청, 메시지 및 활동이 다시 운영 화면에 표시됩니다.
                <br />
                이전에 개별 삭제한 견적과 비활성화된 공유 링크는 자동 복원되지 않습니다.
              </>
            ) : (
              <>
                이 현장과 연결된 정보는 운영 화면에서 숨겨집니다.
                <br />
                데이터는 삭제되지 않으며 휴지통에서 복원할 수 있습니다.
                <br />
                공유된 견적 링크는 비활성화됩니다.
              </>
            )}
          </p>
        </div>

        {!isRestore ? (
          <dl className="customer-project-trash-dialog__impact">
            {IMPACT_ITEMS.map((item) => (
              <div key={item.key}>
                <dt>{item.label}</dt>
                <dd>{Number(impact?.[item.key] ?? 0).toLocaleString("ko-KR")}건</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {error ? <p className="customer-project-status-dialog__error" role="alert">{error}</p> : null}

        <footer>
          <Button variant="secondary" size="sm" disabled={processing} onClick={onClose}>
            취소
          </Button>
          <Button
            variant={isRestore ? "primary" : "danger"}
            size="sm"
            leftIcon={isRestore ? <RotateCcw /> : <Trash2 />}
            disabled={processing}
            onClick={onConfirm}
          >
            {processing
              ? "처리 중..."
              : isRestore
                ? "복원"
                : "휴지통으로 이동"}
          </Button>
        </footer>
      </section>
    </div>
  );
}
