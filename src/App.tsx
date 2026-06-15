import React, { useState, useEffect } from "react";
import { Questionnaire, SurveyResponse, AppUser, AuditLog, PromotionApplication, UserRole } from "./types";
import { INITIAL_QUESTIONNAIRES, INITIAL_RESPONSES, INITIAL_AUDIT_LOGS, INITIAL_PROMOTIONS } from "./utils/initialData";
import Login from "./components/Login";
import QuestionnaireFill from "./components/QuestionnaireFill";
import QuerySystem from "./components/QuerySystem";
import Dashboard from "./components/Dashboard";
import { 
  ClipboardList, 
  Settings, 
  ShieldCheck, 
  Eye, 
  PenTool, 
  Search, 
  Heart, 
  HelpCircle, 
  Users, 
  FileSpreadsheet, 
  Compass, 
  Activity,
  LogOut,
  Calendar,
  Lock,
  Smartphone
} from "lucide-react";

export default function App() {
  // Sync state with localStorage to persist surveys and replies durably
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [promotions, setPromotions] = useState<PromotionApplication[]>([]);
  
  // Current logged in user (undefined if guest)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  // Router simulation using hash
  const [hash, setHash] = useState(window.location.hash);

  // General app state
  const [selectedSurveyToFill, setSelectedSurveyToFill] = useState<Questionnaire | null>(null);
  const [selectedQuerySystem, setSelectedQuerySystem] = useState<{ survey: Questionnaire, config: any } | null>(null);

  // Initialize data on mount
  useEffect(() => {
    // Questionnaires
    const savedSurveys = localStorage.getItem("sub_surveys");
    if (savedSurveys) {
      setQuestionnaires(JSON.parse(savedSurveys));
    } else {
      localStorage.setItem("sub_surveys", JSON.stringify(INITIAL_QUESTIONNAIRES));
      setQuestionnaires(INITIAL_QUESTIONNAIRES);
    }

    // Responses
    const savedResponses = localStorage.getItem("sub_responses");
    if (savedResponses) {
      setResponses(JSON.parse(savedResponses));
    } else {
      localStorage.setItem("sub_responses", JSON.stringify(INITIAL_RESPONSES));
      setResponses(INITIAL_RESPONSES);
    }

    // Logs
    const savedLogs = localStorage.getItem("sub_logs");
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    } else {
      localStorage.setItem("sub_logs", JSON.stringify(INITIAL_AUDIT_LOGS));
      setLogs(INITIAL_AUDIT_LOGS);
    }

    // Promotions
    const savedPromos = localStorage.getItem("sub_promotions");
    if (savedPromos) {
      setPromotions(JSON.parse(savedPromos));
    } else {
      localStorage.setItem("sub_promotions", JSON.stringify(INITIAL_PROMOTIONS));
      setPromotions(INITIAL_PROMOTIONS);
    }

    // Auth keep-logged-in checks
    const keepUser = localStorage.getItem("sub_logged_user");
    if (keepUser) {
      setCurrentUser(JSON.parse(keepUser));
    }

    // Hash listener
    const handleHashChange = () => {
      setHash(window.location.hash);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Write changes to localStorage when states update
  const handleUpdateQuestionnaires = (updated: Questionnaire[]) => {
    setQuestionnaires(updated);
    localStorage.setItem("sub_surveys", JSON.stringify(updated));
  };

  const handleUpdateResponses = (updated: SurveyResponse[]) => {
    setResponses(updated);
    localStorage.setItem("sub_responses", JSON.stringify(updated));
  };

  const handleUpdateLogs = (updated: AuditLog[]) => {
    setLogs(updated);
    localStorage.setItem("sub_logs", JSON.stringify(updated));
  };

  const handleUpdatePromotions = (updated: PromotionApplication[]) => {
    setPromotions(updated);
    localStorage.setItem("sub_promotions", JSON.stringify(updated));
  };

  const addLog = (user: string, role: string, action: string, target: string, details: string) => {
    const newLogItem: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      user,
      role,
      action,
      target,
      details
    };
    const newLogs = [newLogItem, ...logs];
    handleUpdateLogs(newLogs);
  };

  const handleLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    // Persist session if "keep-logged-in" is checked.
    // In our Login.tsx we trigger this - simplified check here:
    // If keep-logged-in checked was true, we store in localStorage.
    localStorage.setItem("sub_logged_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    if (currentUser) {
      addLog(
        currentUser.username,
        currentUser.role,
        "用戶登出",
        "帳號權限宣告",
        "安全登出後台管理系統"
      );
    }
    setCurrentUser(null);
    localStorage.removeItem("sub_logged_user");
    window.location.hash = "";
  };

  const handleSurveySubmit = (newResp: Omit<SurveyResponse, "id" | "submittedAt">) => {
    const fresh: SurveyResponse = {
      ...newResp,
      id: `resp-${Math.floor(100 + Math.random() * 900)}-${Date.now().toString().slice(-4)}`,
      submittedAt: new Date().toISOString().replace("T", " ").substring(0, 19)
    };
    const updated = [fresh, ...responses];
    handleUpdateResponses(updated);

    // Get survey title
    const sNode = questionnaires.find(q => q.id === newResp.surveyId);
    
    addLog(
      "一般填答市民",
      "使用者",
      "填寫問卷提交",
      sNode ? sNode.title : newResp.surveyId,
      `成功填寫問卷，產生數據憑證 ${fresh.id}。電子信箱/填寫人: ${fresh.submittedBy}`
    );
  };

  const handleUpdateResponseInQuerySystem = (updated: SurveyResponse) => {
    const nextAnswers = responses.map(r => r.id === updated.id ? updated : r);
    handleUpdateResponses(nextAnswers);

    const sNode = questionnaires.find(q => q.id === updated.surveyId);

    addLog(
      currentUser?.username || "未知查詢人員",
      currentUser?.role || "查詢代用職位",
      "線上修改更正",
      sNode ? sNode.title : updated.surveyId,
      `透過稽核查詢系統線上即時更正了問卷數據編號: ${updated.id} 內之受管制答案集。`
    );
  };

  // Parsing current route based on Hash router structure
  const parseRoute = () => {
    // 1. Direct filling route: #fill/{surveyId}
    if (hash.startsWith("#fill/")) {
      const surveyId = hash.replace("#fill/", "");
      const matched = questionnaires.find(q => q.id === surveyId);
      if (matched) {
        return (
          <QuestionnaireFill
            survey={matched}
            onSubmit={handleSurveySubmit}
            isDirectLink={true}
          />
        );
      }
      return (
        <div className="text-center p-12 bg-white rounded-2xl border max-w-md mx-auto my-12 shadow-sm">
          <p className="text-rose-500 font-bold mb-4">⚠️ 問卷編號錯誤</p>
          <p className="text-sm text-slate-500">找不到指定的問卷直達填寫頁面，本問卷可能已被管理員下架移除。</p>
          <a href="#" className="inline-block mt-6 text-xs text-blue-600 font-bold hover:underline">返回首頁大廳</a>
        </div>
      );
    }

    // 2. Direct query route: #query/{surveyId}/{queryId}
    if (hash.startsWith("#query/")) {
      const queryParams = hash.replace("#query/", "").split("/");
      const surveyId = queryParams[0];
      const queryId = queryParams[1];

      const matchedSurvey = questionnaires.find(q => q.id === surveyId);
      const matchedQueryConfig = matchedSurvey?.querySystems.find(qs => qs.id === queryId);

      if (matchedSurvey && matchedQueryConfig) {
        return (
          <QuerySystem
            survey={matchedSurvey}
            queryConfig={matchedQueryConfig}
            allResponses={responses}
            onUpdateResponse={handleUpdateResponseInQuerySystem}
            isDirectLink={true}
          />
        );
      }
      return (
        <div className="text-center p-12 bg-white rounded-2xl border max-w-md mx-auto my-12 shadow-sm">
          <p className="text-rose-500 font-bold mb-4">⚠️ 查詢通道失效</p>
          <p className="text-sm text-slate-500">此子查詢系統直達網址可能不正確，或該子系統已被管理端卸載。</p>
          <a href="#" className="inline-block mt-6 text-xs text-blue-600 font-bold hover:underline">返回首頁大廳</a>
        </div>
      );
    }

    // 3. Admin dash state `#admin`
    if (hash === "#admin") {
      if (currentUser) {
        return (
          <Dashboard
            currentUser={currentUser}
            questionnaires={questionnaires}
            responses={responses}
            logs={logs}
            promotions={promotions}
            onUpdateQuestionnaires={handleUpdateQuestionnaires}
            onUpdateResponses={handleUpdateResponses}
            onUpdatePromotions={handleUpdatePromotions}
            onUpdateLogList={handleUpdateLogs}
            onLogout={handleLogout}
            onUpdateCurrentUser={(user) => {
              setCurrentUser(user);
              localStorage.setItem("sub_logged_user", JSON.stringify(user));
            }}
            onSelectQuerySystem={(survey, config) => {
              setSelectedQuerySystem({ survey, config });
              window.location.hash = `#query/${survey.id}/${config.id}`;
            }}
          />
        );
      }
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          addLog={addLog}
        />
      );
    }

    // 4. Default: Lobby "問卷填表及查詢大廳" (Interactive Home)
    return (
      <div className="space-y-8" id="default-lobby-grid">
        
        {/* Welcome Section */}
        <section className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl md:p-12">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl" />
          
          <div className="relative max-w-xl space-y-4">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/10 rounded-full text-xs text-amber-300 font-semibold uppercase tracking-wider backdrop-blur-md">
              <Compass className="w-3.5 h-3.5" />
              <span>全台學術暨市民滿意度調查平台</span>
            </div>
            
            <h1 className="text-3xl font-extrabold tracking-tight md:text-3xl leading-snug">
              公開透明的反饋、更正與統計查核通道。
            </h1>
            
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              本平台致力於提供市民與學子公平、私密且合規的安全反饋空間。您可以在此填寫問卷，
              或是使用特邀代表指派的單一通道「專屬直達網址」安全查詢並即時進行線上資訊修正！
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href="#admin"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1"
              >
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>登入管理員與分級後台 (RBAC)</span>
              </a>
            </div>
          </div>
        </section>

        {/* Home main split view */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left panel: active surveys list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                <PenTool className="w-5 h-5 text-blue-600" />
                <span>開放進行中之統計問卷填寫</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                共 {questionnaires.length} 張問卷在線
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {questionnaires.map((q) => (
                <div 
                  key={q.id} 
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left"
                >
                  <div className="space-y-1.5 flex-1 max-w-xl">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
                      <span className="text-[9px] bg-blue-50 text-blue-700 font-extrabold px-1.5 py-0.5 rounded font-mono">
                        問卷ID: {q.id}
                      </span>
                      {q.passwordRequired && (
                        <span className="text-[9px] bg-rose-50 text-rose-600 font-bold px-1.5 py-0.5 rounded flex items-center">
                          <Lock className="w-3 h-3 mr-1" />
                          密碼防護開啟
                        </span>
                      )}
                      {q.emailNotificationEnabled && (
                        <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded">
                          自動電郵憑證
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-800 leading-snug">{q.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{q.description}</p>
                  </div>

                  <div className="shrink-0 flex items-center space-x-2">
                    <button
                      id={`fill-survey-btn-${q.id}`}
                      onClick={() => {
                        setSelectedSurveyToFill(q);
                        window.location.hash = `#fill/${q.id}`;
                      }}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                    >
                      進入填報填寫表單
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: Sub-query channels list */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-md font-bold text-slate-800 flex items-center space-x-2">
                <Search className="w-4.5 h-4.5 text-amber-500" />
                <span>專門稽核：獨立子查詢通道</span>
              </h2>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/60 text-left space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                不同問卷配有專屬密碼的「獨立查詢窗口」，點選進入對應的窗口僅可查詢、線上修改該問卷數據：
              </p>

              <div className="space-y-2.5">
                {questionnaires.flatMap(q => q.querySystems.map(sys => ({ ...sys, parentSurvey: q }))).map((sysItem) => (
                  <div key={sysItem.id} className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between gap-2">
                    <div>
                      <span className="text-[9px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                        通道ID: {sysItem.id}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 mt-1 leading-tight">{sysItem.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-1.5 truncate">所屬: {sysItem.parentSurvey.title}</p>
                    </div>
                    
                    <button
                      id={`home-go-query-${sysItem.id}`}
                      onClick={() => {
                        setSelectedQuerySystem({ survey: sysItem.parentSurvey, config: sysItem });
                        window.location.hash = `#query/${sysItem.parentSurvey.id}/${sysItem.id}`;
                      }}
                      className="w-full text-center py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded duration-150 cursor-pointer"
                    >
                      經授權通道 進入自主查詢更正
                    </button>
                  </div>
                ))}

                {questionnaires.every(q => q.querySystems && q.querySystems.length === 0) && (
                  <p className="text-xs text-slate-400 italic text-center py-4">目前系統管理端尚無制定任何子查詢系統。</p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-left space-y-2.5">
              <span className="text-xs font-bold text-blue-900 flex items-center">
                <Smartphone className="w-4 h-4 mr-1 text-blue-600" />
                <span>完美行動流暢響應式設計</span>
              </span>
              <p className="text-[11px] text-blue-750 leading-relaxed">
                本系統原生符合響應式佈局規格，使用者不論在手機端、平板電腦或是寬型電腦桌面，皆能完美載入、
                流暢直覺地填寫所有題型與查詢。
              </p>
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800" id="global-layout-wrapper">
      
      {/* Universal Top Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-black text-amber-400 text-sm">
              問
            </div>
            <span className="font-extrabold text-sm text-slate-800 tracking-tight">問卷暨查詢管理子系統 (繁體中文版)</span>
          </a>

          <div className="flex items-center space-x-4">
            <a 
              href="#"
              className="text-xs font-bold text-slate-500 hover:text-slate-800 py-1.5 px-3 rounded-lg hover:bg-slate-50"
            >
              問卷大廳
            </a>
            <a 
              href="#admin"
              className="text-xs font-bold text-slate-500 hover:text-slate-800 py-1.5 px-3 rounded-lg hover:bg-slate-50 flex items-center"
            >
              <Users className="w-3.5 h-3.5 mr-1" />
              <span>後台登入/管理</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Dynamic Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6" id="applet-main-viewport">
        {parseRoute()}
      </main>

      {/* Universal Sticky Foot */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 本問卷暨獨立隔離子查詢稽核系統. 原生支援行動裝置響應式設計.</p>
          <div className="flex space-x-4">
            <span className="hover:text-slate-600">伺服器連線：正常 ●</span>
            <span className="hover:text-slate-600">權限控制：RBAC 精細化分級啟用</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
