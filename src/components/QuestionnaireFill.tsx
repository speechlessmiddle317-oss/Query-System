import React, { useState, useEffect } from "react";
import { Questionnaire, SurveyResponse } from "../types";
import { Calendar, CheckCircle2, Lock, ArrowRight, ArrowLeft, Send, Sparkles, Mail } from "lucide-react";

interface QuestionnaireFillProps {
  survey: Questionnaire;
  onSubmit: (response: Omit<SurveyResponse, "id" | "submittedAt">) => void;
  onBackList?: () => void;
  // If navigated directly via hash
  isDirectLink?: boolean;
}

export default function QuestionnaireFill({ survey, onSubmit, onBackList, isDirectLink = false }: QuestionnaireFillProps) {
  const [passwordInput, setPasswordInput] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(!survey.passwordRequired);
  const [passwordError, setPasswordError] = useState("");

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // Check custom activation time and expiration
  const [isWithinTime, setIsWithinTime] = useState(true);
  const [timeMessage, setTimeMessage] = useState("");

  useEffect(() => {
    const checkTimeValidity = () => {
      if (!survey.isActive) {
        setIsWithinTime(false);
        setTimeMessage("此問卷目前已被管理員手動停用。");
        return;
      }

      const now = new Date();
      if (survey.startTime) {
        const start = new Date(survey.startTime);
        if (now < start) {
          setIsWithinTime(false);
          setTimeMessage(`此問卷尚未開始，開放時間為：${new Date(survey.startTime).toLocaleString("zh-TW")}`);
          return;
        }
      }

      if (survey.endTime) {
        const end = new Date(survey.endTime);
        if (now > end) {
          setIsWithinTime(false);
          setTimeMessage(`此問卷已於 ${new Date(survey.endTime).toLocaleString("zh-TW")} 截止填寫。`);
          return;
        }
      }

      setIsWithinTime(true);
      setTimeMessage("");
    };

    checkTimeValidity();
    const interval = setInterval(checkTimeValidity, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [survey]);

  // Handle password submission
  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (passwordInput === survey.password) {
      setIsUnlocked(true);
    } else {
      setPasswordError("問卷密碼不正確，請重新輸入！");
    }
  };

  const currentQuestion = survey.questions[currentStep];

  // Answer handler
  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setErrors(prev => ({ ...prev, [questionId]: "" }));
  };

  // Multiple selection checkbox helper
  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    const currentList = (answers[questionId] as string[]) || [];
    let newList: string[];
    if (checked) {
      newList = [...currentList, option];
    } else {
      newList = currentList.filter(item => item !== option);
    }
    handleAnswerChange(questionId, newList);
  };

  // Step validation
  const validateStep = (): boolean => {
    if (!currentQuestion) return true;
    if (currentQuestion.required) {
      const answer = answers[currentQuestion.id];
      if (answer === undefined || answer === null || (Array.isArray(answer) && answer.length === 0) || (typeof answer === "string" && answer.trim() === "")) {
        setErrors(prev => ({ ...prev, [currentQuestion.id]: "本題為必填題，請回答後再繼續" }));
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < survey.questions.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmitAnswers = () => {
    if (!validateStep()) return;

    // Trigger submit
    onSubmit({
      surveyId: survey.id,
      answers,
      submittedBy: emailInput || "匿名讀者"
    });

    setSubmitted(true);

    // Simulate auto-email notification
    if (survey.emailNotificationEnabled && emailInput) {
      setEmailSent(true);
    }
  };

  const progressPercent = survey.questions.length > 0 
    ? Math.round(((currentStep + 1) / survey.questions.length) * 100) 
    : 100;

  // Unlocked screen check
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12" id="fill-password-required-wrapper">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-8 text-center text-slate-800">
          <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-2xl mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">{survey.title}</h2>
          <p className="text-slate-500 text-sm mt-2 mb-6">本問卷為保護填寫權私密，已啟用密碼安全防護。請輸入密碼以進行填寫。</p>

          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div>
              <input
                id="survey-password-verify-input"
                type="password"
                placeholder="請輸入密碼..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              />
              {passwordError && (
                <p className="text-xs text-rose-500 font-bold mt-2">{passwordError}</p>
              )}
            </div>
            <button
              id="survey-password-verify-submit"
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl tracking-wider shadow-md transition-all cursor-pointer"
            >
              進入填寫頁面
            </button>
          </form>

          {!isDirectLink && onBackList && (
            <button
              id="survey-password-verify-cancel"
              onClick={onBackList}
              className="mt-6 text-sm text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
            >
              ← 返回問卷大廳
            </button>
          )}
        </div>
      </div>
    );
  }

  // Time Validity check
  if (!isWithinTime) {
    return (
      <div className="max-w-md mx-auto my-12" id="fill-time-expired-wrapper">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-8 text-center">
          <div className="inline-flex p-3 bg-amber-50 text-amber-600 rounded-2xl mb-4">
            <Calendar className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">{survey.title}</h2>
          <div className="p-4 bg-amber-50 rounded-xl text-amber-800 text-sm font-medium border border-amber-100 leading-relaxed mb-6">
            ⚠️ {timeMessage}
          </div>
          {!isDirectLink && onBackList && (
            <button
              id="survey-back-from-expired"
              onClick={onBackList}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              ← 返回問卷清單
            </button>
          )}
        </div>
      </div>
    );
  }

  // Answer Submitted screen
  if (submitted) {
    return (
      <div className="max-w-xl mx-auto my-12" id="fill-submitted-success-wrapper">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-8 text-center text-slate-800">
          <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-2xl mb-4 relative">
            <CheckCircle2 className="w-12 h-12" />
            <Sparkles className="w-4 h-4 text-emerald-400 absolute top-1 right-1 animate-bounce" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-800">問卷提交完成！</h2>
          <p className="text-slate-500 text-sm mt-2 mb-6">非常感謝您抽出寶貴時間填報，您的回饋我們已完整記錄！</p>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-left space-y-4 mb-8">
            <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2">📋 您的填寫內容備份摘要</h3>
            <div className="space-y-3 text-sm">
              {survey.questions.map((q) => {
                const ans = answers[q.id];
                return (
                  <div key={q.id} className="space-y-1">
                    <span className="font-semibold text-slate-600">{q.title}</span>
                    <p className="text-slate-800 bg-white p-2 rounded-lg border border-slate-100 font-mono text-xs">
                      {ans === undefined || ans === null || (Array.isArray(ans) && ans.length === 0)
                        ? "（無回答）"
                        : Array.isArray(ans)
                        ? ans.join(", ")
                        : String(ans)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Email Mechanism */}
          {survey.emailNotificationEnabled && (
            <div className="max-w-md mx-auto p-5 bg-blue-50 border border-blue-100 rounded-2xl mb-8 text-left space-y-3">
              <div className="flex items-center space-x-2 text-blue-800 font-bold text-sm">
                <Mail className="w-4 h-4" />
                <span>自動通知機制</span>
              </div>
              <p className="text-xs text-blue-700">此問卷設定了自動發送完成提醒通知。請在下方輸入您的電子郵件信箱以接收填寫憑證備份：</p>
              
              {!emailSent ? (
                <div className="flex space-x-2">
                  <input
                    id="submitter-email-input"
                    type="email"
                    placeholder="example@yourdomain.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    id="submitter-email-send-button"
                    onClick={() => {
                      if (emailInput.trim()) {
                        setEmailSent(true);
                      }
                    }}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    發送
                  </button>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg text-center flex items-center justify-center space-x-2 animate-pulse">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>已自動發送信件通知至 {emailInput}！</span>
                </div>
              )}
            </div>
          )}

          {!isDirectLink && onBackList && (
            <button
              id="survey-submit-finish-back"
              onClick={onBackList}
              className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl cursor-pointer"
            >
              回到問卷大廳
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto my-6" id="survey-active-fill-container">
      {/* Questionnaire Cover */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden mb-6">
        <div className="p-8 bg-slate-900 text-white relative">
          <div className="absolute top-4 right-4 bg-blue-600 text-white font-mono text-xs font-bold px-2.5 py-1 rounded-full">
            問卷編號: {survey.id}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50">{survey.title}</h1>
          <p className="text-slate-300 text-sm mt-3 leading-relaxed">{survey.description}</p>
        </div>

        {/* Progress Bar */}
        <div className="px-8 py-4 bg-slate-50 border-b border-blue-50 flex items-center justify-between">
          <div className="flex-1 mr-4">
            <div className="flex justify-between items-center text-xs text-blue-800 font-semibold mb-1">
              <span>問卷填寫進度</span>
              <span>第 {currentStep + 1} 題 / 共 {survey.questions.length} 題 ({progressPercent}%)</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="p-8 space-y-6">
          {currentQuestion ? (
            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 text-lg font-extrabold font-mono mt-0.5">{currentStep + 1}.</span>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {currentQuestion.title}
                    {currentQuestion.required && (
                      <span className="text-rose-500 text-sm font-bold ml-1.5" title="必填項目">* 必填</span>
                    )}
                  </h2>
                </div>
              </div>

              {/* Renders option-specific fields */}
              <div className="pl-6 pt-2">
                {currentQuestion.type === "SINGLE_CHOICE" && (
                  <div className="space-y-2.5" id={`question-choice-${currentQuestion.id}`}>
                    {currentQuestion.options?.map((opt, oIdx) => (
                      <label 
                        key={oIdx} 
                        className={`flex items-center space-x-3 p-4 rounded-xl border border-slate-200 hover:bg-blue-50 cursor-pointer transition-all ${
                          answers[currentQuestion.id] === opt 
                            ? "bg-blue-50/70 border-blue-200 ring-2 ring-blue-100" 
                            : "bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${currentQuestion.id}`}
                          value={opt}
                          checked={answers[currentQuestion.id] === opt}
                          onChange={() => handleAnswerChange(currentQuestion.id, opt)}
                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-slate-800 text-sm font-medium">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {currentQuestion.type === "MULTI_CHOICE" && (
                  <div className="space-y-2.5" id={`question-multi-${currentQuestion.id}`}>
                    <p className="text-xs text-slate-400 mb-2">※ 複選題（可多選）</p>
                    {currentQuestion.options?.map((opt, oIdx) => {
                      const list = (answers[currentQuestion.id] as string[]) || [];
                      const isChecked = list.includes(opt);
                      return (
                        <label 
                          key={oIdx} 
                          className={`flex items-center space-x-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-100 cursor-pointer transition-all ${
                            isChecked
                              ? "bg-blue-50/70 border-blue-200 ring-2 ring-blue-50" 
                              : "bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleCheckboxChange(currentQuestion.id, opt, e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-slate-800 text-sm font-medium">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === "SHORT_TEXT" && (
                  <input
                    id={`question-text-${currentQuestion.id}`}
                    type="text"
                    value={answers[currentQuestion.id] || ""}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="請輸入您的回答內容..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 text-slate-800 text-sm outline-none transition-all"
                  />
                )}

                {currentQuestion.type === "PARAGRAPH" && (
                  <textarea
                    id={`question-paragraph-${currentQuestion.id}`}
                    rows={4}
                    value={answers[currentQuestion.id] || ""}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="請在此輸入您的詳細反饋與具體建議..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 text-slate-800 text-sm outline-none transition-all resize-none"
                  />
                )}

                {currentQuestion.type === "RATING" && (
                  <div className="space-y-3" id={`question-rating-${currentQuestion.id}`}>
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const score = answers[currentQuestion.id] || 0;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleAnswerChange(currentQuestion.id, star)}
                            className="p-1 focus:outline-none focus:scale-110 duration-150 transition-all cursor-pointer"
                            title={`${star} 分`}
                          >
                            <svg
                              className={`w-10 h-10 ${
                                star <= score ? "text-amber-400 fill-amber-400" : "text-slate-200"
                              } transition-colors`}
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                        );
                      })}
                      {answers[currentQuestion.id] && (
                        <span className="text-sm font-bold text-slate-500 ml-4">
                          得分: <code className="text-blue-600 text-lg">{answers[currentQuestion.id]}</code> / 5
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between max-w-xs text-xs text-slate-400">
                      <span>非常不滿意 (1分)</span>
                      <span>極度滿意 (5分)</span>
                    </div>
                  </div>
                )}

                {errors[currentQuestion.id] && (
                  <p className="text-xs text-rose-500 mt-2.5 font-bold animate-pulse">{errors[currentQuestion.id]}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-400 py-8">本問卷無有效題目，請管理員排解。</p>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            id="survey-nav-prev"
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`flex items-center space-x-1.5 px-4 h-11 text-sm font-bold rounded-xl border transition-all ${
              currentStep === 0
                ? "border-slate-100 text-slate-300 cursor-not-allowed"
                : "border-slate-200 text-slate-600 bg-white hover:bg-slate-100 cursor-pointer"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>上一題</span>
          </button>

          {currentStep === survey.questions.length - 1 ? (
            <div className="flex items-center space-x-2">
              {survey.emailNotificationEnabled && !emailInput && (
                <div className="hidden md:flex items-center mr-2">
                  <input
                    id="pre-submit-email"
                    type="email"
                    placeholder="請輸入您的信箱以發公信..."
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              )}
              <button
                id="survey-nav-submit"
                type="button"
                onClick={handleSubmitAnswers}
                className="flex items-center space-x-2 px-6 h-11 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-black rounded-xl shadow-md transition-all cursor-pointer"
              >
                <span>送出問卷答案</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="survey-nav-next"
              type="button"
              onClick={handleNext}
              className="flex items-center space-x-1.5 px-6 h-11 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <span>下一題</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!isDirectLink && onBackList && (
        <button
          id="survey-nav-cancel-all"
          type="button"
          onClick={onBackList}
          className="text-sm font-semibold text-slate-400 hover:text-slate-600 tracking-wider flex items-center space-x-1 mx-auto cursor-pointer"
        >
          <span>← 取消選取，返回填寫大廳</span>
        </button>
      )}
    </div>
  );
}
