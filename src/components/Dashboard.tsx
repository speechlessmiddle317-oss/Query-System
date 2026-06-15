import React, { useState, useEffect } from "react";
import { 
  AppUser, 
  Questionnaire, 
  SurveyResponse, 
  UserRole, 
  StarLevel, 
  AuditLog, 
  PromotionApplication, 
  Question,
  QuerySystemConfig
} from "../types";
import { exportSurveyToCSV } from "../utils/csv";
import { 
  UserCheck, 
  PlusCircle, 
  Trash2, 
  Download, 
  Edit2, 
  Unlock, 
  Settings, 
  Database, 
  PieChart, 
  UserCog, 
  LockKeyhole, 
  Check, 
  X, 
  ArrowUpCircle, 
  Share2, 
  Mail, 
  Eye, 
  Undo2, 
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  FileCheck2,
  Lock
} from "lucide-react";
import LogView from "./LogView";

interface DashboardProps {
  currentUser: AppUser;
  questionnaires: Questionnaire[];
  responses: SurveyResponse[];
  logs: AuditLog[];
  promotions: PromotionApplication[];
  onUpdateQuestionnaires: (updated: Questionnaire[]) => void;
  onUpdateResponses: (updated: SurveyResponse[]) => void;
  onUpdatePromotions: (updated: PromotionApplication[]) => void;
  onUpdateLogList: (updated: AuditLog[]) => void;
  onLogout: () => void;
  onSelectQuerySystem: (survey: Questionnaire, query: QuerySystemConfig) => void;
}

export default function Dashboard({
  currentUser,
  questionnaires,
  responses,
  logs,
  promotions,
  onUpdateQuestionnaires,
  onUpdateResponses,
  onUpdatePromotions,
  onUpdateLogList,
  onLogout,
  onSelectQuerySystem
}: DashboardProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"analytics" | "submissions" | "survey_configs" | "rbac" | "profile" | "logs">("analytics");

  // Selection
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(questionnaires[0]?.id || "");

  // Password edit state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");

  // Edit response modal
  const [editingResponse, setEditingResponse] = useState<SurveyResponse | null>(null);
  const [editingAnswers, setEditingAnswers] = useState<Record<string, any>>({});
  const [editingMsg, setEditingMsg] = useState("");

  // Survey Creation / Editing parameters
  const [isCreatingSurvey, setIsCreatingSurvey] = useState(false);
  const [newSurveyTitle, setNewSurveyTitle] = useState("");
  const [newSurveyDesc, setNewSurveyDesc] = useState("");
  const [newSurveyPwReq, setNewSurveyPwReq] = useState(false);
  const [newSurveyPw, setNewSurveyPw] = useState("");
  const [newSurveyEmail, setNewSurveyEmail] = useState(false);
  const [newSurveyStart, setNewSurveyStart] = useState("");
  const [newSurveyEnd, setNewSurveyEnd] = useState("");
  const [newSurveyQs, setNewSurveyQs] = useState<Question[]>([]);

  // Temp Q state
  const [tempQTitle, setTempQTitle] = useState("");
  const [tempQType, setTempQType] = useState<any>("SINGLE_CHOICE");
  const [tempQOptions, setTempQOptions] = useState("");
  const [tempQRequired, setTempQRequired] = useState(true);

  // Sub-Query config state inside Survey Configs
  const [configNewQueryName, setConfigNewQueryName] = useState("");
  const [configNewQueryPwReq, setConfigNewQueryPwReq] = useState(false);
  const [configNewQueryPw, setConfigNewQueryPw] = useState("");
  const [configNewQueryEditable, setConfigNewQueryEditable] = useState<string[]>([]);

  // RBAC User Star or Table assign state (Super Admin only)
  const [rbacUsers, setRbacUsers] = useState<Record<string, any>>({});
  const [rbacSelectedUser, setRbacSelectedUser] = useState<string>("");

  // New user registration state (Super Admin use)
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.OPERATOR);
  const [newUserStar, setNewUserStar] = useState<number>(1);

  useEffect(() => {
    // Sync local users list for RBAC panel
    const stored = localStorage.getItem("sub_users");
    if (stored) {
      setRbacUsers(JSON.parse(stored));
    } else {
      // Sync from INITIAL_USERS
      import("../utils/initialData").then(data => {
        localStorage.setItem("sub_users", JSON.stringify(data.INITIAL_USERS));
        setRbacUsers(data.INITIAL_USERS);
      });
    }
  }, []);

  const addLog = (action: string, target: string, details: string) => {
    const roleString = currentUser.role === UserRole.SUPER_ADMIN 
      ? "超級管理員" 
      : currentUser.role === UserRole.SYSTEM_ADMIN
      ? "系統管理員"
      : currentUser.role === UserRole.OPERATOR
      ? `操作員 (${currentUser.starLevel}星)`
      : `分析員 (${currentUser.starLevel}星)`;

    const newLogItem: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      user: currentUser.username,
      role: roleString,
      action,
      target,
      details
    };
    onUpdateLogList([newLogItem, ...logs]);
  };

  // Helper check if current user is allowed to access specific table
  const checkTableAccess = (surveyId: string): boolean => {
    if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.SYSTEM_ADMIN) {
      return true;
    }
    return currentUser.assignedTables?.includes(surveyId) || false;
  };

  // Filter questionnaires based on access restrictions
  const accessibleQuestionnaires = questionnaires.filter(q => checkTableAccess(q.id));

  // Determine current active survey
  const surveysToRender = accessibleQuestionnaires;
  const currentSurvey = questionnaires.find(q => q.id === selectedSurveyId);

  // Auto-correct Selected Survey ID if access is lost or non-existent
  useEffect(() => {
    if (surveysToRender.length > 0 && !surveysToRender.map(q => q.id).includes(selectedSurveyId)) {
      setSelectedSurveyId(surveysToRender[0].id);
    }
  }, [questionnaires, currentUser, selectedSurveyId]);

  // Promote Apply center (Operator/Analyst 3-Star can apply for promotion)
  const canApplyPromotion = (): boolean => {
    if (currentUser.role === UserRole.OPERATOR && currentUser.starLevel === 3) return true;
    if (currentUser.role === UserRole.ANALYST && currentUser.starLevel === 3) return true;
    return false;
  };

  const handleApplyPromotion = () => {
    const existingActive = promotions.find(p => p.username === currentUser.username && p.status === "PENDING");
    if (existingActive) {
      alert("您已有一筆審核中的晉級申請，請静候超級管理員核准！");
      return;
    }

    const app: PromotionApplication = {
      id: `promo-${Date.now()}`,
      username: currentUser.username,
      currentRole: currentUser.role,
      currentStar: currentUser.starLevel,
      targetRole: currentUser.role === UserRole.OPERATOR ? UserRole.SYSTEM_ADMIN : UserRole.OPERATOR,
      targetStar: currentUser.role === UserRole.OPERATOR ? undefined : 1,
      status: "PENDING",
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19)
    };

    onUpdatePromotions([app, ...promotions]);
    addLog(
      "提出職級晉升申請",
      "用戶權限分級制度",
      `${currentUser.username} (${currentUser.role === UserRole.OPERATOR ? "三星操作員" : "三星分析員"}) 申請晉升為：${
        currentUser.role === UserRole.OPERATOR ? "系統管理員" : "一星操作員"
      }`
    );
    alert("您的晉級申請已成功送出！將提報予超級管理員進行審批。");
  };

  // Approve Promotion
  const handleApprovePromo = (app: PromotionApplication) => {
    // 1. Update promotion status
    const updatedApps = promotions.map(p => p.id === app.id ? { ...p, status: "APPROVED" } as const : p);
    onUpdatePromotions(updatedApps);

    // 2. Update user info in local storage list
    const stored = localStorage.getItem("sub_users");
    if (stored) {
      const uList = JSON.parse(stored);
      if (uList[app.username]) {
        uList[app.username].role = app.targetRole;
        uList[app.username].starLevel = app.targetStar;
        if (app.targetRole === UserRole.SYSTEM_ADMIN) {
          uList[app.username].assignedTables = [];
        }
        localStorage.setItem("sub_users", JSON.stringify(uList));
        setRbacUsers(uList);
      }
    }

    addLog(
      "批准職級晉級申請",
      "核備人員: " + app.username,
      `超級管理員核准了 ${app.username} 的申請。角色地位轉換為: ${app.targetRole} (${app.targetStar || ""}星)`
    );
    alert(`已批准 ${app.username} 的晉級申請！階級設定已同步更新。`);
  };

  // Reject Promotion
  const handleRejectPromo = (app: PromotionApplication) => {
    const updatedApps = promotions.map(p => p.id === app.id ? { ...p, status: "REJECTED" } as const : p);
    onUpdatePromotions(updatedApps);
    addLog(
      "否決職級晉級申請",
      "駁回人員: " + app.username,
      `超級管理員駁回了 ${app.username} 的晉級申請項目。`
    );
  };

  // Update own password
  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg("");
    setProfileError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setProfileError("請填寫所有密碼欄位！");
      return;
    }

    if (newPassword !== confirmPassword) {
      setProfileError("新密碼與確認新密碼輸入不一致！");
      return;
    }

    const stored = localStorage.getItem("sub_users");
    if (stored) {
      const uList = JSON.parse(stored);
      const targetRecord = uList[currentUser.username];
      if (targetRecord) {
        if (targetRecord.password !== oldPassword) {
          setProfileError("舊密碼驗證有誤，請重試！");
          return;
        }

        // Change password
        uList[currentUser.username].password = newPassword;
        localStorage.setItem("sub_users", JSON.stringify(uList));
        setRbacUsers(uList);
        setProfileMsg("🎉 個人帳號密碼修改成功！");
        addLog(
          "更改帳號密碼",
          "自持密碼庫變更",
          `用戶 ${currentUser.username} 自行線上重新定義了後台身分存取密碼。`
        );
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    }
  };

  // Allocate tables & stars inside Super Admin RBAC control module
  const handleSaveUserRBAC = (username: string, starVal: number, list: string[]) => {
    const stored = localStorage.getItem("sub_users");
    if (stored) {
      const uList = JSON.parse(stored);
      if (uList[username]) {
        // Enforce maximum tables boundary rule per star
        // 1-star: max 1, 2-star: max 2, 3-star: max 3
        const truncatedList = list.slice(0, starVal);

        uList[username].starLevel = starVal as StarLevel;
        uList[username].assignedTables = truncatedList;

        localStorage.setItem("sub_users", JSON.stringify(uList));
        setRbacUsers(uList);

        addLog(
          "變更操作權限",
          username + " 權限更新",
          `超級管理員更新了 ${username}：認證星級=${starVal}，授予表格：[${truncatedList.join(", ")}] (多餘指定被自動按星等截斷)`
        );
        alert(`已成功儲存用戶 ${username} 的RBAC控制設定！核發表格數已限制於星等上限。`);
      }
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = newUsername.trim().toLowerCase();
    if (!cleanUser) {
      alert("⚠️ 請輸入想要建立的帳號名稱！");
      return;
    }
    if (!newUserPassword.trim()) {
      alert("⚠️ 請輸入存取密碼！");
      return;
    }

    if (rbacUsers[cleanUser] || cleanUser === "super_admin") {
      alert("⚠️ 該帳號名稱已存在，請使用其他名稱！");
      return;
    }

    const uList = { ...rbacUsers };
    uList[cleanUser] = {
      username: cleanUser,
      password: newUserPassword.trim(),
      role: newUserRole,
      starLevel: (newUserRole === UserRole.OPERATOR || newUserRole === UserRole.ANALYST) ? newUserStar : undefined,
      assignedTables: []
    };

    localStorage.setItem("sub_users", JSON.stringify(uList));
    setRbacUsers(uList);

    addLog(
      "新增系統帳號",
      "帳號授權: " + cleanUser,
      `超級管理員新增了全新後台帳號: ${cleanUser}，指派角色: ${newUserRole}${
        (newUserRole === UserRole.OPERATOR || newUserRole === UserRole.ANALYST) ? ` (${newUserStar}星)` : ""
      }`
    );

    alert(`🎉 帳號 ${cleanUser} 創建成功！`);
    setNewUsername("");
    setNewUserPassword("");
    setRbacSelectedUser(cleanUser); // Auto-select newly created user for convenience
  };

  // Add question to questionnaire creator
  const handleAddQuestionToTemp = () => {
    if (!tempQTitle.trim()) {
      alert("請補全題目標題！");
      return;
    }
    const q: Question = {
      id: `q-${Date.now()}`,
      title: tempQTitle,
      type: tempQType,
      required: tempQRequired,
      options: tempQOptions ? tempQOptions.split(",").map(o => o.trim()).filter(Boolean) : undefined
    };
    setNewSurveyQs(prev => [...prev, q]);
    setTempQTitle("");
    setTempQOptions("");
  };

  // Create full questionnaire
  const handleSaveNewSurvey = () => {
    if (!newSurveyTitle.trim()) {
      alert("請填寫問卷標題！");
      return;
    }
    if (newSurveyQs.length === 0) {
      alert("問卷內必須至少包含一題項目設定！");
      return;
    }

    const nSurvey: Questionnaire = {
      id: `survey-${Date.now().toString().slice(-6)}`,
      title: newSurveyTitle,
      description: newSurveyDesc,
      isActive: true,
      startTime: newSurveyStart || undefined,
      endTime: newSurveyEnd || undefined,
      passwordRequired: newSurveyPwReq,
      password: newSurveyPwReq ? newSurveyPw : undefined,
      querySystems: [],
      emailNotificationEnabled: newSurveyEmail,
      questions: newSurveyQs
    };

    const updated = [...questionnaires, nSurvey];
    onUpdateQuestionnaires(updated);

    addLog(
      "新增問卷",
      nSurvey.title,
      `新增問卷 ID: ${nSurvey.id}，自定義填寫密碼=${nSurvey.passwordRequired ? "是" : "否"}`
    );

    // reset
    setNewSurveyTitle("");
    setNewSurveyDesc("");
    setNewSurveyPwReq(false);
    setNewSurveyPw("");
    setNewSurveyEmail(false);
    setNewSurveyStart("");
    setNewSurveyEnd("");
    setNewSurveyQs([]);
    setIsCreatingSurvey(false);
    alert("問卷成功發布！");
  };

  // Delete questionnaire
  const handleDeleteSurvey = (id: string, sTitle: string) => {
    if (confirm(`確定要刪除問卷「${sTitle}」與其所有的填答與回覆數據嗎？此動作將立即生效且無法復原。`)) {
      const updatedS = questionnaires.filter(q => q.id !== id);
      onUpdateQuestionnaires(updatedS);

      // Clean answers linked to it
      const updatedR = responses.filter(r => r.surveyId !== id);
      onUpdateResponses(updatedR);

      addLog(
        "刪除問卷數據",
        sTitle,
        `移除問卷、清除所有旗下回收填寫記錄。問卷編號: ${id}`
      );
      alert("問卷已徹底刪除。");
    }
  };

  // Add query subystem to a survey
  const handleAddQuerySubsystem = (surveyId: string) => {
    if (!configNewQueryName.trim()) {
      alert("請輸入子查詢系統名稱！");
      return;
    }

    const newSystem: QuerySystemConfig = {
      id: `sub-query-${Date.now()}`,
      name: configNewQueryName,
      passwordRequired: configNewQueryPwReq,
      password: configNewQueryPwReq ? configNewQueryPw : undefined,
      editableQuestionIds: configNewQueryEditable
    };

    const updated = questionnaires.map(q => {
      if (q.id === surveyId) {
        return {
          ...q,
          querySystems: [...q.querySystems, newSystem]
        };
      }
      return q;
    });

    onUpdateQuestionnaires(updated);
    addLog(
      "指派子查詢系統",
      queryConfigName(id => q => q.id === surveyId, newSystem.name),
      `為問卷「${surveyId}」新建獨立查詢通路：${newSystem.name}，可更正題目包括 [${newSystem.editableQuestionIds.join(", ")}]`
    );

    // reset
    setConfigNewQueryName("");
    setConfigNewQueryPwReq(false);
    setConfigNewQueryPw("");
    setConfigNewQueryEditable([]);
    alert("獨立子查詢系統建置成功！");
  };

  const queryConfigName = (filterFn: any, name: string): string => {
    return name;
  };

  // Delete/Remove query subsystem
  const handleDeleteQuerySubsystem = (surveyId: string, queryId: string, qName: string) => {
    if (confirm(`確定要移除「${qName}」子查詢系統嗎？`)) {
      const updated = questionnaires.map(q => {
        if (q.id === surveyId) {
          return {
            ...q,
            querySystems: q.querySystems.filter(qs => qs.id !== queryId)
          };
        }
        return q;
      });
      onUpdateQuestionnaires(updated);
      addLog(
        "移除子查詢系統",
        qName,
        `自問卷 ${surveyId} 卸載此查詢通路。`
      );
    }
  };

  // Edit Response Save Modal
  const handleOpenEditResponseModal = (resp: SurveyResponse) => {
    setEditingResponse(resp);
    setEditingAnswers({ ...resp.answers });
    setEditingMsg("");
  };

  const handleSaveModalResponse = () => {
    if (!editingResponse) return;

    const updated = responses.map(r => {
      if (r.id === editingResponse.id) {
        return {
          ...r,
          answers: {
            ...r.answers,
            ...editingAnswers
          }
        };
      }
      return r;
    });

    onUpdateResponses(updated);
    addLog(
      "修改問卷答案",
      `填寫卷編號: ${editingResponse.id}`,
      `手動覆寫並儲存此一在資料庫中的問卷答案紀錄，對應問卷編號=${editingResponse.surveyId}`
    );
    setEditingMsg("✅ 答案已成功線上更正改寫！");
    setTimeout(() => {
      setEditingResponse(null);
    }, 1000);
  };

  // Delete Response individually (For operator and administrators)
  const handleDeleteResponse = (respId: string, surveyTitle: string) => {
    if (confirm(`確定從資料庫中將此筆答案數據記錄 (${respId}) 刪除嗎？`)) {
      const updated = responses.filter(r => r.id !== respId);
      onUpdateResponses(updated);
      addLog(
        "刪除問卷數據",
        `單筆填寫紀錄 ${respId}`,
        `刪除此筆記錄。所屬問卷為: ${surveyTitle}`
      );
      alert("單筆填答數據已徹底刪除！");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto my-4 space-y-6" id="dashboard-main-container">
      {/* Upper Brand Info Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-slate-900 text-amber-400 rounded-2xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">問卷統計與反饋稽核中心</h1>
            <p className="text-slate-500 text-xs mt-1">
              當前登入身分：
              <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                {currentUser.username} ({
                  currentUser.role === UserRole.SUPER_ADMIN ? "超級管理員 👑" :
                  currentUser.role === UserRole.SYSTEM_ADMIN ? "系統管理員 🛡️" :
                  currentUser.role === UserRole.OPERATOR ? `操作員 ${currentUser.starLevel}星 ⭐` :
                  `分析員 ${currentUser.starLevel}星 📊`
                })
              </span>
            </p>
          </div>
        </div>

        {/* Action Header bar */}
        <div className="flex flex-wrap items-center gap-2">
          {canApplyPromotion() && (
            <button
              id="dash-apply-upgrade-btn"
              onClick={handleApplyPromotion}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-100 flex items-center space-x-1.5 transition-all cursor-pointer cursor-emerald"
            >
              <ArrowUpCircle className="w-4 h-4 animate-bounce" />
              <span>向上級申請晉階級</span>
            </button>
          )}

          <button
            id="dash-logout-btn"
            onClick={onLogout}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-100 transition-all cursor-pointer"
          >
            登出管理系統
          </button>
        </div>
      </div>

      {/* Main Grid Layout: Navigation Left / Contents Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar Drawer */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-4 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 block px-3 uppercase tracking-wider mb-2">管理控制選單</span>

            <button
              id="tab-btn-analytics"
              onClick={() => setActiveTab("analytics")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center space-x-2">
                <PieChart className="w-4 h-4" />
                <span>📊 問卷統計與分析</span>
              </div>
              <ChevronRight className="w-3 h-3 opacity-60" />
            </button>

            {/* Operator and Administrator can see / edit submissions list */}
            {currentUser.role !== UserRole.ANALYST && (
              <button
                id="tab-btn-submissions"
                onClick={() => setActiveTab("submissions")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "submissions"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span>🗃️ 所有問卷及回覆</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
            )}

            {/* Config center: restricted to System/Super Admin */}
            {(currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.SYSTEM_ADMIN) && (
              <button
                id="tab-btn-survey-configs"
                onClick={() => setActiveTab("survey_configs")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "survey_configs"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>⚙️ 問卷與子查詢系統設定</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
            )}

            {/* RBAC user center: restricted to Super Admin only */}
            {currentUser.role === UserRole.SUPER_ADMIN && (
              <button
                id="tab-btn-rbac"
                onClick={() => setActiveTab("rbac")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "rbac"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <UserCog className="w-4 h-4" />
                  <span>👤 帳號權限與晉升批准</span>
                </div>
                {promotions.filter(p => p.status === "PENDING").length > 0 && (
                  <span className="bg-rose-500 text-white rounded-full px-1.5 py-0.5 text-[9px] animate-pulse">
                    {promotions.filter(p => p.status === "PENDING").length}
                  </span>
                )}
              </button>
            )}

            <button
              id="tab-btn-profile"
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center space-x-2">
                <LockKeyhole className="w-4 h-4" />
                <span>🔒 變更個人密碼</span>
              </div>
              <ChevronRight className="w-3 h-3 opacity-60" />
            </button>

            {/* Audit Logs: only open to administrators */}
            {(currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.SYSTEM_ADMIN) && (
              <button
                id="tab-btn-logs"
                onClick={() => setActiveTab("logs")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "logs"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileCheck2 className="w-4 h-4" />
                  <span>📜 系統稽核操作日誌</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
            )}

          </div>

          {/* Quick selection dropdown for table context */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-2">當前對應表單</span>
            {surveysToRender.length > 0 ? (
              <select
                id="dash-survey-selector"
                value={selectedSurveyId}
                onChange={(e) => setSelectedSurveyId(e.target.value)}
                className="w-full bg-white border border-slate-200 text-xs rounded-lg p-2 focus:border-indigo-500 font-semibold text-slate-700 outline-none"
              >
                {surveysToRender.map((q) => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
            ) : (
              <p className="text-rose-500 font-bold text-xs p-1">⚠️ 尚未獲配任何表格，請向超級管理員申請分配！</p>
            )}
          </div>
        </div>

        {/* Tab content area */}
        <div className="lg:col-span-3">

          {/* TAB 1: Analytics Report */}
          {activeTab === "analytics" && (
            <div className="space-y-6 font-sans">
              {currentSurvey ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                  
                  {/* Title banner */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                        問卷統計報告 ({currentSurvey.id})
                      </span>
                      <h2 className="text-lg font-bold text-slate-800 mt-1">{currentSurvey.title}</h2>
                    </div>
                    
                    {/* CSV Export Button */}
                    <button
                      id="export-csv-btn"
                      onClick={() => exportSurveyToCSV(currentSurvey, responses.filter(r => r.surveyId === currentSurvey.id))}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 font-semibold text-xs text-white rounded-xl flex items-center space-x-1 shadow-sm shrink-0 duration-150 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>匯出此問卷 CSV 格式</span>
                    </button>
                  </div>

                  {/* Summary Bento stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                      <span className="text-xs text-slate-400">總填答回收份數</span>
                      <p className="text-2xl font-bold font-mono text-slate-800 mt-1">
                        {responses.filter(r => r.surveyId === currentSurvey.id).length} <span className="text-xs text-slate-500 font-normal">份</span>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                      <span className="text-xs text-slate-400">密碼防護狀態</span>
                      <div className="flex items-center space-x-1 text-slate-800 mt-1.5">
                        {currentSurvey.passwordRequired ? (
                          <>
                            <Lock className="w-4 h-4 text-rose-500 shrink-0" />
                            <span className="text-xs font-bold text-rose-600">密碼驗證: {currentSurvey.password}</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-xs font-bold text-emerald-600">開放填寫 (無密碼)</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                      <span className="text-xs text-slate-400">開放效期狀態</span>
                      <p className="text-xs font-semibold text-slate-700 mt-1.5 leading-tight">
                        {currentSurvey.startTime ? `${new Date(currentSurvey.startTime).toLocaleDateString()}` : "即日起"} 
                        <span> ~ </span>
                        {currentSurvey.endTime ? `${new Date(currentSurvey.endTime).toLocaleDateString()}` : "無期限限制"}
                      </p>
                    </div>
                  </div>

                  {/* Question analysis */}
                  <div className="space-y-6 pt-2">
                    <h3 className="text-sm font-bold text-slate-700 border-l-4 border-indigo-500 pl-2">📊 填答分布統計</h3>
                    
                    {currentSurvey.questions.map((q, idx) => {
                      const qResponses = responses.filter(r => r.surveyId === currentSurvey.id);
                      const qAnswers = qResponses.map(r => r.answers[q.id]).filter(val => val !== undefined && val !== null);

                      return (
                        <div key={q.id} className="p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                          <p className="text-xs font-bold text-indigo-900 leading-relaxed mb-3">
                            問項 {idx + 1}：{q.title} <span className="font-normal text-slate-400">({q.type})</span>
                          </p>

                          {/* Render statistics according to type */}
                          {q.type === "SINGLE_CHOICE" && q.options && (
                            <div className="space-y-2">
                              {q.options.map((opt) => {
                                const count = qAnswers.filter(a => a === opt).length;
                                const pct = qAnswers.length > 0 ? Math.round((count / qAnswers.length) * 100) : 0;
                                return (
                                  <div key={opt} className="space-y-1">
                                    <div className="flex justify-between text-xs font-medium">
                                      <span className="text-slate-700">{opt}</span>
                                      <span className="text-slate-500 font-mono">{count} 票 ({pct}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                      <div className="bg-indigo-500 h-full cursor-pointer transition-all duration-500" style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {q.type === "MULTI_CHOICE" && q.options && (
                            <div className="space-y-2">
                              {q.options.map((opt) => {
                                const count = qAnswers.filter((a: any) => Array.isArray(a) && a.includes(opt)).length;
                                const pct = qAnswers.length > 0 ? Math.round((count / qAnswers.length) * 100) : 0;
                                return (
                                  <div key={opt} className="space-y-1">
                                    <div className="flex justify-between text-xs font-medium">
                                      <span className="text-slate-700">{opt}</span>
                                      <span className="text-slate-500 font-mono">{count} 人選中 ({pct}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                      <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {q.type === "RATING" && (
                            <div>
                              <div className="flex items-center space-x-1.5 mb-2 font-mono">
                                <span className="text-xs text-slate-500">平均星等：</span>
                                {qAnswers.length > 0 ? (
                                  <>
                                    <span className="text-lg font-bold text-amber-600">
                                      {(qAnswers.reduce((sum: number, cur: any) => sum + Number(cur), 0) / qAnswers.length).toFixed(1)}
                                    </span>
                                    <span className="text-xs text-slate-400">/ 5 星</span>
                                  </>
                                ) : (
                                  <span className="text-xs text-slate-400">暫無評分</span>
                                )}
                              </div>
                              <div className="flex space-x-1">
                                {[1, 2, 3, 4, 5].map((star) => {
                                  const count = qAnswers.filter(a => Number(a) === star).length;
                                  const pct = qAnswers.length > 0 ? Math.round((count / qAnswers.length) * 100) : 0;
                                  return (
                                    <div key={star} className="flex-1 bg-white p-2 border border-slate-100 rounded text-center">
                                      <span className="text-[10px] text-slate-400 font-semibold">{star}星</span>
                                      <div className="h-10 bg-slate-50 rounded mt-1 relative flex items-end overflow-hidden">
                                        <div className="bg-amber-400 w-full" style={{ height: `${pct}%` }} />
                                      </div>
                                      <span className="text-[9px] font-mono font-bold text-slate-500 block mt-1">{count}人</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {(q.type === "SHORT_TEXT" || q.type === "PARAGRAPH") && (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {qAnswers.length > 0 ? (
                                qAnswers.map((ans, aIdx) => (
                                  <div key={aIdx} className="bg-white p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600 font-mono">
                                    {String(ans)}
                                  </div>
                                ))
                              ) : (
                                <p className="text-[11px] text-slate-400">目前尚無回收意見文本</p>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>

                </div>
              ) : (
                <div className="bg-white p-12 text-center rounded-2xl border text-slate-400">
                  ⚠️ 請在側邊欄指定您欲查看的可存取表單統計
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Submissions Manager */}
          {activeTab === "submissions" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">📋 資料庫回收表單原始數據</h2>
                  <p className="text-slate-500 text-xs mt-1">
                    當前篩選問卷：<strong className="text-slate-800 font-bold">{currentSurvey?.title}</strong>
                  </p>
                </div>
                <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full shrink-0">
                  管理者與操作員均具備改寫問卷之編輯特權
                </div>
              </div>

              {currentSurvey ? (
                <div className="space-y-4">
                  {/* DataTable */}
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 font-bold tracking-wider uppercase">
                          <th className="py-2.5 px-3">填寫編號</th>
                          <th className="py-2.5 px-3">提交時間</th>
                          <th className="py-2.5 px-3">填答者 (信箱)</th>
                          <th className="py-2.5 px-3">答案預覽 (主要部分題)</th>
                          <th className="py-2.5 px-3 text-center">特權動作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {responses.filter(r => r.surveyId === currentSurvey.id).length > 0 ? (
                          responses.filter(r => r.surveyId === currentSurvey.id).map((res) => (
                            <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-3 text-slate-600 font-bold font-mono">{res.id}</td>
                              <td className="py-3 px-3 text-slate-400">{res.submittedAt}</td>
                              <td className="py-3 px-3 font-medium text-slate-700 max-w-[120px] truncate">{res.submittedBy || "匿名"}</td>
                              <td className="py-3 px-3 text-slate-500 font-sans max-w-[200px] truncate">
                                {Object.entries(res.answers).map(([qid, val]) => {
                                  const qNode = currentSurvey.questions.find(q => q.id === qid);
                                  return qNode ? `${qNode.title.slice(0, 5)}...: ${Array.isArray(val) ? val.join(",") : val}; ` : "";
                                })}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  {/* Prominent Online correction button (線上修改更正) */}
                                  <button
                                    id={`edit-resp-btn-${res.id}`}
                                    onClick={() => handleOpenEditResponseModal(res)}
                                    className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-[10px] text-white rounded shadow-sm border border-amber-300 hover:scale-[1.03] transition-all cursor-pointer"
                                  >
                                    線上修改更正
                                  </button>

                                  <button
                                    id={`delete-resp-btn-${res.id}`}
                                    onClick={() => handleDeleteResponse(res.id, currentSurvey.title)}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                                    title="刪除此筆問卷"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="text-center py-12 text-slate-400 font-sans">
                              此問卷目前暫無任何被記錄的填答回收。
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Sub-Query system launchers tied to this questionnaire */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                        <Share2 className="w-3.5 h-3.5 text-amber-500" />
                        <span>獨立查詢子系統通道 (互不受切換干擾、專屬直連填寫/查詢點)</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1">您可以點擊以下通道進入特定專門職等人員的獨立密碼修正查詢頁面：</p>
                    </div>

                    {currentSurvey.querySystems && currentSurvey.querySystems.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentSurvey.querySystems.map((sys) => {
                          const directUrlFill = `${window.location.origin}/#fill/${currentSurvey.id}`;
                          const directUrlQuery = `${window.location.origin}/#query/${currentSurvey.id}/${sys.id}`;

                          return (
                            <div key={sys.id} className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm space-y-2">
                              <span className="text-[9px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.5 rounded font-mono">
                                子系統 ID: {sys.id}
                              </span>
                              <h4 className="text-xs font-bold text-slate-800">{sys.name}</h4>
                              <p className="text-[10px] text-slate-400 max-w-xs truncate">更正項目包括：{sys.editableQuestionIds.join(", ")}</p>
                              
                              <div className="space-y-1.5 pt-1.5 border-t border-slate-50">
                                <button
                                  id={`launch-query-sys-${sys.id}`}
                                  onClick={() => onSelectQuerySystem(currentSurvey, sys)}
                                  className="w-full py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded transition-all cursor-pointer text-center"
                                >
                                  進入查詢子系統 UI
                                </button>
                                
                                <div className="text-[9px] text-slate-400 font-mono space-y-1 bg-slate-50 p-1.5 rounded border border-slate-100">
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-500 shrink-0">直達填寫：</span>
                                    <span className="text-slate-800 font-bold select-all truncate max-w-[120px]" title={directUrlFill}>{directUrlFill}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-500 shrink-0">直達查詢：</span>
                                    <span className="text-amber-800 font-bold select-all truncate max-w-[120px]" title={directUrlQuery}>{directUrlQuery}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">此問卷目前暫無任何指派的子查詢系統防線。</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-center py-6 text-slate-400">目前尚無指定數據</p>
              )}
            </div>
          )}

          {/* TAB 3: Survey planner and query subsystem management */}
          {activeTab === "survey_configs" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-8">
              
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">🔧 問卷制定與子查詢系統管理</h2>
                  <p className="text-slate-500 text-xs mt-1">手動創建問卷，自定義啟用與到期時間，或為其指派多重安全隔離子查詢通道。</p>
                </div>
                {!isCreatingSurvey && (
                  <button
                    id="trigger-create-survey-mode"
                    onClick={() => setIsCreatingSurvey(true)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center space-x-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>制定新問卷</span>
                  </button>
                )}
              </div>

              {/* Questionnaire creation panel */}
              {isCreatingSurvey ? (
                <div className="p-5 border-2 border-indigo-200 bg-indigo-50/20 rounded-2xl space-y-4">
                  <h3 className="text-xs font-extrabold text-indigo-900 border-b border-indigo-100 pb-2 uppercase tracking-wide flex items-center space-x-1">
                    <span>📝 快速自定義問卷制定器</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">問卷標題</label>
                      <input
                        id="new-survey-title"
                        type="text"
                        placeholder="例如: 社區環境衛生回饋表"
                        value={newSurveyTitle}
                        onChange={(e) => setNewSurveyTitle(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">啟用時間、到期通知與限制時間點</label>
                      <div className="flex space-x-1">
                        <input
                          id="new-survey-time-start"
                          type="datetime-local"
                          value={newSurveyStart}
                          onChange={(e) => setNewSurveyStart(e.target.value)}
                          className="w-1/2 bg-white border border-slate-200 rounded-lg p-1.5 text-xs focus:border-indigo-500 font-mono"
                          title="起始時間"
                        />
                        <input
                          id="new-survey-time-end"
                          type="datetime-local"
                          value={newSurveyEnd}
                          onChange={(e) => setNewSurveyEnd(e.target.value)}
                          className="w-1/2 bg-white border border-slate-200 rounded-lg p-1.5 text-xs focus:border-indigo-500 font-mono"
                          title="截止時間"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">問卷說明描述文字</label>
                    <textarea
                      id="new-survey-desc"
                      rows={2}
                      placeholder="請介紹此問卷的目的、宣導語與填載對象說明..."
                      value={newSurveyDesc}
                      onChange={(e) => setNewSurveyDesc(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:border-indigo-500"
                    />
                  </div>

                  {/* Anti-fraud password access and automatic email notifications settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-indigo-100">
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          id="new-survey-pw-checkbox"
                          type="checkbox"
                          checked={newSurveyPwReq}
                          onChange={(e) => setNewSurveyPwReq(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span>限制必須填寫密碼才可填表</span>
                      </label>
                      
                      {newSurveyPwReq && (
                        <input
                          id="new-survey-pw-input"
                          type="text"
                          placeholder="請指定問卷填寫解鎖密碼..."
                          value={newSurveyPw}
                          onChange={(e) => setNewSurveyPw(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          id="new-survey-email-checkbox"
                          type="checkbox"
                          checked={newSurveyEmail}
                          onChange={(e) => setNewSurveyEmail(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="flex items-center">
                          <Mail className="w-3.5 h-3.5 mr-1" />
                          <span>啟用電子郵件自動通知填寫者機制</span>
                        </span>
                      </label>
                      <p className="text-[9px] text-slate-400">啟用後，填寫者於送出時可指定其電子郵件信箱，系統將自動派送備份驗證通知信。</p>
                    </div>
                  </div>

                  {/* Add questions block */}
                  <div className="bg-white p-4 rounded-xl border border-indigo-100 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700">添加問卷題目</h4>
                    
                    <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-lg">
                      <div className="flex gap-2">
                        <input
                          id="temp-q-title"
                          type="text"
                          placeholder="題目敘述問題？"
                          value={tempQTitle}
                          onChange={(e) => setTempQTitle(e.target.value)}
                          className="flex-1 bg-white border border-slate-250 p-2 rounded text-xs"
                        />
                        <select
                          id="temp-q-type"
                          value={tempQType}
                          onChange={(e) => setTempQType(e.target.value as any)}
                          className="bg-white border border-slate-250 p-2 rounded text-xs font-bold"
                        >
                          <option value="SINGLE_CHOICE">單選題 (MCQ)</option>
                          <option value="MULTI_CHOICE">多選題 (Checkbox)</option>
                          <option value="SHORT_TEXT">簡答題 (Short Text)</option>
                          <option value="PARAGRAPH">詳答申論題 (Paragraph)</option>
                          <option value="RATING">滿意度星評 (Rating 1-5)</option>
                        </select>
                      </div>

                      {/* Display choices input conditionally */}
                      {(tempQType === "SINGLE_CHOICE" || tempQType === "MULTI_CHOICE") && (
                        <input
                          id="temp-q-options"
                          type="text"
                          placeholder="選項 (請用半形英文逗號 [ , ] 隔開每個選項)"
                          value={tempQOptions}
                          onChange={(e) => setTempQOptions(e.target.value)}
                          className="w-full bg-white border border-slate-250 p-2 rounded text-xs font-mono"
                        />
                      )}

                      <div className="flex justify-between items-center">
                        <label className="flex items-center space-x-2 text-[10px] text-slate-500 cursor-pointer">
                          <input
                            id="temp-q-required-checkbox"
                            type="checkbox"
                            checked={tempQRequired}
                            onChange={(e) => setTempQRequired(e.target.checked)}
                            className="w-3 h-3 text-indigo-600 rounded"
                          />
                          <span>設定此題為「必填」問題</span>
                        </label>
                        <button
                          id="add-q-to-temp-list-btn"
                          type="button"
                          onClick={handleAddQuestionToTemp}
                          className="py-1 px-3 bg-indigo-600 text-white font-bold text-xs rounded duration-150 cursor-pointer"
                        >
                          + 填入此題目至清單
                        </button>
                      </div>
                    </div>

                    {/* Previews added question items */}
                    {newSurveyQs.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">已填寫問題清單:</span>
                        <div className="space-y-1 max-h-36 overflow-y-auto">
                          {newSurveyQs.map((q, qidx) => (
                            <div key={q.id} className="p-2 bg-slate-50 text-[11px] font-mono rounded flex justify-between items-center border">
                              <span className="text-slate-700">
                                {qidx+1}. {q.title} ({q.type === "SINGLE_CHOICE" ? "單選" : q.type === "MULTI_CHOICE" ? "多選" : q.type === "RATING" ? "評級" : "文本型"}) {q.required && " *"}
                              </span>
                              <button
                                id={`remove-q-from-temp-${q.id}`}
                                onClick={() => setNewSurveyQs(prev => prev.filter(item => item.id !== q.id))}
                                className="text-rose-500 hover:text-rose-700"
                              >
                                移除
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions summary */}
                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                    <button
                      id="cancel-create-survey-btn"
                      type="button"
                      onClick={() => setIsCreatingSurvey(false)}
                      className="py-1.5 px-3 border border-slate-200 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      id="save-new-survey-btn"
                      type="button"
                      onClick={handleSaveNewSurvey}
                      className="py-1.5 px-5 bg-slate-950 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      確設定並公開此問卷
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Questionnaire management list */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700">📋 目前發布中之問卷與獨立查詢通路編輯</h3>
                <div className="grid grid-cols-1 gap-4">
                  {questionnaires.map((q) => (
                    <div key={q.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">ID: {q.id}</span>
                            <span className={`w-2 h-2 rounded-full ${q.isActive ? "bg-emerald-500 animate-ping" : "bg-rose-500"}`} />
                            <span className="text-[10px] font-bold text-slate-400">{q.isActive ? "填寫中" : "停用/待啟用"}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 mt-1">{q.title}</h4>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            id={`toggle-survey-status-${q.id}`}
                            onClick={() => {
                              const updated = questionnaires.map(item => item.id === q.id ? { ...item, isActive: !item.isActive } : item);
                              onUpdateQuestionnaires(updated);
                              addLog(
                                q.isActive ? "手動停用問卷" : "手動啟用問卷",
                                q.title,
                                `問卷與通道狀態切換為: ${!q.isActive ? "在線啟用" : "手動停用"}`
                              );
                            }}
                            className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer ${
                              q.isActive 
                                ? "bg-amber-100 text-amber-800" 
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {q.isActive ? "手動下架/停用" : "重新啟用問卷"}
                          </button>
                          
                          <button
                            id={`delete-survey-completely-${q.id}`}
                            onClick={() => handleDeleteSurvey(q.id, q.title)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="刪除此問卷數據"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Add new Query system inside this survey */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-3">
                        <div className="text-xs font-extrabold text-slate-700">➕ 為此問卷指派新的「防護子查詢子系統」</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400">子查詢子系統顯示名稱</label>
                            <input
                              id={`query-input-name-${q.id}`}
                              type="text"
                              value={configNewQueryName}
                              onChange={(e) => setConfigNewQueryName(e.target.value)}
                              placeholder="例如: 設備科專用查詢頻道"
                              className="w-full bg-slate-50 border p-1.5 rounded text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400">指定此通道「更正修改權限」的題目範圍</label>
                            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 rounded border max-h-24 overflow-y-auto">
                              {q.questions.map((ques) => {
                                const isChecked = configNewQueryEditable.includes(ques.id);
                                return (
                                  <label key={ques.id} className="flex items-center space-x-1.5 text-[9px] bg-white px-1.5 py-0.5 rounded cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setConfigNewQueryEditable(prev => [...prev, ques.id]);
                                        } else {
                                          setConfigNewQueryEditable(prev => prev.filter(i => i !== ques.id));
                                        }
                                      }}
                                      className="w-2.5 h-2.5 rounded text-amber-600"
                                    />
                                    <span className="truncate max-w-[80px]" title={ques.title}>{ques.title}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          <div className="flex items-center space-x-2">
                            <input
                              id={`query-pw-checkbox-${q.id}`}
                              type="checkbox"
                              checked={configNewQueryPwReq}
                              onChange={(e) => setConfigNewQueryPwReq(e.target.checked)}
                              className="w-3.5 h-3.5 text-indigo-600 rounded"
                            />
                            <span className="text-[11px] font-bold text-slate-600">查詢解鎖密碼限制防護</span>
                          </div>

                          {configNewQueryPwReq && (
                            <input
                              id={`query-pw-input-${q.id}`}
                              type="text"
                              value={configNewQueryPw}
                              onChange={(e) => setConfigNewQueryPw(e.target.value)}
                              placeholder="配置查詢端解鎖密碼..."
                              className="w-full bg-slate-50 border p-1 rounded text-xs px-2 font-mono"
                            />
                          )}
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            id={`submit-new-subsystem-btn-${q.id}`}
                            onClick={() => handleAddQuerySubsystem(q.id)}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-1 px-4 rounded cursor-pointer"
                          >
                            確設定並建立該專利子查詢系統分流
                          </button>
                        </div>
                      </div>

                      {/* Display active query systems of this Questionnaire */}
                      {q.querySystems && q.querySystems.length > 0 && (
                        <div className="bg-slate-200/30 p-3 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">已指派之安全子系統通道 (互不干涉切換)：</span>
                          <div className="divide-y divide-slate-100 bg-white rounded-lg p-2 font-mono space-y-1">
                            {q.querySystems.map((sys) => (
                              <div key={sys.id} className="flex justify-between items-center text-[11px] py-1.5 px-1">
                                <div>
                                  <span className="font-bold text-slate-700">{sys.name}</span>
                                  <span className="text-[9px] text-slate-400 ml-2">({sys.passwordRequired ? `特權密碼: ${sys.password}` : "公開可存取查詢"})</span>
                                </div>
                                <button
                                  id={`remove-query-sub-${sys.id}`}
                                  onClick={() => handleDeleteQuerySubsystem(q.id, sys.id, sys.name)}
                                  className="text-rose-500 hover:text-rose-700 text-[10px] font-semibold"
                                >
                                  卸載通道
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: RBAC & Promotion Approval center (Super Admin only) */}
          {activeTab === "rbac" && currentUser.role === UserRole.SUPER_ADMIN && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">👤 角色控制與晉升批准中心 (RBAC控制模組)</h2>
                <p className="text-slate-500 text-xs mt-1">
                  精細化分級制度、核定操作人員星等上限與指派表格，並批准 3 星分析員/操作員的升遷案件。
                </p>
              </div>

              {/* Promotions Approvals list */}
              <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-3.5">
                <h3 className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                  <ArrowUpCircle className="w-4 h-4 text-amber-600" />
                  <span>晉升審核專區 (星級升職核備)</span>
                </h3>

                <div className="space-y-2">
                  {promotions.filter(p => p.status === "PENDING").length > 0 ? (
                    promotions.filter(p => p.status === "PENDING").map((app) => (
                      <div key={app.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="font-mono text-xs">
                          <p className="text-slate-500">申請時間: {app.createdAt}</p>
                          <p className="text-slate-800 font-bold mt-1">
                            申請人員: <span className="text-indigo-600">{app.username}</span>
                          </p>
                          <p className="text-slate-600 mt-1">
                            當前職級: <span className="p-1 bg-slate-100 rounded text-[10px]">{app.currentRole} ({app.currentStar}星)</span>
                            <span className="mx-1">→</span> 
                            期望晉升: <span className="p-1 bg-indigo-50 text-indigo-800 font-bold rounded text-[10px]">{app.targetRole} {app.targetStar ? `(${app.targetStar}星)` : ""}</span>
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            id={`approve-promo-btn-${app.id}`}
                            onClick={() => handleApprovePromo(app)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>准予升職</span>
                          </button>
                          <button
                            id={`reject-promo-btn-${app.id}`}
                            onClick={() => handleRejectPromo(app)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-lg flex items-center space-x-1 border cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>否決駁回</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">目前無任何待核可的職級晉升案件。</p>
                  )}
                </div>
              </div>

              {/* 新增全新帳號專區 */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <PlusCircle className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-700">建立新系統帳號 (新增人員成員)</h3>
                </div>

                <form onSubmit={handleCreateUser} className="p-5 bg-blue-50/40 rounded-2xl border border-blue-100/60 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">帳號名稱 (Username)</label>
                    <input
                      type="text"
                      required
                      placeholder="例如: operator4"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:border-blue-500 font-mono outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">存取密碼 (Password)</label>
                    <input
                      type="text"
                      required
                      placeholder="請輸入密碼"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">預派角色 (Role)</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:border-blue-500 outline-none"
                    >
                      <option value={UserRole.OPERATOR}>操作員 (Operator)</option>
                      <option value={UserRole.ANALYST}>分析員 (Analyst)</option>
                      <option value={UserRole.SYSTEM_ADMIN}>系統管理員 (System Admin)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    {(newUserRole === UserRole.OPERATOR || newUserRole === UserRole.ANALYST) ? (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">初始認證星等</label>
                        <select
                          value={newUserStar}
                          onChange={(e) => setNewUserStar(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:border-blue-500 outline-none font-mono"
                        >
                          <option value={1}>⭐ 1星 (可指派 1 張問卷)</option>
                          <option value={2}>⭐⭐ 2星 (可指派 2 張問卷)</option>
                          <option value={3}>⭐⭐⭐ 3星 (可指派 3 張問卷)</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block">限制說明</label>
                        <p className="text-[10px] text-slate-400 mt-1">系統管理員自帶所有表格管理權，不需設定星等。</p>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-4 flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2 hover:bg-blue-700 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-colors"
                    >
                      確認新增此帳號
                    </button>
                  </div>
                </form>
              </div>

              {/* Edit User Roles in detail */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-700">帳號屬性、核定星等與表格指派調整 (RBAC控制規則)</h3>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">請選取欲調整的系統帳號</label>
                    <select
                      id="rbac-user-select"
                      value={rbacSelectedUser}
                      onChange={(e) => setRbacSelectedUser(e.target.value)}
                      className="bg-white border rounded text-xs p-1.5 focus:border-indigo-500 font-bold text-slate-700 min-w-[200px]"
                    >
                      <option value="">-- 請選取用戶 --</option>
                      {Object.keys(rbacUsers).filter(u => u !== "super_admin").map((uname) => (
                        <option key={uname} value={uname}>
                          {uname} [當前: {rbacUsers[uname].role === UserRole.SYSTEM_ADMIN ? "系統管理員" : rbacUsers[uname].role === UserRole.OPERATOR ? "操作員" : "分析員"} {rbacUsers[uname].starLevel ? `${rbacUsers[uname].starLevel}星` : ""}]
                        </option>
                      ))}
                    </select>
                  </div>

                  {rbacSelectedUser && rbacUsers[rbacSelectedUser] && (
                    <div className="bg-white p-4 border border-slate-200/80 rounded-xl space-y-4 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400">目前帳號職級狀態</span>
                        <p className="text-slate-800 font-bold text-sm">
                          {rbacSelectedUser} [密碼: {rbacUsers[rbacSelectedUser].password}]
                        </p>
                      </div>

                      {rbacUsers[rbacSelectedUser].role !== UserRole.SYSTEM_ADMIN ? (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-slate-500 block">核發星階設定</label>
                            <div className="flex space-x-2">
                              {[1, 2, 3].map((num) => (
                                <button
                                  key={num}
                                  id={`rbac-star-btn-${num}`}
                                  type="button"
                                  onClick={() => {
                                    const uList = { ...rbacUsers };
                                    uList[rbacSelectedUser].starLevel = num;
                                    setRbacUsers(uList);
                                  }}
                                  className={`px-3 py-1.5 border text-xs font-bold rounded-lg duration-150 cursor-pointer ${
                                    rbacUsers[rbacSelectedUser].starLevel === num
                                      ? "bg-slate-900 border-slate-950 text-white"
                                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  ⭐ {num}星級
                                </button>
                              ))}
                            </div>
                            <p className="text-[9px] text-slate-400">
                              防範權限浮溢規則：1星最多分派1張表格、2星2張、3星3張。保存時多餘指定的表格會被依序切除。
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-slate-500 block">
                              指定可管理表格 (目前選取：{(rbacUsers[rbacSelectedUser].assignedTables || []).length} / {rbacUsers[rbacSelectedUser].starLevel || 1} 張)
                            </label>
                            
                            <div className="flex flex-col space-y-1.5 border p-3 rounded-lg max-h-36 overflow-y-auto bg-slate-50">
                              {questionnaires.map((q) => {
                                const isChecked = (rbacUsers[rbacSelectedUser].assignedTables || []).includes(q.id);
                                return (
                                  <label key={q.id} className="flex items-center space-x-2 font-sans text-xs text-slate-700 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const uList = { ...rbacUsers };
                                        let currentAlloc = uList[rbacSelectedUser].assignedTables || [];
                                        if (e.target.checked) {
                                          currentAlloc = [...currentAlloc, q.id];
                                        } else {
                                          currentAlloc = currentAlloc.filter((item: string) => item !== q.id);
                                        }
                                        uList[rbacSelectedUser].assignedTables = currentAlloc;
                                        setRbacUsers(uList);
                                      }}
                                      className="w-4 h-4 text-indigo-600 border-slate-200 rounded"
                                    />
                                    <span className="font-medium">{q.title}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">({q.id})</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          <div className="pt-2 flex justify-end">
                            <button
                              id="rbac-submit-user-update"
                              onClick={() => handleSaveUserRBAC(
                                rbacSelectedUser,
                                rbacUsers[rbacSelectedUser].starLevel,
                                rbacUsers[rbacSelectedUser].assignedTables || []
                              )}
                              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm"
                            >
                              確設定儲存 RBAC 控制授權
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-3 bg-indigo-50 text-indigo-950 font-bold rounded-lg border border-indigo-100">
                          🛡️ 自帶全面問卷管理權。系統管理員無需也無法手動分指表格（自帶全部表格的可讀與線上修正編輯更正權利）。
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: Password change center */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">🔒 變更個人登入後台密碼</h2>
                <p className="text-slate-500 text-xs mt-1">為了資安考量，建議您定期更新自身後台帳密，防止機敏問卷與個資洩漏。</p>
              </div>

              <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                {profileError && (
                  <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs font-bold rounded">
                    ⚠️ {profileError}
                  </div>
                )}

                {profileMsg && (
                  <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs font-bold rounded">
                    {profileMsg}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">輸入舊安全密碼</label>
                  <input
                    id="profile-old-password"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="請輸入現有密碼"
                    className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">輸入新安全密碼</label>
                  <input
                    id="profile-new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="密碼長度建議六位字符以上"
                    className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">再次確認輸入新密碼</label>
                  <input
                    id="profile-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="請重複新密碼"
                    className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                <div className="pt-2">
                  <button
                    id="profile-password-submit-btn"
                    type="submit"
                    className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all"
                  >
                    更新登入通行密碼
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 6: System operation audit trail */}
          {activeTab === "logs" && (
            <LogView 
              logs={logs} 
              onClearLogs={() => {
                if (confirm("您確認要彻底清除所有的歷史操作稽核日誌嗎？此行為將無法復原。")) {
                  onUpdateLogList([]);
                  alert("日誌已徹底清空。");
                }
              }}
              showAdminPrivileges={currentUser.role === UserRole.SUPER_ADMIN}
            />
          )}

        </div>
      </div>

      {/* ONLINE EDIT MODAL (操作員與管理員可修改已經在資料庫的問卷答案) */}
      {editingResponse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="edit-response-modal-backdrop">
          <div className="bg-white rounded-2xl shadow-2xl border max-w-xl w-full max-h-[85vh] overflow-y-auto" id="edit-response-modal">
            
            <div className="p-6 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] bg-amber-500 text-slate-900 font-bold px-2 py-0.5 rounded-full select-none">特權資料覆寫</span>
                <h3 className="text-md font-bold mt-1">線上修改更正資料庫答案 ({editingResponse.id})</h3>
              </div>
              <button
                id="close-edit-response-modal"
                onClick={() => setEditingResponse(null)}
                className="text-white hover:text-slate-300 font-bold text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {editingMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold">
                  {editingMsg}
                </div>
              )}

              {currentSurvey?.questions.map((q) => {
                const curentAns = editingAnswers[q.id];
                return (
                  <div key={q.id} className="p-4 bg-slate-50 border rounded-xl space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">{q.title}</label>
                    
                    {q.type === "SINGLE_CHOICE" && q.options && (
                      <select
                        id={`edit-modal-select-${q.id}`}
                        value={curentAns || ""}
                        onChange={(e) => setEditingAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        className="w-full bg-white border rounded text-xs p-1.5 focus:border-amber-500"
                      >
                        <option value="">--請選擇--</option>
                        {q.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {q.type === "MULTI_CHOICE" && q.options && (
                      <div className="space-y-1" id={`edit-modal-multi-${q.id}`}>
                        {q.options.map(opt => {
                          const list = (curentAns as string[]) || [];
                          const isChecked = list.includes(opt);
                          return (
                            <label key={opt} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  let newList = [...list];
                                  if (e.target.checked) {
                                    newList.push(opt);
                                  } else {
                                    newList = newList.filter(item => item !== opt);
                                  }
                                  setEditingAnswers(prev => ({ ...prev, [q.id]: newList }));
                                }}
                                className="w-4 h-4 rounded text-indigo-600"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {(q.type === "SHORT_TEXT" || q.type === "PARAGRAPH") && (
                      <textarea
                        id={`edit-modal-text-${q.id}`}
                        rows={q.type === "PARAGRAPH" ? 3 : 1}
                        value={curentAns || ""}
                        onChange={(e) => setEditingAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        className="w-full bg-white border rounded p-2 text-xs focus:border-amber-500"
                      />
                    )}

                    {q.type === "RATING" && (
                      <div className="flex items-center space-x-1" id={`edit-modal-rating-${q.id}`}>
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setEditingAnswers(prev => ({ ...prev, [q.id]: num }))}
                            className="focus:outline-none"
                          >
                            <svg
                              className={`w-5 h-5 ${
                                num <= (curentAns || 0) ? "text-amber-400 fill-amber-400" : "text-slate-200"
                              }`}
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end space-x-2 rounded-b-2xl">
              <button
                id="edit-modal-cancel"
                onClick={() => setEditingResponse(null)}
                className="py-1.5 px-4 bg-white border rounded text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                關閉
              </button>
              {/* Prominent save button */}
              <button
                id="edit-modal-submit"
                onClick={handleSaveModalResponse}
                className="py-1.5 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 text-white font-bold text-xs rounded shadow border border-amber-300 cursor-pointer"
              >
                ⚡ 確定線上修改更正
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
