'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { LifeBuoy, RefreshCw, Search, CheckCircle2, UserCheck, AlertTriangle } from 'lucide-react';

interface Ticket {
  id: number;
  ticket_code: string;
  sender_email: string;
  title: string;
  description: string;
  summary: string;
  category: string;
  priority: string;
  assigned_to: string;
  agent_email: string;
  status: string;
  first_response_sla: string;
  created_at: string;
}

export default function HelpdeskPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('All');
  const [status, setStatus] = useState('All');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const fetchTickets = async () => {
    try {
      const q = new URLSearchParams();
      if (status !== 'All') q.append('status', status);
      if (priority !== 'All') q.append('priority', priority);
      const res = await fetch(`http://localhost:4000/api/v1/triage/tickets?${q.toString()}`);
      if (res.ok) setTickets(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTickets();
    const interval = setInterval(fetchTickets, 4000);
    return () => clearInterval(interval);
  }, [priority, status]);

  const handleResolve = async (code: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/triage/tickets/${code}/resolve`, {
        method: 'PATCH',
      });
      if (res.ok) {
        fetchTickets();
        if (selectedTicket && selectedTicket.ticket_code === code) {
          setSelectedTicket({ ...selectedTicket, status: 'RESOLVED' });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredTickets = tickets.filter(
    (t) =>
      t.ticket_code.toLowerCase().includes(search.toLowerCase()) ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.sender_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm theo mã ticket, tiêu đề..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="All">Tất cả mức độ</option>
              <option value="P1">P1 - Khẩn cấp</option>
              <option value="P2">P2 - Cao</option>
              <option value="P3">P3 - Trung bình</option>
              <option value="P4">P4 - Thấp</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="All">Tất cả trạng thái</option>
              <option value="OPEN">Đang mở (OPEN)</option>
              <option value="RESOLVED">Đã giải quyết (RESOLVED)</option>
            </select>
            <button
              onClick={() => { setLoading(true); fetchTickets(); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4">Mã Ticket</th>
                <th className="py-3.5 px-4">Khách Hàng</th>
                <th className="py-3.5 px-4">Tiêu Đề</th>
                <th className="py-3.5 px-4">Phòng Ban</th>
                <th className="py-3.5 px-4">Mức Độ</th>
                <th className="py-3.5 px-4">Kỹ Thuật Viên</th>
                <th className="py-3.5 px-4">SLA Hạn Chót</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Chưa có ticket nào được kích hoạt từ Luồng 2.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-400">{t.ticket_code}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">{t.sender_email}</td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">{t.title}</td>
                    <td className="py-3.5 px-4 text-slate-400">{t.category}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md font-semibold ${
                        t.priority.includes('P1') ? 'bg-rose-950/70 text-rose-400 border border-rose-800/80' :
                        t.priority.includes('P2') ? 'bg-amber-950/70 text-amber-400 border border-amber-800/80' :
                        'bg-blue-950/70 text-blue-400 border border-blue-800/80'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t.assigned_to}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {t.first_response_sla ? new Date(t.first_response_sla).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '2h'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-blue-950 text-blue-400 border border-blue-800'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedTicket(t)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs mr-2 transition"
                      >
                        Chi tiết
                      </button>
                      {t.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleResolve(t.ticket_code)}
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

      {/* Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-blue-400">{selectedTicket.ticket_code}</span>
                <h3 className="text-base font-bold text-white mt-1">{selectedTicket.title}</h3>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="text-xs space-y-2.5 text-slate-300">
              <p><strong>Khách hàng:</strong> {selectedTicket.sender_email}</p>
              <p><strong>Chuyên viên tiếp nhận:</strong> {selectedTicket.assigned_to} ({selectedTicket.agent_email})</p>
              <div className="p-3 bg-blue-950/30 rounded-xl border border-blue-900/40">
                <strong className="block mb-1 text-blue-300">AI Tóm tắt sự cố (Gemini):</strong>
                <p className="text-slate-300 whitespace-pre-line leading-relaxed">{selectedTicket.summary || 'Không có tóm tắt'}</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <strong className="block mb-1 text-slate-200">Nội dung gốc:</strong>
                <p className="text-slate-400 italic leading-relaxed">{selectedTicket.description}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Đóng
              </button>
              {selectedTicket.status !== 'RESOLVED' && (
                <button
                  onClick={() => handleResolve(selectedTicket.ticket_code)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                >
                  Giải quyết xong
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}