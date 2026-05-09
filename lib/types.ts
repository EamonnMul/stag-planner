import { Timestamp } from "firebase/firestore";

export type Role = "organiser" | "member";

export type IdeaCategory =
  | "destinations"
  | "activities"
  | "accommodation"
  | "nightlife"
  | "restaurants"
  | "travel"
  | "general";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  createdAt: Timestamp;
}

export interface StagEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: Timestamp;
  endDate: Timestamp;
  organiserId: string;
  memberIds: string[];
  createdAt: Timestamp;
}

export interface Member {
  id: string;
  eventId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: Role;
  joinedAt: Timestamp;
}

export interface Idea {
  id: string;
  eventId: string;
  title: string;
  description: string;
  category: IdeaCategory;
  estimatedCost: number;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  upvotes: number;
  downvotes: number;
  score: number;
}

export interface Vote {
  id: string;
  ideaId: string;
  eventId: string;
  userId: string;
  value: 1 | -1;
  createdAt: Timestamp;
}

export interface Comment {
  id: string;
  ideaId: string;
  eventId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Timestamp;
}

export interface Task {
  id: string;
  eventId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Timestamp | null;
  assigneeId: string | null;
  assigneeName: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
}

export type ActivityType =
  | "event_created"
  | "member_joined"
  | "idea_created"
  | "idea_voted"
  | "comment_added"
  | "task_created"
  | "task_status_changed";

export interface ActivityLogEntry {
  id: string;
  eventId: string;
  type: ActivityType;
  message: string;
  userId: string;
  userName: string;
  createdAt: Timestamp;
}

export const IDEA_CATEGORIES: { value: IdeaCategory; label: string }[] = [
  { value: "destinations", label: "Destinations" },
  { value: "activities", label: "Activities" },
  { value: "accommodation", label: "Accommodation" },
  { value: "nightlife", label: "Nightlife" },
  { value: "restaurants", label: "Restaurants" },
  { value: "travel", label: "Travel" },
  { value: "general", label: "General" },
];

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
