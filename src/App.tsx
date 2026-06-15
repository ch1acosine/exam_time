import React, { useState, useEffect } from "react";
import SetupScreen from "./components/SetupScreen";
import ProjectorScreen from "./components/ProjectorScreen";
import RemoteScreen from "./components/RemoteScreen";

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Synchronize browser back/forward buttons with custom lightweight router
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  // Create or Join the Exam Room
  const handleStartExam = async (examParams: {
    roomId: string;
    password: string;
    subject: string;
    examDate: string;
    startTime: string;
    endTime: string;
    totalDuration: number;
    expectedStudents: number;
  }) => {
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(examParams),
      });

      if (response.ok) {
        // Direct transition to the public projection screen
        navigate(`/room/${examParams.roomId}`);
      } else {
        const err = await response.json();
        alert(`初始化會議室錯誤: ${err.error || "未知伺服器錯誤"}`);
      }
    } catch (e) {
      console.error("Failed to post configuration to backend", e);
      alert("連線後台伺服器失敗，請檢查系統記錄和網路。");
    }
  };

  const handleJoinRoom = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  const handleBackToHome = () => {
    navigate("/");
  };

  // Route Dispatching
  // 1. Match remote path: /room/:roomId/remote
  const remoteMatch = currentPath.match(/^\/room\/([^/]+)\/remote\/?$/);
  if (remoteMatch) {
    const roomId = remoteMatch[1];
    return <RemoteScreen roomId={roomId} onBackToHome={handleBackToHome} />;
  }

  // 2. Match projector path: /room/:roomId
  const projectorMatch = currentPath.match(/^\/room\/([^/]+)\/?$/);
  if (projectorMatch) {
    const roomId = projectorMatch[1];
    return <ProjectorScreen roomId={roomId} onBackToHome={handleBackToHome} />;
  }

  // Default: Landing configuration Setup Page
  return (
    <SetupScreen onStartExam={handleStartExam} onJoinRoom={handleJoinRoom} />
  );
}
