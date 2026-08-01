import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export function sanitizeContractFileNamePart(value, fallback) {
  const cleaned = `${value ?? ""}`
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}
export function buildContractPdfFileName({ contractNumber, customerName, projectName, issuedAt }) {
  const safeNumber = sanitizeContractFileNamePart(contractNumber, "계약번호");
  const safeTarget = sanitizeContractFileNamePart(customerName || projectName, "고객현장");
  const safeDate = sanitizeContractFileNamePart(issuedAt, "작성일");
  return `계약서_${safeNumber}_${safeTarget}_${safeDate}.pdf`;
}

export async function exportContractPdf({
  documentNode,
  contractNumber,
  customerName,
  projectName,
  issuedAt,
  backgroundColor,
  capture = html2canvas,
  createPdf = () => new jsPDF("p", "mm", "a4"),
}) {
  if (documentNode?.dataset?.contractDocument !== "pdf") return false;

  const canvas = await capture(documentNode, {
    scale: 2,
    useCORS: true,
    backgroundColor,
  });
  const imageData = canvas.toDataURL("image/png");
  const pdf = createPdf();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const renderWidth = pageWidth - margin * 2;
  const renderHeight = (canvas.height * renderWidth) / canvas.width;
  let remainingHeight = renderHeight;
  let position = margin;

  pdf.addImage(imageData, "PNG", margin, position, renderWidth, renderHeight);
  remainingHeight -= pageHeight - margin * 2;

  while (remainingHeight > 0) {
    position = remainingHeight - renderHeight + margin;
    pdf.addPage();
    pdf.addImage(imageData, "PNG", margin, position, renderWidth, renderHeight);
    remainingHeight -= pageHeight - margin * 2;
  }

  pdf.save(buildContractPdfFileName({
    contractNumber,
    customerName,
    projectName,
    issuedAt,
  }));
  return true;
}
