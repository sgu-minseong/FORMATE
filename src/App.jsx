import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  ClipboardList,
  FileText,
  Home,
  Image,
  Plus,
  Printer,
  Save,
  Wrench,
} from "lucide-react";

export const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

const spaces = ["거실", "주방", "작은방", "안방", "베란다", "현관", "다용도실"];

const categories = [
  {
    id: "wallpaper",
    name: "도배",
    options: ["실크", "광폭", "디아방"],
  },
  {
    id: "flooring",
    name: "장판",
    options: ["2.2T", "4.5T", "강마루"],
  },
  {
    id: "woodwork",
    name: "목공",
    options: ["걸레받이", "몰딩", "문틀 보수"],
  },
  {
    id: "bathroom",
    name: "욕실",
    options: ["기본형", "고급형", "타일 교체"],
  },
];

const dummySavedData = {
  "32|new|powder:true|dress:false|empty": {
    label: "32평 · 신축 · 파우더룸 O · 드레스룸 X · 빈집",
    items: {
      wallpaper: [
        { material: "실크", price: 1850000, selected: true },
        { material: "광폭", price: 1320000, selected: true },
      ],
      flooring: [
        { material: "2.2T", price: 980000, selected: true },
        { material: "4.5T", price: 1460000, selected: false },
      ],
    },
  },
  "24|old|expanded:true|spaces:거실,주방|occupied": {
    label: "24평 · 구축 · 확장 있음 · 거실/주방 · 살림집",
    items: {
      woodwork: [
        { material: "몰딩", price: 760000, selected: true },
        { material: "걸레받이", price: 520000, selected: true },
      ],
      bathroom: [
        { material: "기본형", price: 2400000, selected: true },
      ],
    },
  },
};

function makeConditionKey(condition) {
  if (!condition.size || !condition.buildType || !condition.occupancy) return "";

  if (condition.buildType === "new") {
    return [
      condition.size,
      "new",
      `powder:${Boolean(condition.powderRoom)}`,
      `dress:${Boolean(condition.dressRoom)}`,
      condition.occupancy,
    ].join("|");
  }

  const expansionPart = condition.expanded
    ? `expanded:true|spaces:${[...condition.expansionSpaces].sort().join(",")}`
    : "expanded:false|spaces:";

  return [condition.size, "old", expansionPart, condition.occupancy].join("|");
}

function makeConditionSummary(condition) {
  if (!condition.size || !condition.buildType || !condition.occupancy) return "";

  const base = [`${condition.size}평`];
  if (condition.buildType === "new") {
    base.push("신축");
    base.push(`파우더룸 ${condition.powderRoom ? "O" : "X"}`);
    base.push(`드레스룸 ${condition.dressRoom ? "O" : "X"}`);
  } else {
    base.push("구축");
    base.push(`확장 ${condition.expanded ? "있음" : "없음"}`);
    if (condition.expanded) {
      base.push(condition.expansionSpaces.length ? condition.expansionSpaces.join("/") : "확장 공간 미선택");
    }
  }
  base.push(condition.occupancy === "empty" ? "빈집" : "살림집");
  return base.join(" · ");
}

function seedItemsFromSaved(saved) {
  const seeded = {};
  categories.forEach((category) => {
    const savedRows = saved?.items?.[category.id] ?? [];
    const byMaterial = Object.fromEntries(savedRows.map((row) => [row.material, row]));
    seeded[category.id] = category.options.map((material) => ({
      material,
      price: byMaterial[material]?.price ?? "",
      selected: Boolean(byMaterial[material]?.selected),
    }));

    savedRows.forEach((row) => {
      if (!category.options.includes(row.material)) {
        seeded[category.id].push({ ...row });
      }
    });
  });
  return seeded;
}

function createEmptyItems() {
  return seedItemsFromSaved(null);
}

export default function App() {
  const [page, setPage] = useState("landing");
  const [step, setStep] = useState(1);
  const [condition, setCondition] = useState({
    size: "",
    buildType: "",
    powderRoom: false,
    dressRoom: false,
    expanded: false,
    expansionSpaces: [],
    occupancy: "",
  });
  const [items, setItems] = useState(createEmptyItems);
  const [activeCategories, setActiveCategories] = useState(["wallpaper"]);
  const [openCategory, setOpenCategory] = useState("wallpaper");
  const [newMaterialName, setNewMaterialName] = useState("");
  const [address, setAddress] = useState("");
  const [workDate, setWorkDate] = useState("");

  const conditionKey = useMemo(() => makeConditionKey(condition), [condition]);
  const conditionSummary = useMemo(() => makeConditionSummary(condition), [condition]);
  const matchedSavedData = conditionKey ? dummySavedData[conditionKey] : null;

  const selectedRows = useMemo(() => {
    return activeCategories.flatMap((categoryId) => {
      const category = categories.find((entry) => entry.id === categoryId);
      return (items[categoryId] ?? [])
        .filter((row) => row.selected)
        .map((row) => ({
          categoryId,
          categoryName: category?.name ?? categoryId,
          material: row.material,
          price: Number(row.price) || 0,
        }));
    });
  }, [activeCategories, items]);

  const total = selectedRows.reduce((sum, row) => sum + row.price, 0);
  const currentCategory = categories.find((category) => category.id === openCategory);

  function updateCondition(patch) {
    setCondition((current) => ({ ...current, ...patch }));
  }

  function toggleExpansionSpace(space) {
    setCondition((current) => {
      const exists = current.expansionSpaces.includes(space);
      return {
        ...current,
        expansionSpaces: exists
          ? current.expansionSpaces.filter((entry) => entry !== space)
          : [...current.expansionSpaces, space],
      };
    });
  }

  function canGoNext() {
    if (step === 1) return Boolean(condition.size);
    if (step === 2) {
      if (condition.buildType === "new") return true;
      if (condition.buildType === "old") return !condition.expanded || condition.expansionSpaces.length > 0;
      return false;
    }
    return Boolean(condition.occupancy);
  }

  function goNext() {
    if (step < 3) setStep(step + 1);
    else setPage("condition-summary");
  }

  function startFreshEstimate() {
    setItems(createEmptyItems());
    setActiveCategories(["wallpaper"]);
    setOpenCategory("wallpaper");
    setPage("items");
  }

  function loadSavedEstimate() {
    setItems(seedItemsFromSaved(matchedSavedData));
    const loadedCategoryIds = categories
      .filter((category) => matchedSavedData?.items?.[category.id]?.length)
      .map((category) => category.id);
    setActiveCategories(loadedCategoryIds.length ? loadedCategoryIds : ["wallpaper"]);
    setOpenCategory(loadedCategoryIds[0] ?? "wallpaper");
    setPage("items");
  }

  function toggleCategory(categoryId) {
    setActiveCategories((current) => {
      const exists = current.includes(categoryId);
      const next = exists ? current.filter((id) => id !== categoryId) : [...current, categoryId];
      return next.length ? next : current;
    });
    setOpenCategory(categoryId);
  }

  function updateItem(categoryId, index, patch) {
    setItems((current) => ({
      ...current,
      [categoryId]: current[categoryId].map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      ),
    }));
  }

  function addMaterial() {
    const name = newMaterialName.trim();
    if (!name || !openCategory) return;
    setItems((current) => ({
      ...current,
      [openCategory]: [...current[openCategory], { material: name, price: "", selected: true }],
    }));
    setNewMaterialName("");
  }

  function resetFlow() {
    setPage("landing");
    setStep(1);
    setCondition({
      size: "",
      buildType: "",
      powderRoom: false,
      dressRoom: false,
      expanded: false,
      expansionSpaces: [],
      occupancy: "",
    });
    setItems(createEmptyItems());
    setActiveCategories(["wallpaper"]);
    setOpenCategory("wallpaper");
    setAddress("");
    setWorkDate("");
  }

  return (
    <div className="app-shell">
      <style>{styles}</style>

      {conditionSummary && page !== "landing" && page !== "ready" && (
        <div className="sticky-summary">
          <span>조건 키</span>
          <strong>{conditionSummary}</strong>
          <code>{conditionKey}</code>
        </div>
      )}

      {page === "landing" && (
        <main className="landing">
          <section className="hero">
            <div>
              <p className="eyebrow">Interior B2B Estimate Prototype</p>
              <h1>조건 키 기준 견적 데이터 재사용 흐름</h1>
              <p>
                평수, 신축/구축 세부 조건, 빈집/살림집 상태가 완전히 같을 때만
                저장된 시공 항목별 소재/가격 데이터를 불러오는 화면 뼈대입니다.
              </p>
            </div>
          </section>

          <section className="menu-grid">
            <button className="menu-card" onClick={() => setPage("ready")}>
              <CalendarDays />
              <span>상담/공사일정</span>
            </button>
            <button className="menu-card" onClick={() => setPage("ready")}>
              <Wrench />
              <span>CS(사후관리)</span>
            </button>
            <button className="menu-card primary" onClick={() => setPage("condition")}>
              <ClipboardList />
              <span>신규 견적서 입력</span>
            </button>
          </section>
        </main>
      )}

      {page === "ready" && (
        <main className="simple-page">
          <button className="ghost" onClick={() => setPage("landing")}>
            <ArrowLeft size={18} /> 돌아가기
          </button>
          <div className="empty-state">
            <Building2 size={42} />
            <h2>준비 중입니다</h2>
            <p>현재 프로토타입에서는 신규 견적서 입력 흐름만 확인할 수 있습니다.</p>
          </div>
        </main>
      )}

      {page === "condition" && (
        <main className="panel-page">
          <Progress step={step} />
          <section className="panel">
            {step === 1 && (
              <>
                <h2>Step 1. 평수 선택</h2>
                <p className="muted">1평부터 90평까지 선택합니다. 평수가 다르면 별도 조건 키입니다.</p>
                <select
                  value={condition.size}
                  onChange={(event) => updateCondition({ size: event.target.value })}
                >
                  <option value="">평수 선택</option>
                  {Array.from({ length: 90 }, (_, index) => index + 1).map((size) => (
                    <option key={size} value={size}>
                      {size}평
                    </option>
                  ))}
                </select>
              </>
            )}

            {step === 2 && (
              <>
                <h2>Step 2. 신축/구축 조건</h2>
                <p className="muted">주택 상태와 세부 공사 여부가 조건 키에 포함됩니다.</p>
                <div className="segmented">
                  <button
                    className={condition.buildType === "new" ? "selected" : ""}
                    onClick={() =>
                      updateCondition({
                        buildType: "new",
                        expanded: false,
                        expansionSpaces: [],
                      })
                    }
                  >
                    신축
                  </button>
                  <button
                    className={condition.buildType === "old" ? "selected" : ""}
                    onClick={() =>
                      updateCondition({
                        buildType: "old",
                        powderRoom: false,
                        dressRoom: false,
                      })
                    }
                  >
                    구축
                  </button>
                </div>

                {condition.buildType === "new" && (
                  <div className="check-row">
                    <label>
                      <input
                        type="checkbox"
                        checked={condition.powderRoom}
                        onChange={(event) => updateCondition({ powderRoom: event.target.checked })}
                      />
                      파우더룸 공사
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={condition.dressRoom}
                        onChange={(event) => updateCondition({ dressRoom: event.target.checked })}
                      />
                      드레스룸 공사
                    </label>
                  </div>
                )}

                {condition.buildType === "old" && (
                  <div className="stack">
                    <div className="segmented compact">
                      <button
                        className={!condition.expanded ? "selected" : ""}
                        onClick={() => updateCondition({ expanded: false, expansionSpaces: [] })}
                      >
                        확장 없음
                      </button>
                      <button
                        className={condition.expanded ? "selected" : ""}
                        onClick={() => updateCondition({ expanded: true })}
                      >
                        확장 있음
                      </button>
                    </div>
                    {condition.expanded && (
                      <div>
                        <p className="field-label">확장 공간 다중 선택</p>
                        <div className="chips">
                          {spaces.map((space) => (
                            <button
                              key={space}
                              className={condition.expansionSpaces.includes(space) ? "selected" : ""}
                              onClick={() => toggleExpansionSpace(space)}
                            >
                              {space}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <h2>Step 3. 빈집/살림집 선택</h2>
                <p className="muted">시공 환경이 다르면 가격 데이터도 별도로 저장됩니다.</p>
                <div className="segmented">
                  <button
                    className={condition.occupancy === "empty" ? "selected" : ""}
                    onClick={() => updateCondition({ occupancy: "empty" })}
                  >
                    빈집
                  </button>
                  <button
                    className={condition.occupancy === "occupied" ? "selected" : ""}
                    onClick={() => updateCondition({ occupancy: "occupied" })}
                  >
                    살림집
                  </button>
                </div>
              </>
            )}

            <div className="actions">
              <button className="ghost" onClick={step === 1 ? resetFlow : () => setStep(step - 1)}>
                <ArrowLeft size={18} /> 이전
              </button>
              <button className="primary-button" disabled={!canGoNext()} onClick={goNext}>
                {step === 3 ? "조건 키 확인" : "다음"}
              </button>
            </div>
          </section>
        </main>
      )}

      {page === "condition-summary" && (
        <main className="panel-page">
          <section className="panel">
            <h2>조건 키 요약</h2>
            <div className="key-box">
              <span>사람이 보는 요약</span>
              <strong>{conditionSummary}</strong>
              <span>저장/매칭 기준 키</span>
              <code>{conditionKey}</code>
            </div>

            {matchedSavedData && (
              <div className="load-box">
                <Check size={22} />
                <div>
                  <strong>이전에 저장된 동일 조건의 견적 데이터가 있습니다.</strong>
                  <p>조건 키가 완전히 일치하므로 저장된 소재/가격을 불러올 수 있습니다.</p>
                </div>
                <button className="primary-button" onClick={loadSavedEstimate}>
                  불러오기
                </button>
              </div>
            )}

            {!matchedSavedData && (
              <p className="muted">
                현재 조건 키와 완전히 일치하는 저장 데이터가 없어 불러오기 안내가 표시되지 않습니다.
              </p>
            )}

            <div className="dummy-note">
              <strong>프로토타입에 미리 저장된 조건 예시</strong>
              <span>32평 · 신축 · 파우더룸 O · 드레스룸 X · 빈집</span>
              <span>24평 · 구축 · 확장 있음 · 거실/주방 · 살림집</span>
            </div>

            <div className="actions">
              <button className="ghost" onClick={() => setPage("condition")}>
                <ArrowLeft size={18} /> 조건 수정
              </button>
              <button className="secondary-button" onClick={startFreshEstimate}>
                새로 입력
              </button>
            </div>
          </section>
        </main>
      )}

      {page === "items" && (
        <main className="workspace">
          <section className="category-column">
            <h2>시공 항목 선택</h2>
            <p className="muted">여러 항목을 동시에 선택할 수 있습니다.</p>
            <div className="category-grid">
              {categories.map((category) => {
                const selected = activeCategories.includes(category.id);
                return (
                  <button
                    key={category.id}
                    className={`category-card ${selected ? "selected" : ""}`}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <span>{category.name}</span>
                    {selected && <Check size={18} />}
                  </button>
                );
              })}
            </div>
            <div className="total-box">
              <span>선택 항목 합계</span>
              <strong>{total.toLocaleString()}원</strong>
            </div>
          </section>

          <section className="editor">
            <div className="editor-header">
              <div>
                <h2>{currentCategory?.name} 소재/가격</h2>
                <p className="muted">체크된 소재만 이번 견적서에 포함됩니다.</p>
              </div>
              <button className="secondary-button" onClick={() => setPage("preview")}>
                견적서 미리보기
              </button>
            </div>

            <div className="material-list">
              {(items[openCategory] ?? []).map((row, index) => (
                <div className="material-row" key={`${row.material}-${index}`}>
                  <label className="material-check">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={(event) =>
                        updateItem(openCategory, index, { selected: event.target.checked })
                      }
                    />
                    <span>{row.material}</span>
                  </label>
                  <div className="thumb">
                    <Image size={18} />
                    <span>예시 사진</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="가격"
                    value={row.price}
                    onChange={(event) => updateItem(openCategory, index, { price: event.target.value })}
                  />
                </div>
              ))}
            </div>

            <div className="add-row">
              <input
                value={newMaterialName}
                onChange={(event) => setNewMaterialName(event.target.value)}
                placeholder={`${currentCategory?.name} 새 소재명`}
              />
              <button className="secondary-button" onClick={addMaterial}>
                <Plus size={18} /> 소재 추가
              </button>
            </div>
          </section>
        </main>
      )}

      {page === "preview" && (
        <main className="panel-page">
          <section className="panel wide">
            <div className="editor-header">
              <div>
                <h2>견적서 미리보기</h2>
                <p className="muted">조건 키와 선택 소재/가격이 함께 저장되는 구조를 확인합니다.</p>
              </div>
              <button className="ghost" onClick={() => setPage("items")}>
                <ArrowLeft size={18} /> 항목 수정
              </button>
            </div>

            <div className="form-grid">
              <label>
                집 주소
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="예: 서울시 강남구 ..."
                />
              </label>
              <label>
                시공 예정일
                <input
                  type="date"
                  value={workDate}
                  onChange={(event) => setWorkDate(event.target.value)}
                />
              </label>
            </div>

            <div className="key-box compact-key">
              <span>저장 기준 조건 키</span>
              <strong>{conditionSummary}</strong>
              <code>{conditionKey}</code>
            </div>

            <table>
              <thead>
                <tr>
                  <th>시공 항목</th>
                  <th>소재</th>
                  <th>가격</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.map((row, index) => (
                  <tr key={`${row.categoryId}-${row.material}-${index}`}>
                    <td>{row.categoryName}</td>
                    <td>{row.material}</td>
                    <td>{row.price.toLocaleString()}원</td>
                  </tr>
                ))}
                {!selectedRows.length && (
                  <tr>
                    <td colSpan="3">선택된 소재가 없습니다.</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2">총 합계</td>
                  <td>{total.toLocaleString()}원</td>
                </tr>
              </tfoot>
            </table>

            <div className="actions">
              <button
                className="primary-button"
                onClick={() => alert(`${conditionSummary}\n이 조건 키에 저장되었습니다.`)}
              >
                <Save size={18} /> 견적서 저장
              </button>
              <button
                className="secondary-button"
                onClick={() => alert("견적서 출력/미리보기 기능은 실제 연동 없이 알림으로 처리됩니다.")}
              >
                <Printer size={18} /> 견적서 출력/미리보기
              </button>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

function Progress({ step }) {
  return (
    <div className="progress">
      {[1, 2, 3].map((entry) => (
        <div key={entry} className={entry <= step ? "active" : ""}>
          <span>{entry}</span>
          <p>{entry === 1 ? "평수" : entry === 2 ? "주택 조건" : "거주 상태"}</p>
        </div>
      ))}
    </div>
  );
}

const styles = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Arial, "Noto Sans KR", sans-serif;
    color: #17202a;
    background: #f5f7fa;
  }
  button, input, select {
    font: inherit;
  }
  button {
    cursor: pointer;
    border: 0;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
  .app-shell {
    min-height: 100vh;
  }
  .landing {
    max-width: 1120px;
    margin: 0 auto;
    padding: 56px 24px;
  }
  .hero {
    min-height: 320px;
    display: flex;
    align-items: center;
    padding: 44px;
    color: white;
    background:
      linear-gradient(90deg, rgba(16, 24, 40, 0.88), rgba(16, 24, 40, 0.44)),
      url("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80");
    background-size: cover;
    background-position: center;
  }
  .hero h1 {
    max-width: 720px;
    margin: 0 0 16px;
    font-size: 42px;
    line-height: 1.18;
    letter-spacing: 0;
  }
  .hero p {
    max-width: 760px;
    line-height: 1.7;
  }
  .eyebrow {
    margin: 0 0 12px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .menu-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    margin-top: 22px;
  }
  .menu-card {
    min-height: 150px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    padding: 24px;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    background: white;
    color: #17202a;
    text-align: left;
    font-size: 20px;
    font-weight: 700;
  }
  .menu-card.primary {
    background: #0f6b5f;
    color: white;
    border-color: #0f6b5f;
  }
  .simple-page, .panel-page {
    max-width: 960px;
    margin: 0 auto;
    padding: 40px 24px;
  }
  .empty-state {
    margin-top: 80px;
    padding: 60px 24px;
    text-align: center;
    background: white;
    border: 1px solid #d8dee8;
    border-radius: 8px;
  }
  .panel {
    padding: 28px;
    background: white;
    border: 1px solid #d8dee8;
    border-radius: 8px;
  }
  .panel.wide {
    max-width: 1120px;
    margin: 0 auto;
  }
  .panel h2, .category-column h2, .editor h2 {
    margin: 0 0 10px;
  }
  .muted {
    color: #657083;
    line-height: 1.6;
  }
  select, input {
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    border: 1px solid #cbd4e1;
    border-radius: 6px;
    background: white;
  }
  .progress {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 18px;
  }
  .progress div {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    background: white;
    color: #657083;
  }
  .progress div.active {
    border-color: #0f6b5f;
    color: #0f6b5f;
  }
  .progress span {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #eef2f6;
    font-weight: 700;
  }
  .progress .active span {
    background: #0f6b5f;
    color: white;
  }
  .progress p {
    margin: 0;
    font-weight: 700;
  }
  .segmented {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin: 18px 0;
  }
  .segmented.compact {
    max-width: 420px;
  }
  .segmented button, .chips button {
    min-height: 44px;
    border: 1px solid #cbd4e1;
    border-radius: 6px;
    background: white;
    color: #17202a;
    font-weight: 700;
  }
  .segmented button.selected, .chips button.selected {
    border-color: #0f6b5f;
    background: #e7f4f1;
    color: #0f6b5f;
  }
  .check-row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 18px;
  }
  .check-row label, .material-check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
  }
  .check-row input, .material-check input {
    width: 18px;
    min-height: 18px;
  }
  .stack {
    display: grid;
    gap: 16px;
  }
  .field-label {
    margin: 0 0 10px;
    font-weight: 700;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chips button {
    padding: 0 14px;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 28px;
  }
  .primary-button, .secondary-button, .ghost {
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 16px;
    border-radius: 6px;
    font-weight: 700;
  }
  .primary-button {
    background: #0f6b5f;
    color: white;
  }
  .secondary-button {
    border: 1px solid #0f6b5f;
    background: white;
    color: #0f6b5f;
  }
  .ghost {
    background: transparent;
    color: #344054;
  }
  .sticky-summary {
    position: sticky;
    top: 0;
    z-index: 10;
    display: grid;
    grid-template-columns: auto minmax(220px, 1fr) auto;
    gap: 14px;
    align-items: center;
    padding: 12px 24px;
    border-bottom: 1px solid #d8dee8;
    background: rgba(255, 255, 255, 0.96);
  }
  .sticky-summary span {
    color: #657083;
    font-size: 13px;
    font-weight: 700;
  }
  code {
    padding: 5px 8px;
    border-radius: 5px;
    background: #eef2f6;
    color: #344054;
    white-space: normal;
  }
  .key-box {
    display: grid;
    gap: 8px;
    padding: 18px;
    border: 1px solid #cbd4e1;
    border-radius: 8px;
    background: #f8fafc;
  }
  .key-box span, .dummy-note span {
    color: #657083;
    font-size: 14px;
  }
  .load-box {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 14px;
    align-items: center;
    margin-top: 18px;
    padding: 16px;
    border: 1px solid #9bd7c8;
    border-radius: 8px;
    background: #ecfaf6;
  }
  .load-box p {
    margin: 6px 0 0;
    color: #48635e;
  }
  .dummy-note {
    display: grid;
    gap: 6px;
    margin-top: 18px;
    padding: 14px;
    border-left: 4px solid #cbd4e1;
    background: #f8fafc;
  }
  .workspace {
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
    gap: 18px;
    max-width: 1180px;
    margin: 0 auto;
    padding: 32px 24px;
  }
  .category-column, .editor {
    padding: 22px;
    border: 1px solid #d8dee8;
    border-radius: 8px;
    background: white;
  }
  .category-grid {
    display: grid;
    gap: 10px;
    margin: 18px 0;
  }
  .category-card {
    min-height: 66px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border: 1px solid #cbd4e1;
    border-radius: 8px;
    background: white;
    color: #17202a;
    font-weight: 800;
    font-size: 18px;
  }
  .category-card.selected {
    border-color: #0f6b5f;
    background: #e7f4f1;
    color: #0f6b5f;
  }
  .total-box {
    display: grid;
    gap: 6px;
    padding: 16px;
    border-radius: 8px;
    background: #17202a;
    color: white;
  }
  .total-box span {
    color: #cbd4e1;
  }
  .total-box strong {
    font-size: 26px;
  }
  .editor-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 18px;
  }
  .material-list {
    display: grid;
    gap: 10px;
  }
  .material-row {
    display: grid;
    grid-template-columns: minmax(140px, 1fr) 150px 160px;
    gap: 10px;
    align-items: center;
    padding: 12px;
    border: 1px solid #d8dee8;
    border-radius: 8px;
  }
  .thumb {
    min-height: 54px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px dashed #b8c2d2;
    border-radius: 6px;
    background: #f8fafc;
    color: #657083;
    font-size: 13px;
  }
  .add-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    margin-top: 14px;
  }
  .form-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 14px;
    margin-bottom: 16px;
  }
  .form-grid label {
    display: grid;
    gap: 8px;
    font-weight: 700;
  }
  .compact-key {
    margin: 16px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: white;
  }
  th, td {
    padding: 13px;
    border: 1px solid #d8dee8;
    text-align: left;
  }
  th {
    background: #f1f5f9;
  }
  tfoot td {
    font-weight: 800;
    background: #f8fafc;
  }
  @media (max-width: 840px) {
    .menu-grid, .workspace, .form-grid, .material-row, .sticky-summary {
      grid-template-columns: 1fr;
    }
    .hero {
      padding: 28px;
    }
    .hero h1 {
      font-size: 30px;
    }
    .editor-header, .actions {
      flex-direction: column;
      align-items: stretch;
    }
    .load-box {
      grid-template-columns: 1fr;
    }
  }
`;
