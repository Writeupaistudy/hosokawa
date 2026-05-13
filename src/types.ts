export type Attendance = "live" | "archive" | "skip" | "";
export type ClaudeUsage = "none" | "tried" | "weekly" | "daily" | "";
export type ShareKnowhow = "ok-live" | "ok-share" | "ng" | "";

export interface FormState {
  name: string;
  birdName: string;
  attendance: Attendance;

  claudeUsage: ClaudeUsage;
  concern: string;

  question: string;
  shareKnowhow: ShareKnowhow;
  knowhowContent: string;
}

export const initialForm: FormState = {
  name: "",
  birdName: "",
  attendance: "",
  claudeUsage: "",
  concern: "",
  question: "",
  shareKnowhow: "",
  knowhowContent: "",
};
