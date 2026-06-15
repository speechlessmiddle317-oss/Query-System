import React, { useState } from "react";
import { AuditLog } from "../types";
import { Search, ListFilter, Trash2, Calendar, ClipboardList } from "lucide-react";

interface LogViewProps {
  logs: AuditLog[];
  onClearLogs?: () => void;
  showAdminPrivileges: boolean;
}

export default function LogView({ logs, onClearLogs, showAdminPrivileges }: LogViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "ALL" || log.role.includes(roleFilter);

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-4" id="system-audit-log-view">
      <div className="bg-white rounded-2xl border border-slate-100 shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">系統介面操作稽核日誌</h2>
          </div>
          {onClearLogs && showAdminPrivileges && (
            <button
              id="clear-logs-btn"
              onClick={onClearLogs}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs rounded-lg transition-colors flex items-center space-x-1 border border-rose-100 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清除所有日誌紀錄</span>
            </button>
          )}
        </div>

        {/* Searching & Filtering */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="log-search-term"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋操作者、操作行為、說明或目標..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700"
            />
          </div>

          <div className="flex items-center space-x-2 min-w-[160px]">
            <ListFilter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              id="log-role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-700"
            >
              <option value="ALL">全部權限階級</option>
              <option value="超級管理員">超級管理員</option>
              <option value="系統管理員">系統管理員</option>
              <option value="操作員">操作員</option>
              <option value="分析員">分析員</option>
              <option value="系統環境">系統/一般使用者</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                <th className="py-3 px-4">時間戳記</th>
                <th className="py-3 px-4">操作人員</th>
                <th className="py-3 px-4">權限階級</th>
                <th className="py-3 px-4">操作行為</th>
                <th className="py-3 px-4">目標對象</th>
                <th className="py-3 px-4">變更詳細描述</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-mono">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-3 px-4 text-indigo-700 font-semibold">{log.user}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.role === "超級管理員" 
                          ? "bg-slate-900 text-slate-100" 
                          : log.role === "系統管理員"
                          ? "bg-indigo-100 text-indigo-800"
                          : log.role.includes("操作員")
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {log.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-semibold">{log.action}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{log.target}</td>
                    <td className="py-3 px-4 text-slate-600 font-sans max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 font-sans text-xs">
                    沒有找到符合篩選條件的日誌記錄
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-sans">
          <span>共 {logs.length} 筆原始日誌 / 篩選出 {filteredLogs.length} 筆</span>
          <span className="flex items-center text-[10px]"><Calendar className="w-3.5 h-3.5 mr-1" /> 自動即時儲存於本機</span>
        </div>
      </div>
    </div>
  );
}
