import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, Users, Megaphone, Smartphone, HelpCircle, ArrowLeft, RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react";
import { ExamRoom } from "../types";

interface ProjectorScreenProps {
  roomId: string;
  onBackToHome: () => void;
}

export default function ProjectorScreen({ roomId, onBackToHome }: ProjectorScreenProps) {
  const [room, setRoom] = useState<ExamRoom | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [hasNewAlert, setHasNewAlert] = useState(false);

  // Big Clock ticking effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // SSE Stream logic to sync with mobile in real time
  useEffect(() => {
    setConnectionStatus("connecting");
    let eventSource: EventSource;

    function connectSSE() {
      const streamUrl = `/api/rooms/${roomId}/stream`;
      eventSource = new EventSource(streamUrl);

      eventSource.onopen = () => {
        setConnectionStatus("connected");
      };

      eventSource.onmessage = (event) => {
        try {
          const updatedRoom = JSON.parse(event.data) as ExamRoom;
          setRoom((prev) => {
            // Trigger animation or alert feedback if alert state changes
            if (prev && updatedRoom.alertMessage !== prev.alertMessage && updatedRoom.alertMessage) {
              setHasNewAlert(true);
            }
            if (prev && updatedRoom.tenMinRemainingAlert && !prev.tenMinRemainingAlert) {
              setHasNewAlert(true);
            }
            return updatedRoom;
          });
        } catch (error) {
          console.error("Error parsing SSE update:", error);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE stream error, retrying...", err);
        setConnectionStatus("error");
        eventSource.close();
        // retry in 3 seconds
        setTimeout(connectSSE, 3000);
      };
    }

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [roomId]);

  // Alert dismiss helper
  useEffect(() => {
    if (hasNewAlert) {
      const timer = setTimeout(() => {
        setHasNewAlert(false);
      }, 12000); // clear visual pulse after some seconds
      return () => clearTimeout(timer);
    }
  }, [hasNewAlert]);

  // Formatted Current Time
  const formatTime = (date: Date) => {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    return { h, m, s };
  };

  const timeParts = formatTime(currentTime);

  // Generate pairing URL
  const pairingUrl = `${window.location.origin}/room/${roomId}/remote`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pairingUrl)}`;

  // Helper metrics
  const isTimeRemainingAlertActive = room ? room.tenMinRemainingAlert : false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-150 flex flex-col font-sans select-none overflow-x-hidden">
      
      {/* Top utility action bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBackToHome}
            className="flex items-center space-x-1.5 hover:text-slate-200 transition px-2 py-1 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/45 rounded-md cursor-pointer"
            id="btn-projector-back-home"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>重新設定</span>
          </button>
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${
              connectionStatus === "connected" ? "bg-emerald-500" :
              connectionStatus === "connecting" ? "bg-amber-500 animate-ping" : "bg-red-500"
            }`}></span>
            <span className="font-mono text-[10px] uppercase">
              {connectionStatus === "connected" ? "主控連線中" : "連線重建中..."}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowPairingModal(true)}
            className="flex items-center space-x-1.5 hover:text-white transition px-3 py-1 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/25 rounded-md font-medium cursor-pointer"
            id="btn-trigger-pairing"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>手機遠端遙控配對</span>
          </button>
        </div>
      </div>

      {/* Main content body */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Massive Digital Clock in the top-center */}
        <div className="text-center w-full" id="mega-digital-clock-container">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="inline-flex items-center justify-center space-x-4 md:space-x-8 bg-slate-900/45 border border-slate-805/30 px-8 py-6 rounded-3xl backdrop-blur shadow-2xl relative"
          >
            {/* Hour Block */}
            <div className="flex flex-col">
              <span className="text-7xl sm:text-8xl md:text-9xl font-extrabold font-mono text-slate-100 tracking-tight glow-text-indigo">
                {timeParts.h}
              </span>
              <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-widest mt-1">Hours</span>
            </div>

            {/* Pulsing colon */}
            <span className="text-6xl sm:text-7xl md:text-8xl font-black text-indigo-500/80 animate-pulse font-mono pb-4">
              :
            </span>

            {/* Minute Block */}
            <div className="flex flex-col">
              <span className="text-7xl sm:text-8xl md:text-9xl font-extrabold font-mono text-slate-100 tracking-tight glow-text-indigo">
                {timeParts.m}
              </span>
              <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-widest mt-1">Minutes</span>
            </div>

            {/* Pulsing colon */}
            <span className="text-6xl sm:text-7xl md:text-8xl font-black text-indigo-505/80 animate-pulse font-mono pb-4">
              :
            </span>

            {/* Second Block */}
            <div className="flex flex-col">
              <span className="text-7xl sm:text-8xl md:text-9xl font-extrabold font-mono text-red-500 tracking-tight glow-text-red">
                {timeParts.s}
              </span>
              <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-widest mt-1">Seconds</span>
            </div>
          </motion.div>
        </div>

        {/* Dynamic Alerts / Banners (Like 10-minutes alert or Teacher's Broadcast notes) */}
        <AnimatePresence>
          {room && (isTimeRemainingAlertActive || room.alertMessage) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
              id="alert-banner-zone"
            >
              <div className={`p-4 md:p-6 rounded-2xl border text-center flex flex-col md:flex-row items-center justify-center gap-4 ${
                isTimeRemainingAlertActive 
                  ? "bg-red-500/15 border-red-500/50 text-red-300 animate-pulse" 
                  : "bg-amber-500/10 border-amber-500/30 text-amber-200"
              }`}>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className={`w-8 h-8 ${isTimeRemainingAlertActive ? "text-red-400" : "text-amber-400"}`} />
                  <span className="text-lg md:text-2xl font-bold">
                    {isTimeRemainingAlertActive ? "【 注意：剩餘最後 10 分鐘 】" : "【 監考老師重要提醒 】"}
                  </span>
                </div>
                <div className="text-lg md:text-xl font-medium tracking-wide">
                  {isTimeRemainingAlertActive 
                    ? "考試即將於 10 分鐘後結束，請確認答案卡填寫完整、答案卷寫好。請把握作答時間！" 
                    : room.alertMessage}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Room configuration & candidate counter blocks */}
        {room ? (
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6" id="dashboard-widgets">
            {/* Column 1: Exam Metadata Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg">
              <div>
                <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-550/20 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  考試項目資訊
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-4 tracking-tight leading-snug">
                  {room.subject}
                </h2>
              </div>

              <div className="border-t border-slate-800/80 mt-6 pt-4 space-y-3 text-slate-300 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">考試日期 :</span>
                  <span className="font-semibold text-slate-200 font-mono text-base">{room.examDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">考試時間 :</span>
                  <span className="font-semibold text-slate-200 font-mono text-base bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-500/10">
                    {room.startTime} - {room.endTime}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">總考試時長 :</span>
                  <span className="font-bold text-indigo-400 font-mono text-base">
                    {room.totalDuration} 分鐘
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2: Candidate Presence Attendance status */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg">
              <div>
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-550/20 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  教室人數統計
                </span>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  {/* Expected */}
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 text-center">
                    <span className="text-slate-400 text-xs">應到人數</span>
                    <div className="text-3xl font-black text-slate-100 mt-1 font-mono">{room.expectedStudents} <span className="text-sm font-normal text-slate-400">人</span></div>
                  </div>
                  {/* Actual Checked-In */}
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-emerald-500/25 text-center relative overflow-hidden">
                    <span className="text-slate-400 text-xs">實到人數</span>
                    <motion.div
                      key={room.actualStudents}
                      initial={{ scale: 1.2, color: "#10b981" }}
                      animate={{ scale: 1, color: "#e2e8f0" }}
                      transition={{ duration: 0.4 }}
                      className="text-3xl font-black mt-1 font-mono"
                    >
                      {room.actualStudents} <span className="text-xs font-normal text-slate-400">人</span>
                    </motion.div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800/80 mt-6 pt-4 text-center">
                <div className="flex justify-between items-center text-sm text-slate-300">
                  <span className="text-slate-400">缺席人數 :</span>
                  <span className="font-extrabold text-amber-500 font-mono text-base">
                    {Math.max(0, room.expectedStudents - room.actualStudents)} 人
                  </span>
                </div>
              </div>
            </div>

            {/* Column 3: Bulleted Reminders Zone */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800/85 pb-3">
                <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-550/20 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  提醒專區
                </span>
                <Megaphone className="w-4 h-4 text-amber-400 animate-bounce" />
              </div>

              <div className="flex-1 mt-4 space-y-3 overflow-y-auto max-h-[160px] pr-1">
                {room.reminders && room.reminders.length > 0 ? (
                  room.reminders.map((rem) => (
                    <motion.div
                      key={rem.id}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-2.5 bg-slate-950/40 border-l-2 border-indigo-500 rounded-r-lg text-xs leading-relaxed text-slate-300 flex justify-between gap-2.5"
                    >
                      <span>{rem.text}</span>
                      <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap self-start mt-0.5">{rem.time}</span>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs italic py-6">
                    暫無特定提醒事項
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3 py-16">
            <RefreshCw className="w-10 h-10 text-slate-700 animate-spin" />
            <p className="text-slate-400 text-sm">正在載入伺服器端監考參數...</p>
          </div>
        )}
      </div>

      {/* QR Code / Mobile Configuration Popover/Modal */}
      <AnimatePresence>
        {showPairingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50"
            id="pairing-modal-overlay"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="w-full max-w-md bg-slate-900 border border-slate-705/80 p-6 md:p-8 rounded-2xl shadow-2xl relative text-center"
              id="pairing-modal-card"
            >
              <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-center gap-2">
                <Smartphone className="text-indigo-400" /> 手機遙控配對設定
              </h3>
              <p className="text-xs text-slate-400 mb-6">請使用您的手機相機或點擊下方連結，以便隨時更動考試結束時間、提醒與學生實到統計。</p>

              {/* QR Code Container */}
              <div className="bg-white p-4 rounded-xl inline-block mb-6 shadow-md border border-slate-700">
                <img
                  src={qrCodeUrl}
                  alt="Pairing QR Code"
                  referrerPolicy="no-referrer"
                  className="w-48 h-48 mx-auto"
                />
              </div>

              {/* URL & PASSWORD display */}
              <div className="space-y-3 text-left mb-6">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">配對驗證密碼</span>
                  <span className="text-xl font-mono font-bold text-indigo-400 mt-1 tracking-wider text-center bg-slate-900 p-2 border border-slate-80/50 rounded">
                    {room?.password || "無密碼"}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">遙控網址（可於手機直接貼上）</span>
                  <a
                    href={pairingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono font-medium text-indigo-400 hover:underline break-all mt-1.5"
                  >
                    {pairingUrl}
                  </a>
                </div>
              </div>

              {/* Footnotes and actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowPairingModal(false)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition duration-150 cursor-pointer"
                  id="btn-close-pairing"
                >
                  完成，返回投影時鐘畫面
                </button>
                <a
                  href={pairingUrl}
                  target="_blank"
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5"
                >
                  <Smartphone className="w-3 h-3" />
                  <span>在當前瀏覽器模擬點開「手機遙控面板」</span>
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
