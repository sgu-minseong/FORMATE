import { ClipboardList, FileText, Plus, Search, Sparkles } from "lucide-react";
import AppShell from "./components/layout/AppShell.jsx";
import {
  Badge,
  Button,
  Card,
  CategorySidebar,
  EmptyState,
  Input,
  PageHeader,
  Select,
  StickyTotalBar,
  Table,
  ToggleButton,
} from "./components/ui/index.js";

const previewColumns = [
  { key: "name", label: "공종", align: "left", width: "28%" },
  { key: "unit", label: "단위", align: "left", width: "12%" },
  { key: "quantity", label: "수량", align: "right", width: "15%", editable: true },
  { key: "unitPrice", label: "단가", align: "right", width: "20%" },
  { key: "total", label: "합계", align: "right", width: "25%" },
];

const previewRows = [
  { id: "wallpaper", name: "도배", unit: "평", quantity: 24, unitPrice: "18,000", total: "432,000" },
  { id: "floor", name: "장판", unit: "평", quantity: 24, unitPrice: "0", total: "0" },
  { id: "electric", name: "조명", unit: "식", quantity: 1, unitPrice: "320,000", total: "320,000" },
];

const categories = [
  { id: "wallpaper", label: "도배", count: 12, active: true },
  { id: "floor", label: "장판", count: 8 },
  { id: "electric", label: "전기", count: 5 },
];

export default function DesignPreview() {
  return (
    <div className="design-preview">
      <div className="design-preview__content">
        <PageHeader
          eyebrow="FORMATE v8.1"
          title="디자인 시스템 미리보기"
          description="Jobber 견적 빌더와 Airtable 데이터 그리드 방향의 토큰과 공용 컴포넌트 확인 화면입니다."
          actions={
            <Button variant="primary" leftIcon={<Plus />}>
              새 견적
            </Button>
          }
        />

        <AppShell
          currentPage="condition"
          collapsed
          navItems={[
            { key: "landing", label: "홈", icon: <FileText /> },
            { key: "condition", label: "견적 작성", icon: <ClipboardList /> },
          ]}
        >
          <Card>
            <PageHeader
              title="작업 화면 AppShell"
              description="collapsed=true 상태는 64px 전역 메뉴와 20px 아이콘만 표시합니다."
            />
          </Card>
        </AppShell>

        <div className="design-preview__grid">
          <Card>
            <h2 className="ui-field__label">버튼</h2>
            <div className="design-preview__row">
              <Button variant="primary" leftIcon={<Plus />}>
                Primary
              </Button>
              <Button variant="secondary" leftIcon={<Search />}>
                Secondary
              </Button>
              <Button variant="tertiary">Tertiary</Button>
              <Button variant="danger">삭제</Button>
            </div>
          </Card>

          <Card>
            <h2 className="ui-field__label">입력 요소</h2>
            <Input label="고객명" placeholder="홍길동" />
            <Select
              label="공사 유형"
              options={[
                { value: "new", label: "신축" },
                { value: "old", label: "구축" },
              ]}
            />
          </Card>
        </div>

        <div className="design-preview__grid">
          <CategorySidebar title="공종" items={categories} />
          <Card>
            <div className="design-preview__row">
              <Badge variant="success">저장됨</Badge>
              <Badge variant="warning">미입력</Badge>
              <Badge variant="info">고객용</Badge>
              <Badge variant="ai">AI 추천</Badge>
              <Badge variant="category" category="wallpaper">도배</Badge>
              <ToggleButton pressed>24평</ToggleButton>
              <Button variant="secondary" leftIcon={<Sparkles />}>
                분석
              </Button>
            </div>
          </Card>
        </div>

        <Table columns={previewColumns} rows={previewRows} emptyAsZeroMuted stickyHeader draggable />

        <EmptyState
          icon={<ClipboardList size={24} strokeWidth={1.5} />}
          title="표시할 견적 항목이 없습니다"
          description="조건을 선택하면 업체 단가표 기준으로 견적 항목이 표시됩니다."
          action={<Button variant="secondary">조건 선택</Button>}
        />

        <StickyTotalBar
          label="선택 항목 합계"
          amounts={[
            { label: "공급가", value: "752,000원" },
            { label: "최종", value: "827,200원" },
          ]}
          actions={<Button variant="primary">견적서 확인</Button>}
        />
      </div>
    </div>
  );
}
