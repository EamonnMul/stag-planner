# Stag Planner

A mobile-first web app for planning a stag party with your group. Built with Next.js (App Router), TypeScript, Tailwind, and Firebase (Auth + Firestore + Hosting).

Features:

- Email/password auth with profile (name, email, optional avatar URL)
- Create stag events with title, dates, location, description
- Invite existing users by email (organiser only)
- Pitch ideas in 7 categories (destinations, activities, accommodation, nightlife, restaurants, travel, general)
- Upvote / downvote (one vote per user per idea, swappable)
- Comment on ideas
- Task tracker with status (To Do / In Progress / Done), priority, due date, assignee, filters
- Dashboard: upcoming details, top ideas, outstanding/completed tasks, recent activity
- Permissions: organiser edits event + manages members; members add/vote/comment/update tasks

## Setup

### 1. Create a Firebase project

1. Go to <https://console.firebase.google.com> → **Add project**.
2. In the project, enable:
   - **Authentication** → Sign-in method → **Email/Password**.
   - **Firestore Database** (start in production mode — rules ship in this repo).
   - **Hosting** (optional, if you want to deploy).

### 2. Get the web SDK config

Project Settings → **Your apps** → register a Web app. Copy the config.

```bash
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_FIREBASE_* values
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

### 4. Deploy security rules + indexes

Install the Firebase CLI if needed:

```bash
npm install -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

### 5. (Optional) Seed sample data

1. Project Settings → **Service Accounts** → **Generate new private key**.
2. Save it as `service-account.json` in this folder (it's gitignored).
3. Run:

```bash
npm run seed
```

The seed creates one event ("Dave's Lisbon Stag") with members, ideas, votes, tasks, and activity log entries. To log in as a seed user, sign up in the app with one of the seeded emails (`dave@example.com`, `tom@example.com`, etc.) — that creates the matching auth user. Members are matched by email, so the seeded data will appear once the auth user is linked.

> ⚠ The seed uses invented uids. For a more realistic seed, create the auth users first via the signup form, then edit `scripts/seed.ts` to use their real uids.

### 6. Deploy to Firebase Hosting (optional)

This is a Next.js app. Two deployment options:

**A. Vercel (simplest):** push to GitHub, import on <https://vercel.com>, set the same env vars.

**B. Firebase Hosting + static export:** in `next.config.js`, add `output: 'export'`, then:

```bash
npm run build
firebase deploy --only hosting
```

(Static export disables server features; this app is fully client-rendered against Firebase, so it works.)

## Project structure

```
app/
  layout.tsx              # AuthProvider + global styles
  page.tsx                # Landing
  login/, signup/         # Auth pages
  events/
    page.tsx              # List events
    new/page.tsx          # Create event
    [id]/
      layout.tsx          # AuthGate + EventProvider + nav
      event-context.tsx
      page.tsx            # Dashboard
      ideas/page.tsx
      tasks/page.tsx
      members/page.tsx
      settings/page.tsx
components/
  ui/                     # Spinner, Avatar, Empty, Modal
  AuthGate.tsx
  TopBar.tsx
  EventNav.tsx
lib/
  firebase.ts             # SDK init
  auth.tsx                # AuthProvider + useAuth
  types.ts                # Domain types + enum lists
  format.ts               # date/currency/initials helpers
  firestore/
    events.ts
    ideas.ts
    tasks.ts
    activity.ts
firestore.rules
firestore.indexes.json
firebase.json
scripts/seed.ts
```

## Data model (Firestore)

| Collection      | Doc shape (key fields)                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| `users`         | doc id = uid; `email`, `name`, `avatarUrl`, `createdAt`                                                   |
| `stagEvents`    | `title`, `description`, `location`, `startDate`, `endDate`, `organiserId`, `memberIds[]`, `createdAt`     |
| `members`       | `eventId`, `userId`, `name`, `email`, `avatarUrl`, `role` (`organiser`\|`member`), `joinedAt`             |
| `ideas`         | `eventId`, `title`, `description`, `category`, `estimatedCost`, `createdBy`, `createdByName`, `upvotes`, `downvotes`, `score`, `createdAt` |
| `votes`         | doc id = `${ideaId}_${userId}`; `ideaId`, `eventId`, `userId`, `value` (`1`\|`-1`), `createdAt`           |
| `comments`      | `eventId`, `ideaId`, `userId`, `userName`, `text`, `createdAt`                                            |
| `tasks`         | `eventId`, `title`, `description`, `status`, `priority`, `dueDate`, `assigneeId`, `assigneeName`, `createdBy`, `createdByName`, `createdAt` |
| `activityLog`   | `eventId`, `type`, `message`, `userId`, `userName`, `createdAt`                                           |

`stagEvents.memberIds[]` is the source of truth for "who can read this event"; security rules check it via `isMember()` and `isOrganiser()`.

## Permissions summary

- **Organiser:** edit event details, add/remove members, delete any idea/comment, manage all tasks.
- **Members:** add ideas, vote, comment, create tasks, update task status. Can delete their own ideas/comments and tasks they created or are assigned to.
- **Non-members:** can't read anything in the event.

Rules enforce this at the database level (`firestore.rules`); the UI also hides the affordances.

## Extending

- **Avatars:** swap the URL field for Firebase Storage uploads.
- **Real-time updates:** the data helpers use one-shot `getDocs`. Switch to `onSnapshot` (or wrap with `react-firebase-hooks`) for live UI updates.
- **Email invites for non-users:** add a `pendingInvites` collection keyed by email; on signup, check the email and auto-join those events.
- **Push notifications:** wire Firebase Cloud Messaging to activity log writes.
