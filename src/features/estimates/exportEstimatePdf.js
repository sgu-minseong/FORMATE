import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { calculateEstimatePageSlices } from "./estimatePagination";

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
  documentNode,
  companyName,
  customerName,
  address,
  issuedAt,
  backgroundColor,
  capture = html2canvas,
  createPdf = () => new jsPDF("p", "mm", "a4"),
}) {
  if (documentNode?.dataset?.estimateDocument !== "pdf") return false;

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
  const pageContentHeight = pageHeight - margin * 2;
  const slices = calculateEstimatePageSlices(canvas.width, canvas.height);

  slices.forEach((slice, index) => {
    if (index > 0) pdf.addPage();
    const position = margin - slice.index * pageContentHeight;
    pdf.addImage(imageData, "PNG", margin, position, renderWidth, renderHeight);
  });

  pdf.save(buildEstimatePdfFileName({
    companyName,
    customerName,
    address,
    issuedAt,
  }));
  return true;
}
