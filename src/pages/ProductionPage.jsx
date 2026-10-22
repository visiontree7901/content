import { useApp } from '../lib/AppContext.jsx';
import { Loading, ErrorBox } from '../components/ui.jsx';

export default function ProductionPage() {
  const { model, loading, error } = useApp();
  if (error) return <ErrorBox text={error} />;
  if (loading || !model) return <Loading />;
  return <p>ProductionPage — 과목 {model.active.length}개</p>;
}
