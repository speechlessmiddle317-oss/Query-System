import React, { useState, useEffect } from "react";
import { Questionnaire, SurveyResponse, AppUser, AuditLog, PromotionApplication, UserRole } from "./types";
import { INITIAL_QUESTIONNAIRES, INITIAL_RESPONSES, INITIAL_AUDIT_LOGS, INITIAL_PROMOTIONS } from "./utils/initialData";
import {
  fetchUsersFromFirestore,
  saveAllUsersToFirestore,
  saveUserToFirestore,
  fetchQuestionnairesFromFirestore,
  saveAllQuestionnairesToFirestore,
  fetchResponsesFromFirestore,
  saveAllResponsesToFirestore,
  saveResponseToFirestore,
  fetchAuditLogsFromFirestore,
  saveAllAuditLogsToFirestore,
  saveAuditLogToFirestore,
  fetchPromotionsFromFirestore,
  saveAllPromotionsToFirestore,
  savePromotionToFirestore
} from "./utils/firebaseDb";
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
  Smartphone,
  CheckCircle2,
  Globe2,
  MessagesSquare,
  ArrowRight,
  BarChart3,
  KeyRound
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

    // Firestore Integration: Fetch authoritative data on background load
    const syncAuthoritativeData = async () => {
      try {
        // 1. Questionnaire sync
        const fsQs = await fetchQuestionnairesFromFirestore();
        if (fsQs.length === 0) {
          await saveAllQuestionnairesToFirestore(questionnaires.length > 0 ? questionnaires : INITIAL_QUESTIONNAIRES);
        } else {
          setQuestionnaires(fsQs);
          localStorage.setItem("sub_surveys", JSON.stringify(fsQs));
        }

        // 2. Responses sync
        const fsResponses = await fetchResponsesFromFirestore();
        if (fsResponses.length === 0) {
          await saveAllResponsesToFirestore(responses.length > 0 ? responses : INITIAL_RESPONSES);
        } else {
          setResponses(fsResponses);
          localStorage.setItem("sub_responses", JSON.stringify(fsResponses));
        }

        // 3. User account directory sync
        const fsUsers = await fetchUsersFromFirestore();
        if (Object.keys(fsUsers).length === 0) {
          const localUsersRaw = localStorage.getItem("sub_users");
          const { INITIAL_USERS } = await import("./utils/initialData");
          const usersToSeed = localUsersRaw ? JSON.parse(localUsersRaw) : INITIAL_USERS;
          await saveAllUsersToFirestore(usersToSeed);
        } else {
          localStorage.setItem("sub_users", JSON.stringify(fsUsers));
          // If currentUser is loaded, update their state with backend points data
          if (keepUser) {
            const parsedLogged = JSON.parse(keepUser);
            const backendUser = fsUsers[parsedLogged.username.toLowerCase()];
            if (backendUser) {
              const updatedUser = { ...parsedLogged, ...backendUser };
              setCurrentUser(updatedUser);
              localStorage.setItem("sub_logged_user", JSON.stringify(updatedUser));
            }
          }
        }

        // 4. Audit Log sync
        const fsLogs = await fetchAuditLogsFromFirestore();
        if (fsLogs.length === 0) {
          await saveAllAuditLogsToFirestore(logs.length > 0 ? logs : INITIAL_AUDIT_LOGS);
        } else {
          const sorted = fsLogs.sort((a, b) => b.id.localeCompare(a.id));
          setLogs(sorted);
          localStorage.setItem("sub_logs", JSON.stringify(sorted));
        }

        // 5. Promotions sync
        const fsPromos = await fetchPromotionsFromFirestore();
        if (fsPromos.length === 0) {
          await saveAllPromotionsToFirestore(promotions.length > 0 ? promotions : INITIAL_PROMOTIONS);
        } else {
          setPromotions(fsPromos);
          localStorage.setItem("sub_promotions", JSON.stringify(fsPromos));
        }

        // 6. Cheat reports sync
        const { fetchCheatReportsFromFirestore, saveAllCheatReportsToFirestore, fetchQuotaRequestsFromFirestore, saveAllQuotaRequestsToFirestore, fetchTriviaQuestionsFromFirestore, saveAllTriviaQuestionsToFirestore } = await import("./utils/firebaseDb");
        const fsCheat = await fetchCheatReportsFromFirestore();
        if (fsCheat.length === 0) {
          const localCheatRaw = localStorage.getItem("global_cheat_reports");
          if (localCheatRaw) {
            await saveAllCheatReportsToFirestore(JSON.parse(localCheatRaw));
          }
        } else {
          localStorage.setItem("global_cheat_reports", JSON.stringify(fsCheat));
        }

        // 7. Quota requests sync
        const fsQuotas = await fetchQuotaRequestsFromFirestore();
        if (fsQuotas.length === 0) {
          const localQuotasRaw = localStorage.getItem("global_quota_requests");
          if (localQuotasRaw) {
            await saveAllQuotaRequestsToFirestore(JSON.parse(localQuotasRaw));
          }
        } else {
          localStorage.setItem("global_quota_requests", JSON.stringify(fsQuotas));
        }

        // 8. Trivia Questions sync
        const fsTrivia = await fetchTriviaQuestionsFromFirestore();
        if (fsTrivia.length === 0) {
          const localTriviaRaw = localStorage.getItem("sub_trivia_questions");
          if (localTriviaRaw) {
            await saveAllTriviaQuestionsToFirestore(JSON.parse(localTriviaRaw));
          }
        } else {
          localStorage.setItem("sub_trivia_questions", JSON.stringify(fsTrivia));
        }
      } catch (err) {
        console.warn("Firestore background loading sync bypassed:", err);
      }
    };
    syncAuthoritativeData();

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
    saveAllQuestionnairesToFirestore(updated);
  };

  const handleUpdateResponses = (updated: SurveyResponse[]) => {
    setResponses(updated);
    localStorage.setItem("sub_responses", JSON.stringify(updated));
    saveAllResponsesToFirestore(updated);
  };

  const handleUpdateLogs = (updated: AuditLog[]) => {
    setLogs(updated);
    localStorage.setItem("sub_logs", JSON.stringify(updated));
    saveAllAuditLogsToFirestore(updated);
  };

  const handleUpdatePromotions = (updated: PromotionApplication[]) => {
    setPromotions(updated);
    localStorage.setItem("sub_promotions", JSON.stringify(updated));
    saveAllPromotionsToFirestore(updated);
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
    
    // Points-awarding mechanism for Respondents
    let pointsLogText = "";
    if (currentUser && currentUser.role === UserRole.RESPONDENT) {
      const storedUsers = localStorage.getItem("sub_users");
      if (storedUsers) {
        const uList = JSON.parse(storedUsers);
        const uName = currentUser.username.toLowerCase();
        if (uList[uName]) {
          const numQuestions = sNode?.questions?.length || 0;
          const answeredKeys = Object.keys(newResp.answers || {}).filter(k => {
            const val = newResp.answers[k];
            return val !== undefined && val !== null && val !== "" && (!Array.isArray(val) || val.length > 0);
          });
          const answeredCount = answeredKeys.length;

          let pointsPerAnswer = 7;
          if (numQuestions >= 10 && numQuestions < 20) {
            pointsPerAnswer = 5;
          } else if (numQuestions >= 20) {
            pointsPerAnswer = 3;
          }

          const ptsToAward = answeredCount * pointsPerAnswer;
          const currentPts = uList[uName].respondentPoints || 0;
          const nextPts = currentPts + ptsToAward;
          uList[uName].respondentPoints = nextPts;

          // Compute new tier
          const Q = Math.floor(nextPts / 20);
          let nextTier = 1;
          if (Q < 9) nextTier = 1;
          else if (Q < 18) nextTier = 2;
          else if (Q < 34) nextTier = 3;
          else if (Q < 50) nextTier = 4;
          else if (Q < 75) nextTier = 5;
          else if (Q < 100) nextTier = 6;
          else nextTier = 7;

          uList[uName].starLevel = nextTier;

          localStorage.setItem("sub_users", JSON.stringify(uList));
          
          // Save updated stats (points + tier) of respondent to Firestore
          saveUserToFirestore(uName, uList[uName]);
          
          // Update current user state as well
          const updatedUser = {
            ...currentUser,
            respondentPoints: nextPts,
            starLevel: nextTier
          };
          setCurrentUser(updatedUser);
          localStorage.setItem("sub_logged_user", JSON.stringify(updatedUser));

          pointsLogText = `。填答市民獲得積分: ${ptsToAward} 點 (問卷共 ${numQuestions} 題、每答對 1 題獲 ${pointsPerAnswer} 點，實際回答 ${answeredCount} 題)。當前總積分: ${nextPts} 點、Rank段位: ${nextTier} 階`;
        }
      }
    }

    addLog(
      currentUser?.username || "一般填答市民",
      currentUser?.role || "使用者",
      "填寫問卷提交",
      sNode ? sNode.title : newResp.surveyId,
      `成功填寫問卷，產生數據憑證 ${fresh.id}。電子信箱/填寫人: ${fresh.submittedBy}${pointsLogText}`
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
    const activeQuestionnaires = questionnaires.filter((q) => q.isActive);
    const allQuerySystems = questionnaires.flatMap(q => q.querySystems.map(sys => ({ ...sys, parentSurvey: q })));

    return (
      <div className="public-site space-y-10" id="default-lobby-grid">
        
        {/* Welcome Section */}
        <section className="public-hero relative overflow-hidden rounded-[2rem] border border-stone-200 bg-[#f7f2e8] text-stone-950 shadow-sm">
          <div className="public-hero__wash" />
          <div className="relative grid min-h-[520px] grid-cols-1 lg:grid-cols-[1.05fr_.95fr]">
            <div className="flex flex-col justify-between gap-12 p-6 md:p-10 lg:p-14">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-white/60 px-3 py-1.5 text-xs font-bold text-stone-700 backdrop-blur">
                  <Globe2 className="h-3.5 w-3.5 text-teal-700" />
                  <span>所有人都能使用</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-white/60 px-3 py-1.5 text-xs font-bold text-stone-700 backdrop-blur">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                  <span>手機、平板、桌機皆可操作</span>
                </div>
              </div>

              <div className="max-w-3xl">
                <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.32em] text-teal-800">Public Survey Hall</p>
                <h1 className="font-display text-4xl font-black leading-[1.05] text-stone-950 md:text-6xl">
                  公共問卷與意見回饋網站
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-stone-700 md:text-lg">
                  不需要安裝 App。民眾可以直接填寫公開問卷，授權人員可進入專屬查詢通道，管理者也能登入後台整理資料與追蹤紀錄。
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href="#survey-list"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-800"
                >
                  <PenTool className="h-4 w-4" />
                  <span>開始填寫問卷</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#admin"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white/70 px-5 py-3 text-sm font-bold text-stone-800 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <ShieldCheck className="h-4 w-4 text-teal-700" />
                  <span>管理者登入</span>
                </a>
              </div>
            </div>

            <div className="relative min-h-[360px] border-t border-stone-200 bg-stone-950 p-6 text-white lg:border-l lg:border-t-0 md:p-10">
              <div className="absolute inset-0 public-hero__panel" />
              <div className="relative flex h-full flex-col justify-between gap-8">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-3xl font-black">{activeQuestionnaires.length}</p>
                    <p className="mt-1 text-xs font-semibold text-stone-300">開放問卷</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-3xl font-black">{responses.length}</p>
                    <p className="mt-1 text-xs font-semibold text-stone-300">已記錄回覆</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[72%] rounded-full bg-teal-300" />
                  </div>
                  <div className="grid gap-3 text-sm text-stone-200">
                    <div className="flex items-center gap-3">
                      <MessagesSquare className="h-4 w-4 text-teal-300" />
                      <span>公開回饋、匿名填答與電子信箱留存皆可並行</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <KeyRound className="h-4 w-4 text-amber-300" />
                      <span>敏感問卷與查詢通道支援密碼保護</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-4 w-4 text-emerald-300" />
                      <span>後台可管理問卷、回覆、權限與稽核紀錄</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { icon: PenTool, title: "填寫", text: "選擇目前開放的問卷，依題型逐步完成送出。" },
            { icon: Search, title: "查詢", text: "透過授權通道查找特定資料，必要時進行更正。" },
            { icon: ShieldCheck, title: "管理", text: "管理者登入後台維護問卷、權限、紀錄與回覆。" }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-black text-stone-950">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">{item.text}</p>
              </div>
            );
          })}
        </section>

        {/* Home main split view */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3" id="survey-list">
          
          {/* Left panel: active surveys list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h2 className="flex items-center space-x-2 text-lg font-black text-stone-900">
                <PenTool className="w-5 h-5 text-teal-700" />
                <span>開放進行中之統計問卷填寫</span>
              </h2>
              <span className="font-mono text-xs text-stone-500">
                共 {activeQuestionnaires.length} 張開放
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {activeQuestionnaires.map((q) => (
                <div 
                  key={q.id} 
                  className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md md:flex-row md:items-center"
                >
                  <div className="space-y-1.5 flex-1 max-w-xl">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
                      <span className="rounded bg-teal-50 px-1.5 py-0.5 font-mono text-[9px] font-extrabold text-teal-800">
                        問卷ID: {q.id}
                      </span>
                      {q.passwordRequired && (
                        <span className="flex items-center rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-600">
                          <Lock className="w-3 h-3 mr-1" />
                          密碼防護開啟
                        </span>
                      )}
                      {q.emailNotificationEnabled && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                          自動電郵憑證
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black leading-snug text-stone-900">{q.title}</h3>
                    <p className="line-clamp-2 text-xs leading-relaxed text-stone-500">{q.description}</p>
                  </div>

                  <div className="shrink-0 flex items-center space-x-2">
                    <button
                      id={`fill-survey-btn-${q.id}`}
                      onClick={() => {
                        setSelectedSurveyToFill(q);
                        window.location.hash = `#fill/${q.id}`;
                      }}
                      className="cursor-pointer rounded-xl bg-stone-950 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-800"
                    >
                      進入填寫
                    </button>
                  </div>
                </div>
              ))}
              {activeQuestionnaires.length === 0 && (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm font-semibold text-stone-500">
                  目前尚無開放中的問卷。
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Sub-query channels list */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-md flex items-center space-x-2 font-black text-stone-900">
                <Search className="w-4.5 h-4.5 text-amber-600" />
                <span>專門稽核：獨立子查詢通道</span>
              </h2>
            </div>

            <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-left">
              <p className="text-xs leading-relaxed text-stone-500">
                授權單位可使用對應查詢窗口，僅處理該問卷允許查詢與更正的資料：
              </p>

              <div className="space-y-2.5">
                {allQuerySystems.map((sysItem) => (
                  <div key={sysItem.id} className="flex flex-col justify-between gap-2 rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs">
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

                    {allQuerySystems.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4">目前系統管理端尚無制定任何子查詢系統。</p>
                )}
              </div>
            </div>

            <div className="space-y-2.5 rounded-2xl border border-teal-100 bg-teal-50 p-4 text-left">
              <span className="flex items-center text-xs font-bold text-teal-950">
                <Smartphone className="mr-1 h-4 w-4 text-teal-700" />
                <span>跨裝置公開使用</span>
              </span>
              <p className="text-[11px] leading-relaxed text-teal-900">
                網站第一屏即提供填寫、查詢與管理入口，民眾可以用手機直接完成問卷。
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
