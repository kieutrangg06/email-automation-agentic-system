'use client';

import { useEffect, useState } from 'react';

type Summary = {
  summary_date: string;
  total_received: number;
  total_pending_tickets: number;
  total_p1: number;
  negative_issues: Array<Record<string, unknown>>;
  key_insights: Array<string | { title?: string; detail?: string }> | string;
  risk_summary: string;
  recommendations: string[];
  incident_spike: boolean;
  increase_percent?: number;
  baseline_count?: number;
  incident_count?: number;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const todayInVietnam = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const number = (value?: number | string) => Number(value ?? 0).toLocaleString();

export default function DigestPage() {
  const [date, setDate] = useState(todayInVietnam());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(selectedDate = date) {
    setLoading(true);
    setError('');
    try {
      const [summaryResponse, historyResponse] = await Promise.all([
        fetch(`${API}/dashboard/daily-summary?date=${encodeURIComponent(selectedDate)}`, { cache: 'no-store' }),
        fetch(`${API}/dashboard/daily-summary/history`, { cache: 'no-store' }),
      ]);
      if (!summaryResponse.ok || !historyResponse.ok) throw new Error('Dashboard API is unavailable.');
      const summaryPayload = await summaryResponse.json();
      const summaryData = Object.hasOwn(summaryPayload, 'data')
        ? summaryPayload.data
        : summaryPayload;
      setSummary(summaryData as Summary | null);
      setHistory((await historyResponse.json()) as Summary[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the daily report.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const insights = Array.isArray(summary?.key_insights)
    ? summary.key_insights
    : typeof summary?.key_insights === 'string'
      ? (() => {
          try {
            const parsed: unknown = JSON.parse(summary.key_insights);
            return Array.isArray(parsed)
              ? parsed as Array<string | { title?: string; detail?: string }>
              : [];
          } catch {
            return [];
          }
        })()
      : [];
  const issues = Array.isArray(summary?.negative_issues) ? summary.negative_issues : [];
  const recommendations = Array.isArray(summary?.recommendations) ? summary.recommendations : [];

  return (
    <main className="workspace digest-workspace">
      <header className="topbar">
        <a className="wordmark" href="/digest"><span className="mark">EA</span> OPERATIONS / AI MAIL</a>
        <nav aria-label="Main navigation"><a href="/approvals">Approvals</a><a className="active" href="/digest">Daily intelligence</a></nav>
        <span className="live-label"><i /> POSTGRESQL / LIVE</span>
      </header>
      <section className="page-heading digest-heading">
        <div><p className="eyebrow">OPERATIONS BRIEF / AUTOMATED DAILY REPORT</p><h1>Daily Inbox Intelligence</h1><p className="subheading">A clear read on incoming demand, unresolved work, and customer risk.</p></div>
        <div className="date-controls"><label className="field-label">REPORT DATE<input type="date" value={date} onChange={(event) => { setDate(event.target.value); void load(event.target.value); }} /></label><button className="icon-button" onClick={() => void load()} disabled={loading} aria-label="Refresh report" title="Refresh report">↻</button></div>
      </section>
      {error && <div className="dashboard-error" role="alert"><span>{error}</span><button className="button secondary" onClick={() => void load()}>Retry</button></div>}
      {loading ? <section className="report-loading"><span className="loading-mark" /><strong>Loading operations report</strong><span>Reading persisted summary data…</span></section> : !summary ? <section className="report-empty"><span className="empty-glyph">—</span><h2>No report for this date</h2><p>The dashboard will populate after the daily workflow saves a summary.</p><button className="button secondary" onClick={() => void load()}>Retry</button></section> : <>
        <section className="metrics-grid">
          <article className="metric"><span className="eyebrow">INCOMING EMAILS</span><strong>{number(summary.total_received)}</strong><span className="metric-foot">Received on {summary.summary_date}</span></article>
          <article className="metric"><span className="eyebrow">PENDING TICKETS</span><strong>{number(summary.total_pending_tickets)}</strong><span className="metric-foot">Open operational workload</span></article>
          <article className="metric critical"><span className="eyebrow">P1 / CRITICAL</span><strong>{number(summary.total_p1)}</strong><span className="metric-foot">Urgent triage items</span></article>
          <article className={`metric spike-metric ${summary.incident_spike ? 'spike-active' : ''}`}><span className="eyebrow">INCIDENT TREND</span><strong>{summary.incident_spike ? `+${number(summary.increase_percent)}%` : 'STABLE'}</strong><span className="metric-foot">{number(summary.incident_count)} incidents · baseline {number(summary.baseline_count)}</span></article>
        </section>
        <section className="report-grid">
          <article className="report-section insights-section"><div className="section-title"><div><p className="eyebrow">MODEL-ASSISTED / EVIDENCE-BASED</p><h2>Key insights</h2></div><span className="section-index">01</span></div>
            {insights.length ? <ul className="insight-list">{insights.map((insight, index) => <li key={index}><span className="insight-number">{String(index + 1).padStart(2, '0')}</span><span>{typeof insight === 'string' ? insight : `${insight.title ?? ''}${insight.detail ? ` ${insight.detail}` : ''}`}</span></li>)}</ul> : <p className="muted-copy">Không đủ dữ liệu để kết luận.</p>}
          </article>
          <article className="report-section risk-section"><div className="section-title"><div><p className="eyebrow">CUSTOMER SIGNAL</p><h2>Risk summary</h2></div><span className="risk-flag">{summary.incident_spike ? 'SPIKE' : 'MONITOR'}</span></div><p className="risk-copy">{summary.risk_summary || 'Không đủ dữ liệu để kết luận.'}</p><div className="risk-rule" /><div className="issue-count"><strong>{number(issues.length)}</strong><span>negative or urgent issues</span></div></article>
          <article className="report-section issue-section"><div className="section-title"><div><p className="eyebrow">TRIAGE LOG / DATABASE</p><h2>Negative issues</h2></div><span className="section-index">02</span></div>
            {issues.length ? <div className="issue-list">{issues.slice(0, 8).map((issue, index) => <div className="issue-item" key={String(issue.id ?? index)}><span className="issue-dot" /><div><strong>{String(issue.subject ?? issue.category ?? 'Urgent issue')}</strong><span>{String(issue.category ?? 'Uncategorized')} · {String(issue.priority ?? 'No priority')}</span></div><small>{String(issue.sentiment ?? 'REVIEW')}</small></div>)}</div> : <p className="muted-copy">No negative or urgent items were recorded for this date.</p>}
          </article>
          <article className="report-section recommendations-section"><div className="section-title"><div><p className="eyebrow">OPERATIONAL FOLLOW-THROUGH</p><h2>Recommendations</h2></div><span className="section-index">03</span></div>
            {recommendations.length ? <ol className="recommendation-list">{recommendations.map((item, index) => <li key={index}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}</ol> : <p className="muted-copy">No recommendations were returned for this report.</p>}
          </article>
        </section>
        <section className="delivery-bar"><div><span className="eyebrow">EMAIL DELIVERY</span><strong>{number(summary.sent_count)} <small>sent</small><b>/</b> {number(summary.failed_count)} <small>failed</small></strong></div><div><span className="eyebrow">RECIPIENTS</span><strong>{number(summary.recipient_count)}</strong></div><div><span className="eyebrow">LAST GENERATED</span><strong>{summary.created_at ? new Date(summary.created_at).toLocaleString() : 'Not recorded'}</strong></div><span className={`delivery-state ${summary.failed_count > 0 ? 'delivery-warning' : ''}`}>{summary.failed_count > 0 ? 'PARTIAL DELIVERY' : 'REPORT SAVED'}</span></section>
      </>}
      <section className="history-section"><div className="section-title"><div><p className="eyebrow">POSTGRESQL / DAILY_SUMMARIES</p><h2>Digest history</h2></div><span className="history-count">{history.length} reports</span></div>
        {history.length ? <div className="history-table-wrap"><table><thead><tr><th>DATE</th><th>INBOUND</th><th>PENDING</th><th>P1</th><th>INCIDENT</th><th>DELIVERY</th></tr></thead><tbody>{history.map((item) => <tr key={item.summary_date} className={date === item.summary_date ? 'current-row' : ''}><td><button className="table-date" onClick={() => { setDate(item.summary_date); void load(item.summary_date); }}>{item.summary_date}</button></td><td>{number(item.total_received)}</td><td>{number(item.total_pending_tickets)}</td><td>{number(item.total_p1)}</td><td>{item.incident_spike ? <span className="spike-tag">+{number(item.increase_percent)}%</span> : 'Stable'}</td><td>{number(item.sent_count)} / {number(item.recipient_count)} sent</td></tr>)}</tbody></table></div> : <p className="muted-copy history-empty">No saved reports yet.</p>}
      </section>
      <footer className="page-footer"><span>DATA SOURCE: POSTGRESQL / TIMEZONE: ASIA_HO_CHI_MINH</span><span>Generated by workflow 4</span></footer>
    </main>
  );
}