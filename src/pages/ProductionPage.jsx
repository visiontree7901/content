// 2. 통합 제작현황 (비전·건국 공통) — 보기 전용
import { useMemo, useState } from 'react';
import { useApp } from '../lib/AppContext.jsx';
import { Loading, ErrorBox } from '../components/ui.jsx';
import { NEW_STAGES } from '../lib/constants.js';
import { fullyDoneSessions, isProductionComplete, stageProgress } from '../lib/model.js';
import { liveProductions } from './production/helpers.js';
import NewShootCard from './production/NewShootCard.jsx';
import PartTable from './production/PartTable.jsx';

const FILTERS = [
  { id: 'all', label: '전체', test: () => true },
  { id: 'V', label: '비전', test: (it) => it.insts.includes('V') },
  { id: 'K', label: '건국', test: (it) => it.insts.includes('K') },
  { id: 'both', label: '두 기관 공통', test: (it) => it.insts.includes('V') && it.insts.includes('K') },
  { id: 'shoot', label: '촬영 진행 중', test: (it) => { const r = stageProgress(it.p, '촬영'); return r.done < r.total; } },
  { id: 'prac', label: '실습 과목', test: (it) => !!it.p.is_practicum },
];

const sq = (extra) => ({ width: 12, height: 12, borderRadius: 2, boxSizing: 'border-box', ...extra });
const legendRow = { marginLeft: 'auto', display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#4A525E', alignItems: 'center' };
const legendItem = { display: 'flex', alignItems: 'center', gap: 6 };
const summary = { fontSize: 13, color: '#4A525E', fontVariantNumeric: 'tabular-nums' };

function StatCards({ items }) {
  const all = items.reduce((a, it) => a + it.p.total_sessions, 0);
  return (
    <section aria-label="요약" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: 12 }}>
      {NEW_STAGES.map((st) => {
        let done = 0; let subj = 0;
        for (const it of items) {
          const r = stageProgress(it.p, st);
          done += r.done;
          if (r.total && r.done >= r.total) subj++;
        }
        const pct = `${all ? Math.round((done / all) * 100) : 0}%`;
        return (
          <div key={st} style={{ background: '#FFFFFF', border: '1px solid #E2E5EA', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#4A525E' }}>
              <span style={{ fontWeight: 700, color: '#15181D' }}>{st}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{pct}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{subj}</span><span style={{ fontSize: 14, color: '#4A525E' }}>/ {items.length}과목 완료</span>
            </div>
            <div role="progressbar" aria-label={`${st} 차시 진행률`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={parseInt(pct, 10)}
              style={{ height: 6, background: '#E9ECF0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: 6, background: '#1F4FBF', width: pct }} />
            </div>
            <div style={{ fontSize: 12, color: '#4A525E', fontVariantNumeric: 'tabular-nums' }}>차시 {done} / {all}</div>
          </div>
        );
      })}
    </section>
  );
}

function EmptyBox({ children, dashed }) {
  return (
    <div style={{ background: '#FFFFFF', border: `1px ${dashed ? 'dashed #A9B1BD' : 'solid #E2E5EA'}`, borderRadius: 10, padding: dashed ? '40px 32px' : '24px 20px', fontSize: dashed ? 15 : 14, color: dashed ? '#2B3038' : '#4A525E', lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

export default function ProductionPage() {
  const { model, loading, error, year } = useApp();
  const [filter, setFilter] = useState('all');

  const { full, part } = useMemo(() => {
    if (!model) return { full: [], part: [] };
    const list = liveProductions(model);
    return { full: list.filter((it) => it.p.kind === '신규촬영'), part: list.filter((it) => it.p.kind === '일부 수정') };
  }, [model]);

  if (error) return <ErrorBox text={error} />;
  if (loading || !model) return <Loading />;

  if (!model.active.length) {
    return (
      <EmptyBox dashed>
        {year}년 데이터가 아직 없어요. 기관별 현황에서 과목을 추가하거나 엑셀을 올리면 여기에 제작현황이 보여요.
      </EmptyBox>
    );
  }

  const cur = FILTERS.find((f) => f.id === filter) || FILTERS[0];
  const shown = full.filter(cur.test);
  const fullDone = full.filter((it) => isProductionComplete(it.p)).length;
  const fullSessDone = full.reduce((a, it) => a + fullyDoneSessions(it.p), 0);
  const fullSessAll = full.reduce((a, it) => a + it.p.total_sessions, 0);
  const partDone = part.filter((it) => isProductionComplete(it.p)).length;
  const partPlanned = part.filter((it) => Object.keys(it.p.plan).length).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: -0.3 }}>{year}년 통합 제작현황</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#4A525E' }}>두 교육원에 같이 들어가는 과목은 한 번만 작업하면 양쪽에 함께 반영됩니다.</p>
        </div>
        <div style={legendRow}>
          <span style={legendItem}><span style={sq({ background: '#1F4FBF' })} />완료</span>
          <span style={legendItem}><span style={sq({ background: '#E2E5EA' })} />미완료</span>
        </div>
      </div>

      {full.length > 0 && <StatCards items={full} />}

      <section aria-labelledby="full-h" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <h2 id="full-h" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>신규촬영 <span style={{ color: '#4A525E', fontWeight: 500 }}>{full.length}과목</span></h2>
          {full.length > 0 && <span style={summary}>완료 {fullDone}과목 · 모든 공정 끝난 차시 {fullSessDone} / {fullSessAll}</span>}
          {full.length > 0 && (
            <div role="group" aria-label="신규촬영 과목 거르기" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginLeft: 'auto' }}>
              {FILTERS.map((f) => {
                const on = f.id === cur.id;
                return (
                  <button key={f.id} type="button" aria-pressed={on} onClick={() => setFilter(f.id)}
                    style={{ height: 40, padding: '0 14px', borderRadius: 999, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer', ...(on ? { background: '#15181D', color: '#FFFFFF', border: '1px solid #15181D', fontWeight: 600 } : { background: '#FFFFFF', color: '#2B3038', border: '1px solid #C9CED6', fontWeight: 400 }) }}>
                    {f.label} <span style={{ opacity: 0.75 }}>{full.filter(f.test).length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {!full.length ? (
          <EmptyBox>{year}년에는 신규촬영 과목이 없어요.</EmptyBox>
        ) : !shown.length ? (
          <EmptyBox>‘{cur.label}’에 해당하는 과목이 없어요.</EmptyBox>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(420px, 100%), 1fr))', gap: 12 }}>
            {shown.map((it) => <NewShootCard key={it.p.id} item={it} />)}
          </div>
        )}
      </section>

      <section aria-labelledby="part-h" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 12 }}>
          <h2 id="part-h" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>일부 수정 <span style={{ color: '#4A525E', fontWeight: 500 }}>{part.length}과목</span></h2>
          {part.length > 0 && <span style={summary}>완료 {partDone}과목 · 수정 차시 지정 {partPlanned}과목</span>}
          <span style={{ fontSize: 13, color: '#4A525E' }}>수정 대상 차시만 표시합니다</span>
          <div style={legendRow}>
            <span style={legendItem}><span style={sq({ border: '1.5px solid #1F4FBF' })} />재촬영</span>
            <span style={legendItem}><span style={sq({ border: '1.5px solid #C2570C' })} />재편집</span>
            <span style={legendItem}><span style={sq({ background: '#4A525E' })} />칸이 채워지면 완료</span>
          </div>
        </div>
        {part.length ? <PartTable items={part} /> : <EmptyBox>{year}년에는 일부 수정 과목이 없어요.</EmptyBox>}
      </section>
    </div>
  );
}
