import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

interface Reminder {
  id: string;
  text: string;
  time: string;
}

interface RoomState {
  roomId: string;
  password?: string; // we keep password here but strip it when sending state queries
  subject: string;
  examDate: string;
  startTime: string;
  endTime: string;
  totalDuration: number;
  expectedStudents: number;
  actualStudents: number;
  reminders: Reminder[];
  tenMinRemainingAlert: boolean;
  alertMessage: string | null;
}

const app = express();
const PORT = 3000;

// In-memory data store for the live session rooms
const rooms = new Map<string, RoomState>();

// Store active Server-Sent Event (SSE) stream connections for real-time synchronization
type SSEClient = {
  res: express.Response;
};
const clients = new Map<string, SSEClient[]>();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Broadcast updated room state to all SSE connected clients in that room
function broadcastToRoom(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  // Clone state and strip password for client safety
  const { password, ...safeState } = room;
  const data = JSON.stringify(safeState);

  const roomClients = clients.get(roomId) || [];
  const activeClients: SSEClient[] = [];

  roomClients.forEach((client) => {
    try {
      client.res.write(`data: ${data}\n\n`);
      activeClients.push(client);
    } catch (e) {
      console.error("Error writing to client stream, removing client:", e);
    }
  });

  clients.set(roomId, activeClients);
}

// API: Create or Join Room
app.post("/api/rooms", (req, res) => {
  const {
    roomId,
    password,
    subject,
    examDate,
    startTime,
    endTime,
    totalDuration,
    expectedStudents,
  } = req.body;

  if (!roomId || !password) {
    return res.status(400).json({ error: "Room ID and Password are required." });
  }

  const existingRoom = rooms.get(roomId);

  if (existingRoom) {
    // If the room exists, verify password before overriding or joining.
    if (existingRoom.password !== password) {
      return res.status(401).json({ error: "Room already exists and the password entered is incorrect." });
    }
    // Update existing room basic configuration if needed
    existingRoom.subject = subject || existingRoom.subject;
    existingRoom.examDate = examDate || existingRoom.examDate;
    existingRoom.startTime = startTime || existingRoom.startTime;
    existingRoom.endTime = endTime || existingRoom.endTime;
    existingRoom.totalDuration = totalDuration || existingRoom.totalDuration;
    existingRoom.expectedStudents = expectedStudents || existingRoom.expectedStudents;
    
    broadcastToRoom(roomId);
    return res.json({ message: "Joined and updated existing room.", room: { roomId, subject: existingRoom.subject } });
  }

  // Create new Room State
  const newRoom: RoomState = {
    roomId,
    password,
    subject: subject || "Default Subject",
    examDate: examDate || "Today",
    startTime: startTime || "08:00",
    endTime: endTime || "10:00",
    totalDuration: totalDuration || 120,
    expectedStudents: expectedStudents || 0,
    actualStudents: 0,
    reminders: [
      { id: "1", text: "請將手機關機或靜音並放置於置物區", time: new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }) },
      { id: "2", text: "考試開始20分鐘後不得入場，40分鐘內不得交卷", time: new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }) }
    ],
    tenMinRemainingAlert: false,
    alertMessage: null,
  };

  rooms.set(roomId, newRoom);
  return res.json({ message: "Room created successfully.", room: { roomId, subject: newRoom.subject } });
});

// API: Get Room Info (safe payload)
app.get("/api/rooms/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);

  if (!room) {
    return res.status(404).json({ error: "Room not found." });
  }

  const { password, ...safeRoom } = room;
  return res.json(safeRoom);
});

// API: Verify Remote Control Password
app.post("/api/rooms/:roomId/verify", (req, res) => {
  const { roomId } = req.params;
  const { password } = req.body;
  const room = rooms.get(roomId);

  if (!room) {
    return res.status(404).json({ error: "Room not found." });
  }

  if (room.password !== password) {
    return res.status(401).json({ error: "Invalid password." });
  }

  return res.json({ success: true, message: "Authentication successful." });
});

// API: Modify exam session state (remotely triggered)
app.patch("/api/rooms/:roomId/state", (req, res) => {
  const { roomId } = req.params;
  const { password, stateUpdates } = req.body;
  const room = rooms.get(roomId);

  if (!room) {
    return res.status(404).json({ error: "Room not found." });
  }

  // Always require remote password for editing
  if (room.password !== password) {
    return res.status(401).json({ error: "Incorrect room password or session expired." });
  }

  if (stateUpdates) {
    // Apply updates
    if (stateUpdates.endTime !== undefined) room.endTime = stateUpdates.endTime;
    if (stateUpdates.actualStudents !== undefined) room.actualStudents = stateUpdates.actualStudents;
    if (stateUpdates.reminders !== undefined) room.reminders = stateUpdates.reminders;
    if (stateUpdates.tenMinRemainingAlert !== undefined) room.tenMinRemainingAlert = stateUpdates.tenMinRemainingAlert;
    if (stateUpdates.alertMessage !== undefined) room.alertMessage = stateUpdates.alertMessage;
    if (stateUpdates.subject !== undefined) room.subject = stateUpdates.subject;
    if (stateUpdates.expectedStudents !== undefined) room.expectedStudents = stateUpdates.expectedStudents;
    if (stateUpdates.startTime !== undefined) room.startTime = stateUpdates.startTime;
    if (stateUpdates.totalDuration !== undefined) room.totalDuration = stateUpdates.totalDuration;
  }

  broadcastToRoom(roomId);
  
  const { password: _, ...safeRoom } = room;
  return res.json({ success: true, room: safeRoom });
});

// API: SSE Stream Endpoint for Classroom Screen to receive real-time updates instantly
app.get("/api/rooms/:roomId/stream", (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);

  if (!room) {
    return res.status(404).json({ error: "Room session not active or not found." });
  }

  // Keep-alive setup for SSE stream
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  // Send initial room status immediately
  const { password, ...safeState } = room;
  res.write(`data: ${JSON.stringify(safeState)}\n\n`);

  // Maintain reference to broadcast events
  const roomClients = clients.get(roomId) || [];
  const clientObj: SSEClient = { res };
  roomClients.push(clientObj);
  clients.set(roomId, roomClients);

  // Clean connection on client disconnect
  req.on("close", () => {
    const activeClients = clients.get(roomId) || [];
    const filtered = activeClients.filter((c) => c !== clientObj);
    clients.set(roomId, filtered);
  });
});

// Integration of Vite middleware for static assets (development vs production)
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Single Page Application routing configuration
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Exam Session Clock Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
