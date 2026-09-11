import { useEffect, useState } from 'react';
import { fetchAnalysisLogs } from '../../api/buzzApi';
import { PageHeader } from '../../components/PageHeader';
import styles from './History.module.css';

export function AnalysisLogs() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAnalysisLogs(500).then(data => { if (active) { setRows(data); setError(''); } })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);
  return <div>
    <PageHeader title="분석 로그" description="최근 500건 · 자동 분석은 사업장별 5분 간격 및 위험 진입·정상 복귀 시 기록합니다. 기존 저장 로그도 포함됩니다." />
    <button disabled={loading} onClick={() => setRefresh(v => v + 1)}>{loading ? '조회 중…' : '새로고침'}</button>
    {error && <p role="alert">{error}</p>}
    <div className={styles.tableWrap}><table>
      <thead><tr>{['기록 시각', '사업장', '분류', '파일', '판정', '신뢰도'].map(v => <th key={v}>{v}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.analysis_id}>
        <td>{row.detected_at}</td><td>{row.site_id ? `사업장 ${row.site_id}` : '사용자 테스트'}</td>
        <td>{row.analysis_type}</td><td>{row.original_file_name}</td>
        <td>{row.prediction === 'wasp' ? '말벌' : '말벌 아님'}</td><td>{(row.confidence * 100).toFixed(1)}%</td>
      </tr>)}</tbody>
    </table></div>
    {!loading && !error && !rows.length && <p>저장된 분석 로그가 없습니다.</p>}
  </div>;
}
