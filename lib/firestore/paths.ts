/**
 * Single source of truth for Firestore paths.
 * Every votable item (destinations, ideas, decision options) gets:
 *   <itemPath>/votes/{userId}
 *   <itemPath>/comments/{commentId}     (also tasks, decisions)
 *   <itemPath>/prosCons/{itemId}        (destinations, ideas, options)
 *
 * Tasks also have:
 *   <taskPath>/subtasks/{subtaskId}
 */

export const eventPath = (eventId: string) => `stagEvents/${eventId}`;
export const membersPath = (eventId: string) => `${eventPath(eventId)}/members`;

export const destinationsPath = (eventId: string) => `${eventPath(eventId)}/destinations`;
export const destinationPath = (eventId: string, id: string) =>
  `${destinationsPath(eventId)}/${id}`;

export const ideasPath = (eventId: string) => `${eventPath(eventId)}/ideas`;
export const ideaPath = (eventId: string, id: string) => `${ideasPath(eventId)}/${id}`;

export const tasksPath = (eventId: string) => `${eventPath(eventId)}/tasks`;
export const taskPath = (eventId: string, id: string) => `${tasksPath(eventId)}/${id}`;
export const subtasksPath = (eventId: string, taskId: string) =>
  `${taskPath(eventId, taskId)}/subtasks`;

export const decisionsPath = (eventId: string) => `${eventPath(eventId)}/decisions`;
export const decisionPath = (eventId: string, id: string) =>
  `${decisionsPath(eventId)}/${id}`;
export const decisionOptionsPath = (eventId: string, decisionId: string) =>
  `${decisionPath(eventId, decisionId)}/options`;
export const decisionOptionPath = (eventId: string, decisionId: string, optionId: string) =>
  `${decisionOptionsPath(eventId, decisionId)}/${optionId}`;

export const activityPath = (eventId: string) => `${eventPath(eventId)}/activityLog`;

// Sub-paths under any votable item.
export const votesPath = (itemPath: string) => `${itemPath}/votes`;
export const userVotePath = (itemPath: string, userId: string) =>
  `${itemPath}/votes/${userId}`;
export const commentsPath = (itemPath: string) => `${itemPath}/comments`;
export const prosConsPath = (itemPath: string) => `${itemPath}/prosCons`;
