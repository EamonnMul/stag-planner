import { Timestamp } from "firebase/firestore";

export type Role = "organiser" | "member";
export type Visibility = "public" | "private";

export type Workstream =
  | "destinations"
  | "accommodation"
  | "travel"
  | "activities"
  | "food_drink"
  | "nightlife"
  | "budget"
  | "admin"
  | "misc";

export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "blocked"
  | "needs_decision"
  | "done";

export type ItemStatus =
  | "suggested"
  | "under_discussion"
  | "shortlisted"
  | "rejected"
  | "chosen";

export type DecisionStatus = "open" | "decided" | "closed";

export type TaskPriority = "low" | "medium" | "high" | "critical";

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
  nightlifeRating: number;
  activityRating: number;
  status: ItemStatus;
  labels: string[];
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  voteCount: number;
  commentCount: number;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  workstream: Workstream;
  estimatedCost: number;
  status: ItemStatus;
  labels: string[];
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  voteCount: number;
  commentCount: number;
}

export type BlockerKind = "task" | "decision";
export interface Blocker {
  kind: BlockerKind;
  id: string;
  title: string; // denormalised for quick render
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  workstream: Workstream;
  dueDate: Timestamp | null;
  assigneeId: string | null;
  assigneeName: string | null;
  labels: string[];
  blocker: Blocker | null;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedBy: string | null;
  completedByName: string | null;
  completedAt: Timestamp | null;
  commentCount: number;
  subtaskTotal: number;
  subtaskCompleted: number;
  /** users who want notifications on this task (notifications-ready, no UI yet). */
  watcherIds: string[];
}

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
  createdBy: string;
  createdAt: Timestamp;
  completedBy: string | null;
  completedAt: Timestamp | null;
}

export interface DecisionOption {
  id: string;
  text: string;
  description: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  voteCount: number;
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  status: DecisionStatus;
  dueDate: Timestamp | null;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  chosenOptionId: string | null;
  chosenOptionText: string | null;
  optionCount: number;
  commentCount: number;
}

export interface Vote {
  id: string;
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
  /** for future @mention notifications. */
  mentionedUserIds?: string[];
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
  | "destination_status_changed"
  | "idea_created"
  | "idea_status_changed"
  | "vote_cast"
  | "vote_removed"
  | "comment_added"
  | "pro_con_added"
  | "task_created"
  | "task_status_changed"
  | "task_assignee_changed"
  | "task_priority_changed"
  | "task_due_date_changed"
  | "task_completed"
  | "task_reopened"
  | "decision_created"
  | "decision_option_added"
  | "decision_chosen"
  | "decision_status_changed"
  | "subtask_added"
  | "subtask_completed";

export interface ActivityLogEntry {
  id: string;
  type: ActivityType;
  message: string;
  userId: string;
  userName: string;
  createdAt: Timestamp;
  /** Optional pointer back to the affected entity for deep links. */
  entityKind?: "task" | "idea" | "destination" | "decision";
  entityId?: string;
}

// ---------------------------------------------------------------------------
// Enum metadata. Keep ordering meaningful — it controls UI display order.
// ---------------------------------------------------------------------------

export const WORKSTREAMS: { value: Workstream; label: string }[] = [
  { value: "destinations", label: "Destinations" },
  { value: "accommodation", label: "Accommodation" },
  { value: "travel", label: "Flights / Travel" },
  { value: "activities", label: "Activities" },
  { value: "food_drink", label: "Food & Drink" },
  { value: "nightlife", label: "Nightlife" },
  { value: "budget", label: "Budget / Payments" },
  { value: "admin", label: "Admin" },
  { value: "misc", label: "Miscellaneous" },
];

export const TASK_STATUSES: { value: TaskStatus; label: string; tone: string }[] = [
  { value: "backlog", label: "Backlog", tone: "bg-gray-100 text-gray-700" },
  { value: "todo", label: "To Do", tone: "bg-blue-50 text-blue-700" },
  { value: "in_progress", label: "In Progress", tone: "bg-indigo-50 text-indigo-700" },
  { value: "blocked", label: "Blocked", tone: "bg-red-50 text-red-700" },
  { value: "needs_decision", label: "Needs Decision", tone: "bg-amber-50 text-amber-700" },
  { value: "done", label: "Done", tone: "bg-green-50 text-green-700" },
];

export const ITEM_STATUSES: { value: ItemStatus; label: string; tone: string }[] = [
  { value: "suggested", label: "Suggested", tone: "bg-gray-100 text-gray-700" },
  { value: "under_discussion", label: "Under Discussion", tone: "bg-blue-50 text-blue-700" },
  { value: "shortlisted", label: "Shortlisted", tone: "bg-amber-50 text-amber-700" },
  { value: "rejected", label: "Rejected", tone: "bg-gray-100 text-gray-500 line-through" },
  { value: "chosen", label: "Chosen", tone: "bg-green-100 text-green-800" },
];

export const DECISION_STATUSES: { value: DecisionStatus; label: string; tone: string }[] = [
  { value: "open", label: "Open", tone: "bg-amber-50 text-amber-700" },
  { value: "decided", label: "Decided", tone: "bg-green-50 text-green-700" },
  { value: "closed", label: "Closed", tone: "bg-gray-100 text-gray-500" },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string; tone: string }[] = [
  { value: "low", label: "Low", tone: "bg-gray-100 text-gray-600" },
  { value: "medium", label: "Medium", tone: "bg-amber-50 text-amber-700" },
  { value: "high", label: "High", tone: "bg-orange-50 text-orange-700" },
  { value: "critical", label: "Critical", tone: "bg-red-100 text-red-700" },
];

export const PRESET_LABELS = [
  "expensive",
  "needs deposit",
  "urgent",
  "risky",
  "easy win",
  "group decision",
  "booked",
  "refundable",
  "weather dependent",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function statusMeta<T extends { value: string; label: string; tone: string }>(
  list: T[],
  value: string
): T | undefined {
  return list.find((x) => x.value === value);
}
