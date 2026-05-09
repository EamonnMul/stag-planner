/**
 * Single source of truth for Firestore paths.
 * All votable items (destinations, ideas) follow the same shape:
 *   <itemPath>/votes/{userId}
 *   <itemPath>/comments/{commentId}
 *   <itemPath>/prosCons/{itemId}
 *
 * Tasks follow the same shape but only support comments.
 *
 * Keep this file pure — no SDK calls, no side effects.
 */

export const eventPath = (eventId: string) => `stagEvents/${eventId}`;
export const membersPath = (eventId: string) => `${eventPath(eventId)}/members`;
export const destinationsPath = (eventId: string) => `${eventPath(eventId)}/destinations`;
export const destinationPath = (eventId: string, destinationId: string) =>
  `${destinationsPath(eventId)}/${destinationId}`;
export const ideasPath = (eventId: string) => `${eventPath(eventId)}/ideas`;
export const ideaPath = (eventId: string, ideaId: string) =>
  `${ideasPath(eventId)}/${ideaId}`;
export const tasksPath = (eventId: string) => `${eventPath(eventId)}/tasks`;
export const taskPath = (eventId: string, taskId: string) =>
  `${tasksPath(eventId)}/${taskId}`;
export const activityPath = (eventId: string) => `${eventPath(eventId)}/activityLog`;

// Sub-paths under a votable item.
export const votesPath = (itemPath: string) => `${itemPath}/votes`;
export const userVotePath = (itemPath: string, userId: string) =>
  `${itemPath}/votes/${userId}`;
export const commentsPath = (itemPath: string) => `${itemPath}/comments`;
export const prosConsPath = (itemPath: string) => `${itemPath}/prosCons`;
