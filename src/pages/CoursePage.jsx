// 3. 과목 상세: /course?subject=ID
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../lib/AppContext.jsx';
import { C } from '../lib/constants.js';
import { courseUrl } from '../lib/nav.js';
import { EvalChip, ErrorBox, InstBadge, Loading, SharedTag, StatusChip } from '../components/ui.jsx';
import SubjectNav from './course/SubjectNav.jsx';
import InfoCard from './course/InfoCard.jsx';
import NotesCard from './course/NotesCard.jsx';
import LogCard from './course/LogCard.jsx';
import StageChecks from './course/StageChecks.jsx';
import SessionMatrix from './course/SessionMatrix.jsx';
import ReceiptChecks from './course/ReceiptChecks.jsx';
import { PAGE_CSS } from './course/styles.js';

function Tag({ children, style }) {
  return <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap', ...style }}>{children}</span>;
}

export default function CoursePage() {
  const { model, loading, error, year, canEdit, run } = useApp();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const param = Number(params.get('subject'));

  const subject = useMemo(() => {
    if (!model) return null;
    const s = model.subjectById.get(param);
    if (s && s.year === model.year) return s;
    return model.active.find((x) => x.institute === 'V') || model.active[0] || null;
  }, [model, param]);

  if (error) return <ErrorBox text={error} />;
  if (loading || !model) return <Loading />;
  if (!subject) {
    return (
      <div style={{ background: '#FFFFFF', border: '1px dashed #A9B1BD', borderRadius: 10, padding: '40px 32px', fontSize: 15, color: '#2B3038' }}>
        {year}년 과목이 아직 없어요.
      </div>
    );
  }

  const inst = subject.institute;
  const list = model.active.filter((s) => s.institute === inst);
  const pos = list.findIndex((s) => s.id === subject.id) + 1;
  const go = (id) => navigate(courseUrl(id), { replace: true });
  const switchInst = (code) => {
    if (code === inst) return;
    if (subject.partner && subject.partner.institute === code) { go(subject.partner.id); return; }
    const first = model.active.find((s) => s.institute === code);
    if (first) go(first.id);
  };
  const p = subject.production;
  const leased = p?.kind === '타기관 임대';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
      <style>{PAGE_CSS}</style>

      <div className="crs-grid" style={{ alignItems: 'center' }}>
        <SubjectNav inst={inst} list={list} current={subject} pos={pos} onPick={go} onInst={switchInst} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, textAlign: 'right', minWidth: 0, minHeight: 84, justifyContent: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.2, wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>{subject.name}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
            <InstBadge code={inst} style={{ fontSize: 12, padding: '3px 8px' }} />
            {subject.eval_type && <EvalChip type={subject.eval_type} />}
            {subject.prod_status && <StatusChip status={subject.prod_status} />}
            <SharedTag other={subject.shared} />
            {p?.is_practicum && <Tag style={{ background: '#F1F3F5', color: '#3A414C' }}>실습</Tag>}
            {subject.deleted_at && <Tag style={{ background: C.dangerBg, color: C.danger }}>삭제 표시됨</Tag>}
          </div>
        </div>
      </div>

      {leased ? (
        // 타기관 임대: 작업 입력이 없으므로 과목 정보 + 자료 수신 여부만
        <div className="crs-grid" style={{ alignItems: 'stretch' }}>
          <InfoCard subject={subject} />
          <ReceiptChecks p={p} canEdit={canEdit} run={run} compact />
        </div>
      ) : (
        <div className="crs-grid" style={{ alignItems: 'stretch' }}>
          <InfoCard subject={subject} />
          <NotesCard key={`ct-${p?.id}`} p={p} kind="교수소통" canEdit={canEdit} run={run} />
          <LogCard p={p} />
          <NotesCard key={`wm-${p?.id}`} p={p} kind="작업메모" canEdit={canEdit} run={run} />
        </div>
      )}

      {leased ? null : p ? (
        <>
          <StageChecks p={p} canEdit={canEdit} run={run} />
          <SessionMatrix key={p.id} subject={subject} p={p} canEdit={canEdit} run={run} />
        </>
      ) : (
        <ErrorBox text="이 과목의 제작 정보를 찾지 못했어요." />
      )}
    </div>
  );
}
