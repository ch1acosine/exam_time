import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, Users, Megaphone, Smartphone, Lock, Eye, EyeOff, ShieldCheck, Plus, Trash2, Bell, RefreshCw, CheckCircle, ChevronLeft } from "lucide-react";
import { ExamRoom, Reminder } from "../types";

interface RemoteScreenProps {
  roomId: string;
  onBackToHome: () => void;
}

export default function RemoteScreen({ roomId, onBackToHome }: RemoteScreenProps) {
  // Authentication states
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Sync state
  const [room, setRoom] = useState<ExamRoom | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  // Input states (initialized from server payload)
  const [newEndTime, setNewEndTime] = useState("10:00");
  const [actualStudents, setActualStudents] = useState(0);
  const [newReminderText, setNewReminderText] = useState("");

  // Check if password has already been verified in this session to prevent nagging re-verification
  useEffect(() => {
    const savedPassword = sessionStorage.getItem(`exam_remote_pwd_${roomId}`);
    if (savedPassword) {
      setPassword(savedPassword);
      verifyPasswordDirectly(savedPassword);
    } else {
      fetchRoomPayloadSilent();
    }
  }, [roomId]);

  // Read latest state once
  const fetchRoomPayloadSilent = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (res.ok) {
        const data = (await res.json()) as ExamRoom;
        setRoom(data);
        setNewEndTime(data.endTime);
        setActualStudents(data.actualStudents);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const verifyPasswordDirectly = async (pwdToVerify: string) => {
    setIsVerifying(true);
    setAuthError("");
    try {
      const res = await fetch(`/api/rooms/${roomId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwdToVerify }),
      });

      if (res.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem(`exam_remote_pwd_${roomId}`, pwdToVerify);
        fetchRoomPayloadSilent();
      } else {
        const errData = await res.json();
        setAuthError(errData.error || "密碼不正確，請重新檢查大螢幕上的密碼。");
        sessionStorage.removeItem(`exam_remote_pwd_${roomId}`);
      }
    } catch (e) {
      setAuthError("連線伺服器失敗，請確認網路連線。");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setAuthError("請輸入安全授權密碼");
      return;
    }
    verifyPasswordDirectly(password.trim());
  };

  // Push updates helper
  const sendUpdatesToServer = async (updates: Partial<ExamRoom>) => {
    setSaveStatus("saving");
    setSaveError("");
    try {
      const res = await fetch(`/api/rooms/${roomId}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: password.trim(),
          stateUpdates: updates,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRoom(data.room);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 1500);
      } else {
        const errData = await res.json();
        setSaveError(errData.error || "儲存更新失敗");
        setSaveStatus("error");
      }
    } catch (e) {
      setSaveError("連線異常");
      setSaveStatus("error");
    }
  };

  // End Time Adjust handlers
  const handleEndTimeChangeSubmit = (timeVal: string) => {
    setNewEndTime(timeVal);
    sendUpdatesToServer({ endTime: timeVal });
  };

  // Handy tactile addition of 5, 10 or 20 minutes to existing end time
  const handleQuickAddMinutes = (minutesToAdd: number) => {
    const targetTimeStr = room ? room.endTime : newEndTime;
    const [hours, mins] = targetTimeStr.split(":").map(Number);
    if (!isNaN(hours) && !isNaN(mins)) {
      let totalMins = hours * 60 + mins + minutesToAdd;
      if (totalMins >= 1440) totalMins -= 1440; // wrapped
      const newH = String(Math.floor(totalMins / 60)).padStart(2, "0");
      const newM = String(totalMins % 60).padStart(2, "0");
      const adjustedTime = `${newH}:${newM}`;
      setNewEndTime(adjustedTime);
      sendUpdatesToServer({ endTime: adjustedTime });
    }
  };

  // Present Student Adjust handlers (taps)
  const handleUpdateStudentCount = (newVal: number) => {
    const minZero = Math.max(0, newVal);
    setActualStudents(minZero);
    sendUpdatesToServer({ actualStudents: minZero });
  };

  // Reminders Manager
  const handleAddReminder = () => {
    if (!newReminderText.trim() || !room) return;
    const nowStr = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
    const newItems: Reminder[] = [
      ...room.reminders,
      {
        id: Math.random().toString(),
        text: newReminderText.trim(),
        time: nowStr,
      },
    ];
    setNewReminderText("");
    sendUpdatesToServer({ reminders: newItems });
  };

  const handleDeleteReminder = (idToDelete: string) => {
    if (!room) return;
    const filtered = room.reminders.filter((rem) => rem.id !== idToDelete);
    sendUpdatesToServer({ reminders: filtered });
  };

  // One-click 10 min trigger alert toggle
  const toggleTenMinAlert = () => {
    if (!room) return;
    const targetState = !room.tenMinRemainingAlert;
    sendUpdatesToServer({ tenMinRemainingAlert: targetState });
  };

  // Clear specific server pushed alert messages
  const clearCustomPushedNotification = () => {
    sendUpdatesToServer({ alertMessage: null });
  };

  // Push arbitrary customized alert banner overlay text
  const [customAlertText, setCustomAlertText] = useState("");
  const handlePushCustomAlert = () => {
    if (!customAlertText.trim()) return;
    sendUpdatesToServer({ alertMessage: customAlertText.trim() });
    setCustomAlertText("");
  };

  // Unsubscribe session
  const handleLogout = () => {
    sessionStorage.removeItem(`exam_remote_pwd_${roomId}`);
    setIsAuthenticated(false);
    setPassword("");
  };

  // Display authentication form if and only if not logged in
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl text-center"
        >
          {/* Padlock Icon */}
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-white mb-1">手機遙控面板認證</h2>
          <p className="text-xs text-slate-400 mb-5">請輸入這間投影螢幕顯示的 3 碼安全認證密碼（ Room: <span className="font-mono text-indigo-400 font-bold">{roomId}</span> ）</p>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="安全配對密碼"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-center font-bold tracking-widest text-lg text-slate-100 focus:outline-none focus:border-red-500 transition font-mono"
                id="input-remote-password"
                maxLength={10}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {authError && <p className="text-xs font-semibold text-red-400 leading-relaxed">{authError}</p>}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3 bg-red-650/90 hover:bg-red-600 bg-red-600 text-white font-bold rounded-xl transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
              id="btn-remote-auth-submit"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>正在授權登入...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>授權配對並進入</span>
                </>
              )}
            </button>
          </form>

          <button
            onClick={onBackToHome}
            className="mt-6 text-xs text-slate-500 hover:text-slate-400 flex items-center justify-center gap-1 mx-auto"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>回到首頁</span>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 pb-12">
      {/* Remote header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-red-500/10 text-red-500 rounded-lg">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">{room ? room.subject : "遙控器主控"}</h4>
            <p className="text-[10px] text-slate-500 font-mono">Room: {roomId}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Quick status bar indicator */}
          <div className="flex items-center space-x-1 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
            {saveStatus === "saving" && (
              <>
                <RefreshCw className="w-2.5 h-2.5 animate-spin text-indigo-400" />
                <span>儲存中</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-emerald-400">已同步</span>
              </>
            )}
            {saveStatus === "idle" && (
              <>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                <span>已就緒</span>
              </>
            )}
            {saveStatus === "error" && (
              <>
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                <span className="text-red-400">連線失敗</span>
              </>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 px-2 py-1 border border-slate-700 rounded cursor-pointer font-medium"
            id="btn-remote-logout"
          >
            登出
          </button>
        </div>
      </div>

      {room ? (
        <div className="flex-1 p-4 max-w-md mx-auto w-full space-y-6 mt-2">
          {/* Live snapshot card */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col space-y-3 shadow-md">
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">大螢幕連線數據摘要</span>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500">時程範圍</span>
                <p className="text-sm font-semibold mt-0.5">{room.startTime} - {room.endTime}</p>
              </div>
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500">教室到考人數</span>
                <p className="text-sm font-semibold mt-0.5">{room.actualStudents} / {room.expectedStudents}人</p>
              </div>
            </div>
          </div>

          {/* Feature 1: Adjust Exam End Time (更動考試結束時間) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow shadow-indigo-950/20">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              更動考試結束時間
            </label>
            <p className="text-[10px] text-slate-500">考試即時彈性延長或縮短，大螢幕將在 1 秒內無縫調整</p>

            <div className="flex gap-2">
              <input
                type="time"
                value={newEndTime}
                onChange={(e) => handleEndTimeChangeSubmit(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-center text-slate-200 font-bold focus:outline-none focus:border-indigo-500 font-mono"
                id="remote-input-end-time"
              />
            </div>

            {/* Tactile increment addition buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => handleQuickAddMinutes(5)}
                className="py-1.5 bg-slate-800 hover:bg-slate-705 border border-slate-700 rounded-lg text-xs font-bold font-mono transition text-slate-300 cursor-pointer text-center"
              >
                +5 分鐘
              </button>
              <button
                onClick={() => handleQuickAddMinutes(10)}
                className="py-1.5 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-805/50 rounded-lg text-xs font-bold font-mono transition text-indigo-300 cursor-pointer text-center"
              >
                +10 分鐘
              </button>
              <button
                onClick={() => handleQuickAddMinutes(20)}
                className="py-1.5 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-805/50 rounded-lg text-xs font-bold font-mono transition text-indigo-300 cursor-pointer text-center"
              >
                +20 分鐘
              </button>
            </div>
          </div>

          {/* Feature 2: Attendance statistics counter (變更實到人數) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow shadow-emerald-950/15">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-400" />
              變更實到人數
            </label>
            <p className="text-[10px] text-slate-500">點擊加減號即時清點實到人數，自動算出教室缺考人數</p>

            <div className="flex items-center justify-between bg-slate-950 border border-slate-805 rounded-xl p-2">
              <button
                type="button"
                onClick={() => handleUpdateStudentCount(actualStudents - 1)}
                className="w-12 h-10 bg-slate-800 hover:bg-slate-700 text-slate-100 font-extrabold text-xl rounded-lg border border-slate-700 cursor-pointer"
                id="btn-student-minus"
              >
                -
              </button>

              <div className="text-center">
                <input
                  type="number"
                  value={actualStudents}
                  onChange={(e) => handleUpdateStudentCount(Number(e.target.value))}
                  className="w-20 bg-transparent text-center font-black text-2xl font-mono text-slate-100 focus:outline-none"
                  id="remote-input-students"
                  min={0}
                />
                <span className="text-[10px] text-slate-500 font-bold block">(可直接輸入輸入數值)</span>
              </div>

              <button
                type="button"
                onClick={() => handleUpdateStudentCount(actualStudents + 1)}
                className="w-12 h-10 bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-extrabold text-xl rounded-lg cursor-pointer"
                id="btn-student-plus"
              >
                +
              </button>
            </div>
          </div>

          {/* Feature 3: Actionable One-click "10 minutes remaining" Trigger Alert */}
          <div className={`border rounded-2xl p-4 space-y-3 shadow-md transition-colors ${
            room.tenMinRemainingAlert 
              ? "bg-red-950/40 border-red-550 text-red-100" 
              : "bg-slate-900 border-slate-800 text-slate-150"
          }`}>
            <label className="text-xs font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Bell className={`w-4 h-4 ${room.tenMinRemainingAlert ? "text-red-400 animate-bounce" : "text-amber-400"}`} />
                <span>提醒考試時間剩下十分鐘</span>
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-slate-700">快按鍵</span>
            </label>
            <p className="text-[10px] text-slate-500">
              點擊後將在投影大螢幕上方彈出超巨大的【 剩餘最後 10 分鐘 】警報框，吸引全班考試學生注意。
            </p>

            <button
              onClick={toggleTenMinAlert}
              className={`w-full py-3 rounded-xl font-bold transition duration-150 text-sm flex items-center justify-center gap-2 cursor-pointer ${
                room.tenMinRemainingAlert 
                  ? "bg-red-650/45 hover:bg-slate-800 text-red-200 border border-red-500-20" 
                  : "bg-red-600 hover:bg-red-550 text-white shadow shadow-red-900/30 font-semibold"
              }`}
              id="btn-toggle-10min-alert"
            >
              {room.tenMinRemainingAlert ? "⚠️ 廣播中（點擊關閉大螢幕警報）" : "🔔 廣播「剩餘最後10分鐘」指示"}
            </button>
          </div>

          {/* Feature 4: Custom pushed Notification Overlay text */}
          <div className="bg-slate-900 border border-slate-805 rounded-2xl p-4 space-y-3 shadow shadow-slate-950/20">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-amber-400" />
              發送即時重大廣播 (大字提醒)
            </label>
            <p className="text-[10px] text-slate-500">在投影螢幕上方顯示一列醒目的全班通知，例如「請將配分表更新至答案卡」</p>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customAlertText}
                  onChange={(e) => setCustomAlertText(e.target.value)}
                  placeholder="e.g. 104 題配分修正為 5 分"
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-550"
                  id="remote-input-custom-broadcast"
                />
                <button
                  onClick={handlePushCustomAlert}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer whitespace-nowrap font-medium"
                >
                  發送
                </button>
              </div>

              {room.alertMessage && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-200 flex items-center justify-between gap-1 mt-2">
                  <span className="font-semibold break-all">目前連線訊息：「{room.alertMessage}」</span>
                  <button
                    onClick={clearCustomPushedNotification}
                    className="p-1 text-amber-400 hover:text-white bg-slate-800/80 rounded border border-slate-700 text-[10px]"
                  >
                    清除
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Feature 5: Add/Edit reminders checklist (提醒考試事項) */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 space-y-3 shadow">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-400" />
              管理「提醒專區」列表
            </label>
            <p className="text-[10px] text-slate-500">在投影螢幕右方的叮嚀清單，隨時增加或刪除細節常規（如：手機關機）</p>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newReminderText}
                onChange={(e) => setNewReminderText(e.target.value)}
                placeholder="輸入叮嚀條目..."
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-250 focus:outline-none focus:border-indigo-550"
                id="remote-input-new-reminder"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddReminder();
                }}
              />
              <button
                onClick={handleAddReminder}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* List reminders currently on projector */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {room.reminders && room.reminders.length > 0 ? (
                room.reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="p-2 bg-slate-950/60 border border-slate-850 rounded-lg flex items-center justify-between text-xs text-slate-350 gap-2"
                  >
                    <div className="flex flex-col">
                      <span>{rem.text}</span>
                      <span className="text-[9px] text-slate-500 font-mono mt-0.5">{rem.time}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteReminder(rem.id)}
                      className="p-1 text-slate-500 hover:text-red-400 transition"
                      title="刪除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs italic text-slate-500 text-center py-2">大螢幕常規提醒清單為空</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center space-y-3 p-8 text-center">
          <RefreshCw className="w-10 h-10 text-slate-700 animate-spin" />
          <p className="text-slate-400 text-sm">正在獲取考場當前參數...</p>
        </div>
      )}
    </div>
  );
}
