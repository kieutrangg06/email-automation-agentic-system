'use client';

import { useEffect, useState } from 'react';

type Draft = {
	id: number;
	ticket_code: string | null;
	recipient_email: string;
	sender_name: string | null;
	original_subject: string;
	proposed_subject: string;
	proposed_body?: string;
	original_body?: string;
	confidence_score: number;
	status: string;
	can_resume?: boolean;
	created_at: string;
	knowledge_context?: Array<{ topic?: string; content?: string }>;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export default function ApprovalsPage() {
	const [drafts, setDrafts] = useState<Draft[]>([]);
	const [selected, setSelected] = useState<Draft | null>(null);
	const [filter, setFilter] = useState('PENDING_APPROVAL');
	const [search, setSearch] = useState('');
	const [reviewer, setReviewer] = useState('');
	const [subject, setSubject] = useState('');
	const [body, setBody] = useState('');
	const [editing, setEditing] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [toast, setToast] = useState('');

	async function loadDetail(id: number) {
		try {
			const response = await fetch(`${API}/email-drafts/${id}`, { cache: 'no-store' });
			if (!response.ok) throw new Error(`Draft request failed (${response.status})`);
			const detail = (await response.json()) as Draft;
			setSelected(detail);
			setSubject(detail.proposed_subject ?? '');
			setBody(detail.proposed_body ?? '');
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Could not load draft details.');
		}
	}

	async function loadDrafts(quiet = false) {
		if (!quiet) setLoading(true);
		setError('');
		try {
			const response = await fetch(`${API}/email-drafts`, { cache: 'no-store' });
			if (!response.ok) throw new Error(`API request failed (${response.status})`);
			const rows = (await response.json()) as Draft[];
			setDrafts(rows);
			const next = (selected && rows.find((row) => row.id === selected.id))
				?? rows.find((row) => row.status === 'PENDING_APPROVAL')
				?? rows[0]
				?? null;
			setSelected(next);
			if (next) await loadDetail(next.id);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Could not load drafts.');
		} finally {
			if (!quiet) setLoading(false);
		}
	}

	useEffect(() => {
		void loadDrafts();
		const interval = window.setInterval(() => void loadDrafts(true), 30000);
		return () => window.clearInterval(interval);
	}, []);

	async function submit(action: 'approve' | 'modify' | 'reject') {
		if (!selected || !reviewer.trim()) {
			setError('Enter the reviewer email before continuing.');
			return;
		}
		if (action === 'approve' && !window.confirm('Send this reply to the customer?')) return;
		if (action === 'reject' && !window.confirm('Close this draft without sending?')) return;
		setSaving(true);
		setError('');
		try {
			const payload = action === 'modify'
				? { reviewed_by: reviewer.trim(), subject, body }
				: { reviewed_by: reviewer.trim() };
			const response = await fetch(`${API}/email-drafts/${selected.id}/${action}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const result = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(result.message ?? `Action failed (${response.status})`);
			setToast(action === 'reject' ? 'Draft closed.' : 'Approval handed to the email workflow.');
			setEditing(false);
			await loadDrafts();
			window.setTimeout(() => setToast(''), 3500);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Action could not be completed.');
		} finally {
			setSaving(false);
		}
	}

	const visibleDrafts = drafts.filter((draft) => {
		const matchesFilter = filter === 'ALL'
			|| (filter === 'HIGH' && draft.confidence_score >= 80)
			|| (filter === 'LOW' && draft.confidence_score < 80)
			|| draft.status === filter;
		const needle = search.toLowerCase();
		return matchesFilter && `${draft.ticket_code ?? ''} ${draft.recipient_email} ${draft.proposed_subject}`.toLowerCase().includes(needle);
	});

	return (
		<main className="workspace">
			<header className="topbar">
				<a className="wordmark" href="/digest"><span className="mark">EA</span> OPERATIONS / AI MAIL</a>
				<nav aria-label="Main navigation"><a className="active" href="/approvals">Approvals</a><a href="/digest">Daily intelligence</a></nav>
				<span className="live-label"><i /> CONNECTED TO CORE API</span>
			</header>
			<section className="page-heading">
				<div><p className="eyebrow">CUSTOMER OPERATIONS / REVIEW QUEUE</p><h1>Email Approval Center</h1><p className="subheading">Review AI-drafted replies before they leave the inbox.</p></div>
				<button className="icon-button" onClick={() => void loadDrafts()} disabled={loading} aria-label="Refresh drafts" title="Refresh drafts">↻</button>
			</section>
			<section className="approval-layout">
				<aside className="queue-panel">
					<div className="queue-head"><div><span className="eyebrow">INBOX</span><strong>{drafts.filter((item) => item.status === 'PENDING_APPROVAL').length} <small>pending review</small></strong></div><span className="queue-count">{visibleDrafts.length.toString().padStart(2, '0')}</span></div>
					<label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ticket, email, subject" /></label>
					<div className="filter-row" aria-label="Draft filters">{[['PENDING_APPROVAL', 'Pending'], ['HIGH', 'High confidence'], ['LOW', 'Low confidence'], ['SENT', 'Sent'], ['ALL', 'All']].map(([value, label]) => <button key={value} className={filter === value ? 'filter active-filter' : 'filter'} onClick={() => setFilter(value)}>{label}</button>)}</div>
					<div className="draft-list">
						{loading ? <div className="queue-state">Loading drafts…</div> : error && drafts.length === 0 ? <div className="queue-state error-state">{error}<button onClick={() => void loadDrafts()}>Retry</button></div> : visibleDrafts.length === 0 ? <div className="queue-state"><span className="empty-glyph">—</span><strong>No matching drafts</strong><span>New drafts appear here after the reply workflow runs.</span></div> : visibleDrafts.map((draft) => <button key={draft.id} className={`draft-row ${selected?.id === draft.id ? 'selected' : ''}`} onClick={() => void loadDetail(draft.id)}>
							<div className="draft-row-top"><span className="ticket-code">{draft.ticket_code ?? `DRAFT-${draft.id}`}</span><span className={`status-pill ${draft.status.toLowerCase()}`}>{draft.status.replaceAll('_', ' ')}</span></div>
							<strong>{draft.sender_name || draft.recipient_email}</strong><span className="draft-email">{draft.recipient_email}</span><span className="draft-subject">{draft.proposed_subject || draft.original_subject}</span>
							<div className="draft-row-bottom"><span className={draft.confidence_score >= 80 ? 'confidence good' : 'confidence caution'}>{draft.confidence_score}% confidence</span><time>{new Date(draft.created_at).toLocaleString()}</time></div>
						</button>)}
					</div>
				</aside>
				<section className="detail-panel" aria-live="polite">
					{!selected ? <div className="detail-empty"><span className="detail-icon">✉</span><h2>Select a draft</h2><p>Choose an item from the queue to inspect its context and proposed reply.</p></div> : <>
						<div className="detail-top"><div><p className="eyebrow">DRAFT / {selected.id.toString().padStart(5, '0')}</p><h2>{selected.ticket_code || 'Unlinked email'}</h2></div><span className={`status-pill ${selected.status.toLowerCase()}`}>{selected.status.replaceAll('_', ' ')}</span></div>
						<div className="sender-strip"><span className="avatar">{(selected.sender_name || selected.recipient_email).slice(0, 1).toUpperCase()}</span><div><strong>{selected.sender_name || 'Customer'}</strong><span>{selected.recipient_email}</span></div><time>{new Date(selected.created_at).toLocaleString()}</time></div>
						<div className="original-message"><span className="eyebrow">CUSTOMER MESSAGE</span><strong>{selected.original_subject || 'No subject provided'}</strong><p>{selected.original_body || 'No original message body was stored.'}</p></div>
						<div className="confidence-band"><div><span className="eyebrow">MODEL CONFIDENCE</span><strong>{selected.confidence_score}<small>/100</small></strong></div><div className="confidence-track"><span style={{ width: `${Math.max(0, Math.min(100, selected.confidence_score))}%` }} /></div><span className={selected.confidence_score >= 80 ? 'confidence good' : 'confidence caution'}>{selected.confidence_score >= 80 ? 'HIGH' : 'REVIEW CAREFULLY'}</span></div>
						<label className="field-label">PROPOSED SUBJECT<input value={subject} onChange={(event) => setSubject(event.target.value)} readOnly={!editing} /></label>
						<label className="field-label">PROPOSED REPLY<textarea value={body} onChange={(event) => setBody(event.target.value)} readOnly={!editing} rows={8} /></label>
						<details className="knowledge-details"><summary>Knowledge context used <span>{selected.knowledge_context?.length ?? 0} sources</span></summary><div>{selected.knowledge_context?.length ? selected.knowledge_context.map((item, index) => <article key={`${item.topic}-${index}`}><strong>{item.topic || `Source ${index + 1}`}</strong><p>{item.content}</p></article>) : <p>No matching knowledge records were attached to this draft.</p>}</div></details>
						<div className="reviewer-row"><label className="field-label">REVIEWER EMAIL<input type="email" value={reviewer} onChange={(event) => setReviewer(event.target.value)} placeholder="name@company.com" /></label><span className="reviewer-note">Approval is routed through NestJS and n8n.</span></div>
						{selected.status === 'PENDING_APPROVAL' && !selected.can_resume && <p className="inline-error" role="status">This legacy draft has no active n8n approval wait. Submit the email through the active reply workflow to create a resumable draft.</p>}
						{error && <p className="inline-error" role="alert">{error}</p>}
						<div className="action-row">{editing ? <><button className="button secondary" onClick={() => { setEditing(false); setSubject(selected.proposed_subject); setBody(selected.proposed_body ?? ''); }}>Cancel edit</button><button className="button secondary" onClick={() => void submit('modify')} disabled={saving || !selected.can_resume}>{saving ? 'Submitting…' : 'Save & send'}</button></> : <><button className="button danger-quiet" onClick={() => void submit('reject')} disabled={saving || selected.status !== 'PENDING_APPROVAL'}>Close</button><button className="button secondary" onClick={() => setEditing(true)} disabled={saving || selected.status !== 'PENDING_APPROVAL' || !selected.can_resume}>Edit reply</button><button className="button primary" onClick={() => void submit('approve')} disabled={saving || selected.status !== 'PENDING_APPROVAL' || !selected.can_resume}>{saving ? 'Submitting…' : 'Approve & send'}</button></>}</div>
					</>}
				</section>
			</section>
			{toast && <div className="toast" role="status">{toast}</div>}
		</main>
	);
}
