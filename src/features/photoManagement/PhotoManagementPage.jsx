import {
  ArrowLeft,
  ArrowRight,
  FolderOpen,
  Ruler,
} from "lucide-react";
import { useState } from "react";
import PyeongPhotoManagement from "./PyeongPhotoManagement";

export const PHOTO_MANAGEMENT_MODES = [
  {
    id: "pyeong",
    title: "평형별 사진 관리",
    description: "평형과 세부항목을 기준으로 시공 사진을 관리합니다.",
    icon: Ruler,
  },
  {
    id: "library",
    title: "평수 무관 사진 관리",
    description: "평형과 관계없는 참고 사진을 폴더로 관리합니다.",
    icon: FolderOpen,
  },
];

export function PhotoManagementLanding({ onSelectMode }) {
  return (
    <main className="photo-management-page photo-management-landing">
      <header className="photo-management-landing__header">
        <h1>사진 관리</h1>
        <p>관리할 사진의 기준을 선택하세요.</p>
      </header>
      <div className="photo-management-mode-grid">
        {PHOTO_MANAGEMENT_MODES.map((mode) => {
          const Icon = mode.icon;
          return (
            <button type="button" className="photo-management-mode-card" key={mode.id} onClick={() => onSelectMode(mode.id)}>
              <span className="photo-management-mode-card__icon"><Icon size={20} strokeWidth={1.5} /></span>
              <span className="photo-management-mode-card__copy">
                <strong>{mode.title}</strong>
                <em>{mode.description}</em>
              </span>
              <span className="photo-management-mode-card__action">관리하기 <ArrowRight size={16} strokeWidth={1.5} /></span>
            </button>
          );
        })}
      </div>
    </main>
  );
}

function PhotoLibraryPlaceholder({ onBack }) {
  return (
    <main className="photo-management-page photo-library-placeholder">
      <header className="photo-management-toolbar">
        <div className="photo-mode-titleline">
          <button type="button" onClick={onBack} aria-label="사진 관리 모드 선택으로 돌아가기"><ArrowLeft size={18} /></button>
          <h1>평수 무관 사진 관리</h1>
        </div>
      </header>
      <div className="photo-library-placeholder__body">
        <p>평수 무관 사진 관리는 다음 단계에서 연결됩니다.</p>
      </div>
    </main>
  );
}

export default function PhotoManagementPage({ controller }) {
  const [mode, setMode] = useState("");
  if (!mode) return <PhotoManagementLanding onSelectMode={setMode} />;
  if (mode === "pyeong") return <PyeongPhotoManagement controller={controller} onBack={() => setMode("")} />;
  return <PhotoLibraryPlaceholder onBack={() => setMode("")} />;
}
