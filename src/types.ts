export interface Reminder {
  id: string;
  text: string;
  time: string;
}

export interface ExamRoom {
  roomId: string;
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
