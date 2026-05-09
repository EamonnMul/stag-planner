import { Timestamp } from "firebase/firestore";

export type Role = "organiser" | "member";
export type Visibility = "public" | "private";

export type IdeaCategory =
  | "activities"
  | "accommodation"
  | "nightlife"
  | "restaurants"
  | "travel"
  | "general";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type ProConType = "pro" | "con";

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
  organiserName: string;
  memberIds: string[];
  visibility: Visibility;
  createdAt: Timestamp;
}

export interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: Role;
  joinedAt: Timestamp;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  city: string;
  description: string;
  estimatedCost: number;
  travelNotes: string;
  nightlifeRating: number; // 1–5
  activityRating: number;  // 1–5
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  voteCount: number;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: IdeaCategory;
  estimatedCost: number;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  voteCount: number;
}

export interface Task {
  id: string;
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

export interface Vote {
  id: string;            // doc id = userId
  userId: string;
  userName: string;
  value: 1;
  createdAt: Timestamp;
}

export interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: Timestamp;
}

export interface ProConItem {
  id: string;
  text: string;
  type: ProConType;
  userId: string;
  userName: string;
  createdAt: Timestamp;
}

export type ActivityType =
  | "event_created"
  | "member_joined"
  | "destination_created"
  | "idea_created"
  | "vote_cast"
  | "vote_removed"
  | "comment_added"
  | "pro_con_added"
  | "task_created"
  | "task_status_changed";

export interface ActivityLogEntry {
  id: string;
  type: ActivityType;
  message: string;
  userId: string;
  userName: string;
  createdAt: Timestamp;
}

export const IDEA_CATEGORIES: { value: IdeaCategory; label: string }[] = [
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
