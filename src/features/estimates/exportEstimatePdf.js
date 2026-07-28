import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export function sanitizeEstimateFileNamePart(value, fallback) {
  const cleaned = `${value ?? ""}`
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

export function buildEstimatePdfFileName({
  companyName,
  customerName,
  address,
  issuedAt,
}) {
  const safeCompany = sanitizeEstimateFileNamePart(companyName, "업체명");
  const safeTarget = sanitizeEstimateFileNamePart(customerName || address, "고객정보");
  return `견적서_${safeCompany}_${safeTarget}_${issuedAt}.pdf`;
}

export async function exportEstimatePdf({
  element,
  companyName,
  customerName,
  address,
  issuedAt,
  backgroundColor,
  capture = html2canvas,
  createPdf = () => new jsPDF("p", "mm", "a4"),
}) {
  if (!element) return false;

  const canvas = await capture(element, {
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

  pdf.save(buildEstimatePdfFileName({
    companyName,
    customerName,
    address,
    issuedAt,
  }));
  return true;
}
