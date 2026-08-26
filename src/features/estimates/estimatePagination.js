export const ESTIMATE_PDF_PAGE = Object.freeze({
  width: 210,
  height: 297,
  margin: 10,
});

export function calculateEstimatePageSlices(sourceWidth, sourceHeight) {
  const contentWidth = ESTIMATE_PDF_PAGE.width - ESTIMATE_PDF_PAGE.margin * 2;
  const contentHeight = ESTIMATE_PDF_PAGE.height - ESTIMATE_PDF_PAGE.margin * 2;
  const sourcePageHeight = Math.max(sourceWidth, 1) * contentHeight / contentWidth;
  const pageCount = Math.max(1, Math.ceil(Math.max(sourceHeight, 1) / sourcePageHeight));

  return Array.from({ length: pageCount }, (_, index) => ({
    index,
    sourceOffset: sourcePageHeight * index,
    sourceHeight: Math.min(
      sourcePageHeight,
      Math.max(sourceHeight - sourcePageHeight * index, 0)
    ),
  }));
}

export function getEstimatePagePair(pageCount, pairIndex) {
  const pairCount = Math.max(1, Math.ceil(Math.max(pageCount, 1) / 2));
  const safePairIndex = Math.min(Math.max(pairIndex, 0), pairCount - 1);
  const startIndex = safePairIndex * 2;

  return {
    pairCount,
    pairIndex: safePairIndex,
    pageIndexes: Array.from(
      { length: Math.min(2, Math.max(pageCount - startIndex, 1)) },
      (_, index) => startIndex + index
    ),
  };
}
