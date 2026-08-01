import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, X } from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import { addDaysToDateInput, getTodayDateInput } from "../../shared/utils/dates";
import {
  createEstimatePortalLink,
  fetchActiveEstimatePortalLink,
  fetchEstimateShareOptions,
} from "./api";
import {
  getEstimateShareAction,
  getEstimateShareDefaults,
  operationStatusViews,
} from "./utils";
import "./estimateShare.css";

function createClientDraftKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

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
    return "견적 발송 기능을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.";
  }
  return message || "공유 링크를 생성하지 못했습니다.";
}

function buildPortalLink(result) {
  const portalPath = result.portalPath || `/c/${result.token}`;
  return { ...result, url: `${window.location.origin}${portalPath}` };
}

export default function ShareEstimateModal({
  companyId,
  estimate,
  onClose,
  onShared,
}) {
  const [form, setForm] = useState(() => createInitialForm(estimate));
  const [clientDraftKey] = useState(createClientDraftKey);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdLink, setCreatedLink] = useState(null);
  const [copyStatus, setCopyStatus] = useState("");
  const shareAction = getEstimateShareAction(estimate);
  const isFullyLinked = form.isFullyLinked;
  const selectableCustomers = useMemo(() => customers.filter((customer) => (
    customer.phone?.replace(/\D/g, "").length >= 7 || customer.email?.trim()
  )), [customers]);

  const availableProjects = useMemo(() => projects.filter((project) => (
    (!form.customerId || project.customer_id === form.customerId)
    && selectableCustomers.some((customer) => customer.id === project.customer_id)
  )), [form.customerId, projects, selectableCustomers]);

  useEffect(() => {
    if (isFullyLinked) return undefined;
    let active = true;
    setOptionsLoading(true);
    fetchEstimateShareOptions(companyId)
      .then((result) => {
        if (!active) return;
        setCustomers(result.customers);
        setProjects(result.projects);
      })
      .catch((loadError) => {
        if (active) setError(getShareErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setOptionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [companyId, isFullyLinked]);

  useEffect(() => {
    if (shareAction?.mode !== "copy" || !estimate?.current_estimate_version_id) return undefined;
    let active = true;
    setLinkLoading(true);
    fetchActiveEstimatePortalLink({
      companyId,
      estimateId: estimate.id,
      estimateVersionId: estimate.current_estimate_version_id,
    })
      .then((result) => {
        if (active && result) setCreatedLink({ ...buildPortalLink(result), existing: true });
      })
      .catch((loadError) => {
        if (active) setError(getShareErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLinkLoading(false);
      });
    return () => {
      active = false;
    };
  }, [companyId, estimate?.current_estimate_version_id, estimate?.id, shareAction?.mode]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleCustomerSelection = (customerId) => {
    const customer = customers.find((entry) => entry.id === customerId);
    setForm((current) => ({
      ...current,
      customerId,
      projectId: "",
      customerName: customer?.name || current.customerName,
      customerPhone: customer?.phone || "",
      customerEmail: customer?.email || "",
      projectName: current.projectId ? "" : current.projectName,
      projectAddress: current.projectId ? "" : current.projectAddress,
      projectBaseAddress: current.projectId ? "" : current.projectBaseAddress,
      projectDetailAddress: current.projectId ? "" : current.projectDetailAddress,
    }));
  };

  const handleProjectSelection = (projectId) => {
    const project = projects.find((entry) => entry.id === projectId);
    const customer = customers.find((entry) => entry.id === project?.customer_id);
    setForm((current) => ({
      ...current,
      projectId,
      customerId: project?.customer_id || current.customerId,
      customerName: customer?.name || current.customerName,
      customerPhone: customer?.phone || current.customerPhone,
      customerEmail: customer?.email || current.customerEmail,
      projectName: project?.name || "",
      projectAddress: [project?.address, project?.detail_address].filter(Boolean).join(" "),
      projectBaseAddress: project?.address || "",
      projectDetailAddress: project?.detail_address || "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setCopyStatus("");

    if (!form.customerName.trim()) {
      setError("고객명을 입력해주세요.");
      return;
    }
    if (!isFullyLinked) {
      const phoneDigits = form.customerPhone.replace(/\D/g, "");
      if (phoneDigits.length < 7 && !form.customerEmail.trim()) {
        setError("고객 연락처 또는 이메일을 입력해주세요.");
        return;
      }
      if (!form.projectAddress.trim()) {
        setError("현장 주소를 입력하거나 기존 현장을 선택해주세요.");
        return;
      }
    }
    if (!form.requiredContactConsent) {
      setError("견적 확인을 위한 필수 연락 동의를 확인해주세요.");
      return;
    }
    if (!window.confirm("링크를 생성하면 견적이 발송됨으로 처리됩니다.")) return;

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
        projectBaseAddress: form.projectBaseAddress.trim() || form.projectAddress.trim(),
        projectDetailAddress: form.projectDetailAddress.trim(),
        clientDraftKey,
        versionLabel: form.versionLabel.trim(),
        expiresAt: getExpiryIso(form.expiresOn),
        requiredContactConsent: form.requiredContactConsent,
        aftercareConsent: form.aftercareConsent,
        marketingConsent: form.marketingConsent,
      });
      const nextLink = buildPortalLink(result);
      setCreatedLink(nextLink);
      onShared?.({ result, form });
      try {
        await navigator.clipboard.writeText(nextLink.url);
        setCopyStatus("발송용 링크를 복사했습니다.");
      } catch {
        setCopyStatus("링크는 발송됨으로 처리됐지만 자동 복사에 실패했습니다. 아래 버튼으로 다시 복사해주세요.");
      }
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
            <p>고객·현장을 확인한 뒤 고객용 링크를 복사합니다.</p>
          </div>
          <Button variant="tertiary" size="sm" leftIcon={<X />} aria-label="공유 창 닫기" onClick={onClose}>
            닫기
          </Button>
        </header>

        {linkLoading ? <p className="estimate-share-modal__loading" role="status">기존 발송 링크를 확인하는 중입니다.</p> : null}

        {createdLink ? (
          <div className="estimate-share-result">
            <div className="estimate-share-result__status">
              <span aria-hidden="true" />
              <strong>
                {createdLink.existing
                  ? `현재 견적 상태: ${operationStatusViews.estimate(estimate?.status).label}`
                  : "견적이 발송됨으로 처리되었습니다"}
              </strong>
            </div>
            <Input label="고객용 링크" value={createdLink.url} readOnly onFocus={(event) => event.target.select()} />
            <div className="estimate-share-result__actions">
              <Button variant="primary" leftIcon={<Copy />} onClick={handleCopy}>링크 다시 복사</Button>
              <Button
                variant="secondary"
                leftIcon={<ExternalLink />}
                onClick={() => window.open(createdLink.url, "_blank", "noopener,noreferrer")}
              >
                고객 화면 열기
              </Button>
            </div>
            {copyStatus ? <p className="estimate-share-modal__notice">{copyStatus}</p> : null}
            <p className="estimate-share-modal__hint">문자나 메신저 발송은 자동 처리되지 않습니다. 복사한 링크를 직접 전달해주세요.</p>
          </div>
        ) : (
          <form className="estimate-share-form" onSubmit={handleSubmit}>
            {isFullyLinked ? (
              <section className="estimate-share-linked-summary" aria-label="연결된 고객과 현장">
                <div><span>고객</span><strong>{form.customerName || "-"}</strong><small>{form.customerPhone || form.customerEmail || "연락처 없음"}</small></div>
                <div><span>현장</span><strong>{form.projectName || "현장명 없음"}</strong><small>{form.projectAddress || "주소 없음"}</small></div>
              </section>
            ) : (
              <>
                <p className="estimate-share-form__guide">연결 정보가 없는 견적입니다. 기존 고객·현장을 선택하거나 아래 정보를 입력해주세요.</p>
                <div className="estimate-share-form__grid">
                  <Select
                    label="기존 고객 선택"
                    value={form.customerId}
                    disabled={optionsLoading}
                    onChange={(event) => handleCustomerSelection(event.target.value)}
                  >
                    <option value="">직접 입력</option>
                    {selectableCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone || customer.email}</option>)}
                  </Select>
                  <Select
                    label="기존 현장 선택"
                    value={form.projectId}
                    disabled={optionsLoading}
                    onChange={(event) => handleProjectSelection(event.target.value)}
                  >
                    <option value="">직접 입력</option>
                    {availableProjects.map((project) => <option key={project.id} value={project.id}>{project.name || project.address || "현장"} · {project.address || "주소 없음"}</option>)}
                  </Select>
                  <Input label="고객명" value={form.customerName} maxLength={120} required readOnly={Boolean(form.customerId)} onChange={(event) => updateField("customerName", event.target.value)} />
                  <Input label="연락처" value={form.customerPhone} maxLength={40} placeholder="연락처 또는 이메일 중 하나 필수" readOnly={Boolean(form.customerId)} onChange={(event) => updateField("customerPhone", event.target.value)} />
                  <Input label="이메일" type="email" value={form.customerEmail} maxLength={200} placeholder="연락처 또는 이메일 중 하나 필수" readOnly={Boolean(form.customerId)} onChange={(event) => updateField("customerEmail", event.target.value)} />
                  <Input label="현장명" value={form.projectName} maxLength={160} placeholder="예: 아파트 전체 리모델링" readOnly={Boolean(form.projectId)} onChange={(event) => updateField("projectName", event.target.value)} />
                  <Input
                    label="현장 주소"
                    className="estimate-share-form__wide"
                    value={form.projectAddress}
                    maxLength={500}
                    required
                    readOnly={Boolean(form.projectId)}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      projectId: "",
                      projectAddress: event.target.value,
                      projectBaseAddress: event.target.value,
                      projectDetailAddress: "",
                    }))}
                  />
                </div>
              </>
            )}

            <div className="estimate-share-form__grid">
              <Input label="견적 버전 라벨" value={form.versionLabel} maxLength={120} placeholder="선택 입력" onChange={(event) => updateField("versionLabel", event.target.value)} />
              <Input label="링크 만료일" type="date" value={form.expiresOn} min={getTodayDateInput()} onChange={(event) => updateField("expiresOn", event.target.value)} />
            </div>

            <fieldset className="estimate-share-consents">
              <legend>연락 및 개인정보 동의 확인</legend>
              <label><input type="checkbox" checked={form.requiredContactConsent} onChange={(event) => updateField("requiredContactConsent", event.target.checked)} /><span><strong>견적 확인 및 필수 연락 동의</strong><em>고객에게 견적 링크를 전달하기 위한 필수 확인입니다.</em></span></label>
              <label><input type="checkbox" checked={form.aftercareConsent} onChange={(event) => updateField("aftercareConsent", event.target.checked)} /><span><strong>사후관리 안내 동의</strong><em>공사 완료 후 사후관리 안내에 활용합니다.</em></span></label>
              <label><input type="checkbox" checked={form.marketingConsent} onChange={(event) => updateField("marketingConsent", event.target.checked)} /><span><strong>마케팅 안내 동의</strong><em>기본값은 동의하지 않음입니다.</em></span></label>
            </fieldset>

            {error ? <p className="estimate-share-modal__error" role="alert">{error}</p> : null}

            <footer className="estimate-share-form__actions">
              <Button variant="secondary" type="button" onClick={onClose}>닫기</Button>
              <Button variant="primary" type="submit" disabled={submitting || optionsLoading || linkLoading}>
                {submitting ? "발송 처리 중" : "고객용 링크 생성·복사"}
              </Button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
