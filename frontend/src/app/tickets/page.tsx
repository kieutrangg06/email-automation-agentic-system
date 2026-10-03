'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { RefreshCw, Search, Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';

interface TriageLog {
  id: number;
  sender_email: string;
  subject: string;
  body_snippet: string;
  category: string;
  priority: string;
  sentiment: string;
  urgency_reason: string;
  sla_deadline: string;
  status: string;
  created_at: string;
}

export default function TriagePage() {
  const [logs, setLogs] = useState<TriageLog[]>([]);
  const [stats, setStats] = useState({ total: 0, p1Count: 0, techCount: 0, pendingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [priority, setPriority] = useState('All');
  const [selectedMail, setSelectedMail] = useState<TriageLog | null>(null);

  const loadData = async () => {
    try {
      const q = new URLSearchParams();
      if (category !== 'All') q.append('category', category);
      if (priority !== 'All') q.append('priority', priority);

      const [logsRes, statsRes] = await Promise.all([
        fetch(`http://localhost:4000/api/v1/triage/logs?${q.toString()}`),
        fetch('http://localhost:4000/api/v1/triage/stats'),
      ]);
      if (logsRes.ok) setLogs(await logsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [category, priority]);

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/triage/logs/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        loadData();
        if (selectedMail && selectedMail.id === id) {
          setSelectedMail({ ...selectedMail, status });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.subject.toLowerCase().includes(search.toLowerCase()) ||
      l.sender_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng Thư Tiếp Nhận</span>
            <div className="text-3xl font-extrabold mt-2 text-white">{stats.total}</div>
          </div>
          <div className="bg-slate-900 border border-rose-900/40 rounded-xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Sự Cố Khẩn (P1)</span>
            <div className="text-3xl font-extrabold mt-2 text-rose-500">{stats.p1Count}</div>
          </div>
          <div className="bg-slate-900 border border-amber-900/40 rounded-xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Bộ Phận Technical</span>
            <div className="text-3xl font-extrabold mt-2 text-amber-400">{stats.techCount}</div>
          </div>
          <div className="bg-slate-900 border border-blue-900/40 rounded-xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Chờ Điều Phối</span>
            <div className="text-3xl font-extrabold mt-2 text-blue-400">{stats.pendingCount}</div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm theo email, tiêu đề thư..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="All">Tất cả phòng ban</option>
              <option value="Technical">Technical</option>
              <option value="Sales">Sales</option>
              <option value="Finance">Finance</option>
              <option value="General">General</option>
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="All">Mọi mức độ ưu tiên</option>
              <option value="P1">P1 - Critical</option>
              <option value="P2">P2 - High</option>
              <option value="P3">P3 - Medium</option>
              <option value="P4">P4 - Low</option>
            </select>
            <button
              onClick={() => { setLoading(true); loadData(); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4">Thời Gian</th>
                <th className="py-3.5 px-4">Người Gửi</th>
                <th className="py-3.5 px-4">Tiêu Đề</th>
                <th className="py-3.5 px-4">Phòng Ban</th>
                <th className="py-3.5 px-4">Mức Độ</th>
                <th className="py-3.5 px-4">SLA Hạn Chót</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Không tìm thấy bản ghi email triage nào.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">{log.sender_email}</td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">{log.subject}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-blue-400 font-medium border border-slate-700">
                        {log.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md font-semibold ${
                        log.priority.includes('P1') ? 'bg-rose-950/70 text-rose-400 border border-rose-800/80' :
                        log.priority.includes('P2') ? 'bg-amber-950/70 text-amber-400 border border-amber-800/80' :
                        'bg-blue-950/70 text-blue-400 border border-blue-800/80'
                      }`}>
                        {log.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-amber-400 whitespace-nowrap">
                      {log.sla_deadline ? new Date(log.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '4h'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {log.status || 'PENDING'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedMail(log)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs mr-2 transition"
                      >
                        Chi tiết
                      </button>
                      {log.status !== 'RESOLVED' && (
                        <button
                          onClick={() => updateStatus(log.id, 'RESOLVED')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
                        >
                          Xong
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {selectedMail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-blue-400 font-mono font-semibold">{selectedMail.category} • {selectedMail.priority}</span>
                <h3 className="text-base font-bold text-white mt-1">{selectedMail.subject}</h3>
              </div>
              <button onClick={() => setSelectedMail(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="text-xs space-y-2.5 text-slate-300">
              <p><strong>Người gửi:</strong> {selectedMail.sender_email}</p>
              <p><strong>Đánh giá cảm xúc (Sentiment):</strong> {selectedMail.sentiment}</p>
              <p><strong>Lý do AI phân loại:</strong> {selectedMail.urgency_reason}</p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <strong className="block mb-1 text-slate-200">Trích xuất nội dung:</strong>
                <p className="text-slate-400 italic leading-relaxed">{selectedMail.body_snippet}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedMail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Đóng
              </button>
              {selectedMail.status !== 'RESOLVED' && (
                <button
                  onClick={() => updateStatus(selectedMail.id, 'RESOLVED')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                >
                  Đánh dấu hoàn thành
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}