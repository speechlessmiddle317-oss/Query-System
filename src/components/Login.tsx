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

  // Register state
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const cleanUsername = regUsername.trim().toLowerCase();
    const cleanPassword = regPassword.trim();
    const cleanConfirm = regConfirmPassword.trim();

    if (!cleanUsername) {
      setError("請填寫您想要註冊的帳號名稱。");
      return;
    }
    if (cleanUsername.length < 3) {
      setError("帳號名稱長度必須至少為 3 個字元。");
      return;
    }
    if (!cleanPassword) {
      setError("請填寫登入安全密碼。");
      return;
    }
    if (cleanPassword !== cleanConfirm) {
      setError("「密碼」與「確認密碼」不相同，請重新核對。");
      return;
    }

    const storedUsers = localStorage.getItem("sub_users");
    let usersList = storedUsers ? JSON.parse(storedUsers) : { ...INITIAL_USERS };

    if (usersList[cleanUsername]) {
      setError(`⚠️ 帳號名「${cleanUsername}」已被註冊，請換一個更酷的名稱！`);
      return;
    }

    // Register user
    const brandNewUser = {
      username: cleanUsername,
      password: cleanPassword,
      role: UserRole.RESPONDENT,
      starLevel: 1, // 起始 1 階
      respondentPoints: 0,
      respondentSubRank: 1,
      assignedTables: []
    };

    usersList[cleanUsername] = brandNewUser;
    localStorage.setItem("sub_users", JSON.stringify(usersList));

    addLog(
      cleanUsername,
      "一般填答市民",
      "市民自主註冊帳號",
      cleanUsername,
      `新答題人 [${cleanUsername}] 通過登入端完成自主註冊加入平台，起始狀態為黑鐵 (1階/0點)。`
    );

    setSuccessMsg("🎉 註冊成功！系統已將您自動登入...");

    const appUser: AppUser = {
      username: cleanUsername,
      role: UserRole.RESPONDENT,
      starLevel: 1,
      assignedTables: [],
      respondentPoints: 0,
      respondentSubRank: 1,
    };

    if (keepLoggedIn) {
      localStorage.setItem("sub_logged_user", JSON.stringify(appUser));
    }

    setTimeout(() => {
      onLoginSuccess(appUser);
    }, 1200);
  };

  const getRoleChinese = (role: UserRole, star?: StarLevel): string => {
    switch (role) {
      case UserRole.WEBMASTER:
        return "系統站主";
      case UserRole.SUPER_ADMIN:
        return "超級管理員";
      case UserRole.SYSTEM_ADMIN:
        return "系統管理員";
      case UserRole.OPERATOR:
        return `操作員 (${star}星級)`;
      case UserRole.ANALYST:
        return `分析員 (${star}星級)`;
      case UserRole.QUESTION_CREATOR:
        return `出題人 (${star || 1}階)`;
      case UserRole.RESPONDENT:
        return `答題人 (${star || 1}階)`;
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
    let usersList = storedUsers ? JSON.parse(storedUsers) : { ...INITIAL_USERS };

    // Self-healing check: Ensure at least one webmaster exists in the database
    const hasWebmaster = Object.values(usersList).some((u: any) => u?.role === UserRole.WEBMASTER);
    if (!hasWebmaster) {
      usersList["webmaster"] = {
        username: "webmaster",
        password: "123",
        role: UserRole.WEBMASTER,
        assignedTables: []
      };
      localStorage.setItem("sub_users", JSON.stringify(usersList));
    }

    const userRecord = usersList[username.trim()];

    if (userRecord && userRecord.password === password) {
      if (userRecord.banned) {
        if (userRecord.bannedReason === "SURVEY_ISSUE" || (userRecord.role === UserRole.QUESTION_CREATOR && userRecord.bannedReason !== "CHEAT")) {
          setError("❌ 您的帳號因問卷問題而被封禁停用，目前無法登入系統！如沒有嫌疑，請聯絡上級管理人員進行申訴。");
          return;
        }
        if (userRecord.bannedReason === "CHEAT") {
          setError("❌ 您的帳號因有開掛/作弊嫌疑而被封禁停用，目前無法登入系統！如沒有嫌疑，請聯絡上級管理人員進行申訴。");
          return;
        }
        const bannerRole = userRecord.bannedBy || UserRole.WEBMASTER;
        let bannerRoleName = "系統站主";
        if (bannerRole === UserRole.WEBMASTER) {
          bannerRoleName = "系統站主";
        } else if (bannerRole === UserRole.SUPER_ADMIN) {
          bannerRoleName = "超級管理員";
        } else if (bannerRole === UserRole.SYSTEM_ADMIN) {
          bannerRoleName = "系統管理員";
        } else if (bannerRole === UserRole.OPERATOR) {
          bannerRoleName = "操作員";
        } else if (bannerRole === UserRole.ANALYST) {
          bannerRoleName = "分析員";
        } else if (bannerRole === UserRole.QUESTION_CREATOR) {
          bannerRoleName = "出題人";
        } else if (bannerRole === UserRole.RESPONDENT) {
          bannerRoleName = "答題人";
        }
        setError(`❌ 您的帳號已被"${bannerRoleName}"封禁停用，目前無法登入系統！如有疑問請聯絡上級管理人員。`);
        return;
      }

      const appUser: AppUser = {
        username: userRecord.username,
        role: userRecord.role,
        starLevel: userRecord.starLevel,
        assignedTables: userRecord.assignedTables || [],
        respondentPoints: userRecord.respondentPoints || 0,
        respondentSubRank: userRecord.respondentSubRank || 1,
        canManageTrivia: !!userRecord.canManageTrivia,
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
    <div className="w-full max-w-md mx-auto my-8 font-sans" id="login-container">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
        {/* HEADER SECTION */}
        <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white text-center">
          <div className="inline-flex p-3 bg-white/10 rounded-xl mb-4">
            <Lock className="w-8 h-8 text-blue-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isRegisterMode ? "與市民一起作答學習" : "問卷後台管理系統"}
          </h2>
          <p className="text-slate-300 text-xs mt-2">
            {isRegisterMode 
              ? "自主註冊全新的答題人帳戶，進入闖關答題區並累積個人積分與等階特權" 
              : "請登入以存取系統報表、查詢子系統與參數設定"}
          </p>
        </div>

        {/* ERROR / SUCCESS FEEDBACK */}
        <div className="px-8 pt-6">
          {error && (
            <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-lg text-rose-700 text-xs flex items-start space-x-2 animate-pulse">
              <span className="font-bold shrink-0">❌ 錯誤：</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-lg text-emerald-700 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 animate-bounce" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* REGISTER/LOGIN FORM */}
        {isRegisterMode ? (
          <form onSubmit={handleRegisterSubmit} className="p-8 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 tracking-wider uppercase block">
                註冊新帳號
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  id="reg-username"
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="請輸入您的新帳名 (英文/數字)"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-800 placeholder-slate-400 transition-all outline-none text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 tracking-wider uppercase block">
                安全密碼
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="請設定登入安全密碼"
                  className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-800 placeholder-slate-400 transition-all outline-none text-xs"
                />
                <button
                  id="toggle-reg-password"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 tracking-wider uppercase block">
                確認安全密碼
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-405">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="reg-confirm-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="請再次輸入並確認密碼"
                  className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-800 placeholder-slate-400 transition-all outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-start space-x-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={keepLoggedIn}
                  onChange={(e) => setKeepLoggedIn(e.target.checked)}
                  className="w-4 h-4 rounded mt-0.5 border-slate-300 text-slate-900 focus:ring-slate-900 focus:ring-offset-0 transition-all cursor-pointer"
                />
                <div className="flex flex-col text-left">
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                    註冊完成後保持登入
                  </span>
                </div>
              </label>
            </div>

            <div className="space-y-3 pt-2">
              <button
                id="register-submit-button"
                type="submit"
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-150 cursor-pointer text-center text-xs"
              >
                📝 立即註冊並進入答題大廳
              </button>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setIsRegisterMode(false);
                }}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-605 font-bold rounded-xl transition-all duration-150 cursor-pointer text-center text-xs"
              >
                🔙 已有帳號？返回登入
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase block">
                登入帳號
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-404">
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
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-404">
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

            <div className="space-y-3">
              <button
                id="login-submit-button"
                type="submit"
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-150 cursor-pointer text-center"
              >
                驗證並登入
              </button>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setIsRegisterMode(true);
                  setRegUsername("");
                  setRegPassword("");
                  setRegConfirmPassword("");
                }}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all duration-150 cursor-pointer text-center text-xs border border-slate-205"
              >
                🆕 沒有帳號？點此免費註冊市民帳戶
              </button>
            </div>
          </form>
        )}

        {/* BOTTOM FOOTER */}
        <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-500 leading-normal">
            {isRegisterMode 
              ? "自主註冊者之等級積分完全受站主、超級管理權限控制。請勿註冊不雅字眼帳名。" 
              : "請輸入由系統站主或管理員配置的帳號密碼，或使用市民註冊功能建立答題市民。"}
          </p>
        </div>
      </div>
    </div>
  );
}
