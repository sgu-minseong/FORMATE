import { useState } from "react";
import { Copy, ExternalLink, X } from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { addDaysToDateInput, getTodayDateInput } from "../../shared/utils/dates";
import { createEstimatePortalLink } from "./api";
import { getEstimateShareDefaults } from "./utils";
import "./estimateShare.css";

function createInitialForm(estimate) {
  return {
    ...getEstimateShareDefaults(estimate),
    expiresOn: addDaysToDateInput(getTodayDateInput(), 30),
    requiredContactConsent: false,
    aftercareConsent: false,
    marketingConsent: false,
  };
}

function getExpiryIso(value) {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getShareErrorMessage(error) {
  const message = `${error?.message ?? ""}`;
  if (message.includes("create_customer_portal_link")) {
    return "Supabase에 customer_portal.sql을 적용한 후 다시 시도해주세요.";
  }
  return message || "공유 링크를 생성하지 못했습니다.";
}

export default function ShareEstimateModal({
  companyId,
  estimate,
  onClose,
}) {
  const [form, setForm] = useState(() => createInitialForm(estimate));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdLink, setCreatedLink] = useState(null);
  const [copyStatus, setCopyStatus] = useState("");

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setCopyStatus("");

    if (!form.customerName.trim()) {
      setError("고객명을 입력해주세요.");
      return;
    }
    if (!form.requiredContactConsent) {
      setError("견적 확인을 위한 필수 연락 동의를 확인해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createEstimatePortalLink({
        companyId,
        estimateId: estimate?.id,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim(),
        projectName: form.projectName.trim(),
        projectAddress: form.projectAddress.trim(),
        versionLabel: form.versionLabel.trim(),
        expiresAt: getExpiryIso(form.expiresOn),
        requiredContactConsent: form.requiredContactConsent,
        aftercareConsent: form.aftercareConsent,
        marketingConsent: form.marketingConsent,
      });
      const portalPath = result.portalPath || `/c/${result.token}`;
      setCreatedLink({
        ...result,
        url: `${window.location.origin}${portalPath}`,
      });
    } catch (submitError) {
      setError(getShareErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!createdLink?.url) return;
    setCopyStatus("");
    try {
      await navigator.clipboard.writeText(createdLink.url);
      setCopyStatus("링크를 복사했습니다.");
    } catch {
      setCopyStatus("자동 복사에 실패했습니다. 링크를 직접 선택해 복사해주세요.");
    }
  };

  return (
    <div className="modal-backdrop estimate-share-backdrop" onClick={onClose}>
      <section
        className="estimate-share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="estimate-share-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="estimate-share-modal__header">
          <div>
            <h2 id="estimate-share-title">고객에게 견적 보내기</h2>
            <p>로그인 없이 견적을 확인하고 문의, 수정 요청, 확정을 할 수 있는 링크를 생성합니다.</p>
          </div>
          <Button
            variant="tertiary"
            size="sm"
            leftIcon={<X />}
            aria-label="공유 창 닫기"
            onClick={onClose}
          >
            닫기
          </Button>
        </header>

        {createdLink ? (
          <div className="estimate-share-result">
            <div className="estimate-share-result__status">
              <span aria-hidden="true" />
              <strong>공유 링크가 생성되었습니다</strong>
            </div>
            <Input
              label="고객용 링크"
              value={createdLink.url}
              readOnly
              onFocus={(event) => event.target.select()}
            />
            <div className="estimate-share-result__actions">
              <Button variant="primary" leftIcon={<Copy />} onClick={handleCopy}>
                링크 복사
              </Button>
              <Button
                variant="secondary"
                leftIcon={<ExternalLink />}
                onClick={() => window.open(createdLink.url, "_blank", "noopener,noreferrer")}
              >
                고객 화면 열기
              </Button>
            </div>
            {copyStatus ? <p className="estimate-share-modal__notice">{copyStatus}</p> : null}
            <p className="estimate-share-modal__hint">
              문자나 메신저 발송은 자동으로 처리되지 않습니다. 복사한 링크를 직접 전달해주세요.
            </p>
          </div>
        ) : (
          <form className="estimate-share-form" onSubmit={handleSubmit}>
            <div className="estimate-share-form__grid">
              <Input
                label="고객명"
                value={form.customerName}
                maxLength={120}
                required
                onChange={(event) => updateField("customerName", event.target.value)}
              />
              <Input
                label="연락처"
                value={form.customerPhone}
                maxLength={40}
                placeholder="선택 입력"
                onChange={(event) => updateField("customerPhone", event.target.value)}
              />
              <Input
                label="이메일"
                type="email"
                value={form.customerEmail}
                maxLength={200}
                placeholder="선택 입력"
                onChange={(event) => updateField("customerEmail", event.target.value)}
              />
              <Input
                label="현장명"
                value={form.projectName}
                maxLength={160}
                placeholder="예: 아파트 전체 리모델링"
                onChange={(event) => updateField("projectName", event.target.value)}
              />
              <Input
                label="현장 주소"
                className="estimate-share-form__wide"
                value={form.projectAddress}
                maxLength={500}
                onChange={(event) => updateField("projectAddress", event.target.value)}
              />
              <Input
                label="견적 버전 라벨"
                value={form.versionLabel}
                maxLength={120}
                placeholder="선택 입력"
                onChange={(event) => updateField("versionLabel", event.target.value)}
              />
              <Input
                label="링크 만료일"
                type="date"
                value={form.expiresOn}
                min={getTodayDateInput()}
                hint="비워두면 만료일을 설정하지 않습니다."
                onChange={(event) => updateField("expiresOn", event.target.value)}
              />
            </div>

            <fieldset className="estimate-share-consents">
              <legend>연락 및 개인정보 동의 확인</legend>
              <label>
                <input
                  type="checkbox"
                  checked={form.requiredContactConsent}
                  onChange={(event) => updateField("requiredContactConsent", event.target.checked)}
                />
                <span>
                  <strong>견적 확인 및 필수 연락 동의</strong>
                  <em>고객에게 견적 링크를 전달하기 위한 필수 확인입니다.</em>
                </span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.aftercareConsent}
                  onChange={(event) => updateField("aftercareConsent", event.target.checked)}
                />
                <span>
                  <strong>사후관리 안내 동의</strong>
                  <em>공사 완료 후 사후관리 안내에 활용합니다.</em>
                </span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.marketingConsent}
                  onChange={(event) => updateField("marketingConsent", event.target.checked)}
                />
                <span>
                  <strong>마케팅 안내 동의</strong>
                  <em>기본값은 동의하지 않음입니다.</em>
                </span>
              </label>
            </fieldset>

            {error ? <p className="estimate-share-modal__error" role="alert">{error}</p> : null}

            <footer className="estimate-share-form__actions">
              <Button variant="secondary" type="button" onClick={onClose}>
                닫기
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? "생성 중" : "링크 생성"}
              </Button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
