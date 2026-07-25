export const UNIT_OPTIONS = ["평", "m²", "m", "개소", "식", "자당", "롤", "박스", "EA"];
export const PYEONG_OPTIONS = Array.from({ length: 90 }, (_, index) => index + 1);
export const FLOORING_THICKNESS_OPTIONS = Array.from({ length: 28 }, (_, index) => (1.8 + index / 10).toFixed(1));
export const DEFAULT_FLOORING_SPEC = "기본";
export const DEFAULT_FLOORING_AUTO_SPECS = ["1.8", "2.2", "2.7"];
export const FLOORING_NAME_KEYWORDS = ["장판", "바닥", "바닥재"];
export const FLOORING_MATERIAL_KEYWORDS = ["장판", "마루", "데코타일", "바닥"];
