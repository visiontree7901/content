// 카드 1: 교수 · 과목 정보 (비공개 칸은 팀 로그인일 때만)
import { C } from '../../lib/constants.js';
import { Icon } from '../../components/ui.jsx';
import { card360, h2Style } from './styles.js';

const grid = { display: 'grid', gridTemplateColumns: '104px minmax(0, 1fr)', gap: '8px 12px', fontSize: 14 };
const label = { color: C.muted };
const dash = <span style={{ color: C.subtle }}>—</span>;
const val = (v, style) => (v == null || v === '' ? dash : <span style={{ overflowWrap: 'anywhere', ...style }}>{v}</span>);

function Rows({ rows }) {
  return rows.map(([k, v, style]) => [
    <span key={`${k}-k`} style={label}>{k}</span>,
    <span key={`${k}-v`} style={{ minWidth: 0 }}>{val(v, style)}</span>,
  ]);
}

export default function InfoCard({ subject }) {
  const p = subject.production;
  const T = p?.total_sessions;
  const result = subject.last_result ? subject.last_result + (subject.fail_reason ? ` · ${subject.fail_reason}` : '') : subject.fail_reason;
  const priv = subject.priv;
  const num = { fontVariantNumeric: 'tabular-nums' };
  return (
    <section aria-labelledby="pf-h" style={card360}>
      <h2 id="pf-h" style={h2Style}>교수 · 과목 정보</h2>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={grid}>
          <Rows rows={[
            ['교수', subject.professor, { fontWeight: 600 }],
            ['소유', subject.owner],
            ['촬영지', subject.location],
            ['개발년도', subject.dev_year, num],
            ['최근 결과', result, result ? { color: '#8E2B09', fontWeight: 600 } : null],
            ['총 차시', T ? `${T}차시${p.is_practicum ? ' (실습)' : ''}` : null],
            ...(subject.note ? [['비고', subject.note]] : []),
          ]} />
        </div>
        {priv ? (
          <div style={{ ...grid, borderTop: '1px solid #EEF0F3', paddingTop: 12 }}>
            <Rows rows={[
              ['렉넘', priv.lecnum, num],
              ['웹 폴더 예전', priv.web_folder_old, num],
              ['웹 폴더 신규', priv.web_folder_new, num],
              ['CDN 폴더 예전', priv.cdn_folder_old, num],
              ['CDN 폴더 신규', priv.cdn_folder_new, num],
              ['휴대폰', priv.phone, num],
              ['이메일', priv.email],
            ]} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted, borderTop: '1px solid #EEF0F3', paddingTop: 12 }}>
            <Icon name="lock" size={13} />
            렉넘·폴더명·연락처는 팀 로그인 후에만 보여요 (링크로 보는 사람에게는 숨김)
          </div>
        )}
      </div>
    </section>
  );
}
