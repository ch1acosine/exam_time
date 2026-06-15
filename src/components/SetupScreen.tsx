import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Clock, Users, Key, AppWindow, Calendar, Shield, Cpu } from "lucide-react";

interface SetupScreenProps {
  onStartExam: (data: {
    roomId: string;
    password: string;
    subject: string;
    examDate: string;
    startTime: string;
    endTime: string;
    totalDuration: number;
    expectedStudents: number;
  }) => void;
  onJoinRoom: (roomId: string) => void;
}

export default function SetupScreen({ onStartExam, onJoinRoom }: SetupScreenProps) {
  // Generate a random room ID and password on load for easy testing
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [subject, setSubject] = useState("大氣動力學二");
  
  // Default date format matching current local time
  const [examDate, setExamDate] = useState("6/13");
  const [startTime, setStartTime] = useState("08:10");
  const [endTime, setEndTime] = useState("10:00");
  const [totalDuration, setTotalDuration] = useState(110);
  const [expectedStudents, setExpectedStudents] = useState(45);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Generate some easy random strings
    const randomId = Math.floor(1000 + Math.random() * 9000).toString();
    const randomPass = Math.floor(100 + Math.random() * 900).toString();
    setRoomId(`room-${randomId}`);
    setPassword(randomPass);

    // Get today's month/day
    const now = new Date();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    setExamDate(`${month}/${date}`);
  }, []);

  // Recalculate duration when startTime or endTime change
  useEffect(() => {
    if (startTime && endTime) {
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);
      if (!isNaN(startH) && !isNaN(startM) && !isNaN(endH) && !isNaN(endM)) {
        let duration = (endH * 60 + endM) - (startH * 60 + startM);
        if (duration < 0) {
          // handles cross-day exams if any
          duration += 1440;
        }
        setTotalDuration(duration);
      }
    }
  }, [startTime, endTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) {
      setErrorMsg("請輸入 Room ID");
      return;
    }
    if (!password.trim()) {
      setErrorMsg("請設定密碼");
      return;
    }
    if (!subject.trim()) {
      setErrorMsg("請輸入考試科目");
      return;
    }
    onStartExam({
      roomId: roomId.trim(),
      password: password.trim(),
      subject: subject.trim(),
      examDate,
      startTime,
      endTime,
      totalDuration,
      expectedStudents,
    });
  };

  const handleQuickJoin = () => {
    if (!roomId.trim()) {
      setErrorMsg("請輸入要進入的 Room ID");
      return;
    }
    onJoinRoom(roomId.trim());
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl bg-slate-800 border border-slate-700/50 rounded-2xl shadow-xl p-6 md:p-8"
        id="setup-card"
      >
        {/* Title */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">監考投影時鐘系統</h1>
            <p className="text-xs text-slate-400 mt-1">智慧大螢幕投影，支援手機 QR Code 進行多功能遠端操作</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Room Settings */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/30 space-y-4">
            <h3 className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
              <Shield className="w-4 h-4" /> 伺服器連線與安全防護
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Room ID（房間代號）</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">
                    <AppWindow className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="e.g. room-777"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    id="input-room-id"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">密碼（手機遙控專用）</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="密碼"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    id="input-room-pwd"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Exam Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">考試參數設定</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">考試科目名稱</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. 大氣動力學二"
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  id="input-subject"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">考試日期</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    placeholder="e.g. 6/12"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                    id="input-exam-date"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">開始時間</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  id="input-start-time"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">結束時間</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  id="input-end-time"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">總考試時長 (分)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">
                    <Clock className="w-4 h-4" />
                  </span>
                  <input
                    type="number"
                    value={totalDuration}
                    onChange={(e) => setTotalDuration(Number(e.target.value))}
                    placeholder="120"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                    id="input-duration"
                  />
                </div>
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">應到人數 (人)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">
                    <Users className="w-4 h-4" />
                  </span>
                  <input
                    type="number"
                    value={expectedStudents}
                    onChange={(e) => setExpectedStudents(Number(e.target.value))}
                    placeholder="45"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                    id="input-expected-students"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-650/40 font-semibold"
              id="btn-create-exam"
            >
              <Clock className="w-5 h-5" /> 啟動監考投影螢幕
            </button>
            <button
              type="button"
              onClick={handleQuickJoin}
              className="py-3 px-5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 font-medium rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer font-semibold"
              id="btn-quick-join"
            >
              直接投影 / 尋找房間
            </button>
          </div>
        </form>

        <div className="mt-8 border-t border-slate-700/40 pt-4 text-center">
          <p className="text-xs text-slate-500">
            請將本頁面投影至教室前方螢幕，隨後使用手機掃描螢幕產生的 QR Code 並輸入密碼，即可安全控制結束時間、到考狀況與隨時發送手寫提醒。
          </p>
        </div>
      </motion.div>
    </div>
  );
}
