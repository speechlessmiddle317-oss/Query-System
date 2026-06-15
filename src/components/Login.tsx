import React, { useState } from "react";
import { Eye, EyeOff, Lock, User, CheckCircle2 } from "lucide-react";
import { AppUser, UserRole, StarLevel } from "../types";
import { INITIAL_USERS } from "../utils/initialData";

interface LoginProps {
  onLoginSuccess: (user: AppUser) => void;
  addLog: (user: string, role: string, action: string, target: string, details: string) => void;
}

export default function Login({ onLoginSuccess, addLog }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const getRoleChinese = (role: UserRole, star?: StarLevel): string => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return "超級管理員";
      case UserRole.SYSTEM_ADMIN:
        return "系統管理員";
      case UserRole.OPERATOR:
        return `操作員 (${star}星級)`;
      case UserRole.ANALYST:
        return `分析員 (${star}星級)`;
      default:
        return "使用者";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!username.trim() || !password.trim()) {
      setError("請填寫帳號與密碼");
      return;
    }

    // Check localStorage users first, or fallback to INITIAL_USERS
    const storedUsers = localStorage.getItem("sub_users");
    const usersList = storedUsers ? JSON.parse(storedUsers) : INITIAL_USERS;

    const userRecord = usersList[username.trim()];

    if (userRecord && userRecord.password === password) {
      const appUser: AppUser = {
        username: userRecord.username,
        role: userRecord.role,
        starLevel: userRecord.starLevel,
        assignedTables: userRecord.assignedTables || []
      };

      setSuccessMsg("登入成功！正為您載入後台...");
      addLog(
        appUser.username,
        getRoleChinese(appUser.role, appUser.starLevel),
        "用戶登入",
        "帳號權限驗證",
        `成功登入系統，勾選保持登入: ${keepLoggedIn ? "是" : "否"}`
      );

      setTimeout(() => {
        onLoginSuccess(appUser);
      }, 800);
    } else {
      setError("帳號或密碼錯誤，請重新確認");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-8" id="login-container">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white text-center">
          <div className="inline-flex p-3 bg-white/10 rounded-xl mb-4">
            <Lock className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">問卷後台管理系統</h2>
          <p className="text-slate-300 text-sm mt-2">請登入以存取系統報表、查詢子系統與參數設定</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded text-rose-700 text-sm flex items-start space-x-2 animate-pulse">
              <span className="font-bold">❌ 錯誤：</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded text-emerald-700 text-sm flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase block">
              登入帳號
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例如: super_admin"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-800 placeholder-slate-400 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase block">
              安全密碼
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-800 placeholder-slate-400 transition-all outline-none"
              />
              <button
                id="toggle-password-visibility"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                title={showPassword ? "隱藏密碼" : "顯示密碼"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-start space-x-2.5 cursor-pointer select-none group">
              <input
                id="keep-logged-in-checkbox"
                type="checkbox"
                checked={keepLoggedIn}
                onChange={(e) => setKeepLoggedIn(e.target.checked)}
                className="w-4 h-4 rounded mt-0.5 border-slate-300 text-slate-900 focus:ring-slate-900 focus:ring-offset-0 transition-all cursor-pointer"
              />
              <div className="flex flex-col text-left">
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                  保持登入
                </span>
                <span className="text-xs text-rose-500 font-semibold mt-0.5">
                  (公用電腦 勿勾)
                </span>
              </div>
            </label>
          </div>

          <button
            id="login-submit-button"
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-150 cursor-pointer text-center"
          >
            驗證並登入
          </button>
        </form>

        <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            預設體驗帳號：<code className="text-rose-600 font-bold font-mono">super_admin</code> / <code className="text-slate-600 font-medium font-mono">123</code> (超級管理員)
          </p>
          <p className="text-xs text-slate-400 mt-1">
            操作員: <code className="font-mono text-blue-600">operator3</code> (123) / 分析員: <code className="font-mono text-blue-600">analyst3</code> (123)
          </p>
        </div>
      </div>
    </div>
  );
}
