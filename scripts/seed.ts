/**
 * Seed sample data into Firestore.
 *
 * Usage:
 *   1. Download a service-account key from Firebase Console > Project Settings > Service Accounts.
 *   2. Save it as ./service-account.json (or set GOOGLE_APPLICATION_CREDENTIALS).
 *   3. npm run seed
 *
 * NOTE: this seeds data for THREE invented users without real auth accounts.
 * To log in as them in the app, create them via the signup form first using
 * the same emails, then re-run this script with --link to attach data.
 *
 * For convenience the script just creates Firestore docs using made-up uids;
 * use it on a dev/test project, not production.
 */

import { cert, initializeApp, getApps } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? resolve("service-account.json");
if (!existsSync(credPath)) {
  console.error(`Service account not found at ${credPath}`);
  console.error("Download one from Firebase Console > Project Settings > Service Accounts.");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(readFileSync(credPath, "utf8"))),
  });
}

const db = getFirestore();

const USERS = [
  { uid: "seed-organiser", email: "dave@example.com", name: "Dave (Organiser)" },
  { uid: "seed-member-1", email: "tom@example.com", name: "Tom" },
  { uid: "seed-member-2", email: "sara@example.com", name: "Sara" },
  { uid: "seed-member-3", email: "mick@example.com", name: "Mick" },
];

async function main() {
  console.log("Seeding users…");
  for (const u of USERS) {
    await db.doc(`users/${u.uid}`).set({
      email: u.email,
      name: u.name,
      avatarUrl: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  console.log("Seeding stag event…");
  const eventRef = db.collection("stagEvents").doc();
  const start = new Date();
  start.setDate(start.getDate() + 60);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);

  await eventRef.set({
    title: "Dave's Lisbon Stag",
    description: "Long weekend, sunshine, no embarrassing T-shirts.",
    location: "Lisbon, Portugal",
    startDate: Timestamp.fromDate(start),
    endDate: Timestamp.fromDate(end),
    organiserId: USERS[0].uid,
    memberIds: USERS.map((u) => u.uid),
    createdAt: FieldValue.serverTimestamp(),
  });
  const eventId = eventRef.id;

  console.log("Seeding members…");
  for (const u of USERS) {
    await db.collection("members").add({
      eventId,
      userId: u.uid,
      name: u.name,
      email: u.email,
      avatarUrl: null,
      role: u.uid === USERS[0].uid ? "organiser" : "member",
      joinedAt: FieldValue.serverTimestamp(),
    });
  }

  console.log("Seeding ideas + votes…");
  const ideas = [
    { title: "Sunset boat party", category: "activities", cost: 60, by: USERS[1] },
    { title: "Time Out Market dinner", category: "restaurants", cost: 35, by: USERS[2] },
    { title: "Karting in Estoril", category: "activities", cost: 50, by: USERS[3] },
    { title: "Bairro Alto bar crawl", category: "nightlife", cost: 40, by: USERS[0] },
    { title: "AirBnB in Alfama", category: "accommodation", cost: 120, by: USERS[1] },
    { title: "Day trip to Sintra", category: "destinations", cost: 25, by: USERS[2] },
  ];

  for (const i of ideas) {
    const ref = db.collection("ideas").doc();
    const upvotes = Math.floor(Math.random() * 3) + 1;
    const downvotes = Math.floor(Math.random() * 2);
    await ref.set({
      eventId,
      title: i.title,
      description: `Pitched by ${i.by.name}.`,
      category: i.category,
      estimatedCost: i.cost,
      createdBy: i.by.uid,
      createdByName: i.by.name,
      createdAt: FieldValue.serverTimestamp(),
      upvotes,
      downvotes,
      score: upvotes - downvotes,
    });
    // Add a couple of votes for realism.
    for (let v = 0; v < upvotes; v++) {
      const voter = USERS[(v + 1) % USERS.length];
      await db.doc(`votes/${ref.id}_${voter.uid}`).set({
        ideaId: ref.id,
        eventId,
        userId: voter.uid,
        value: 1,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  }

  console.log("Seeding tasks…");
  const tasks = [
    { title: "Lock in flights", priority: "high", status: "in_progress", assignee: USERS[0] },
    { title: "Pay AirBnB deposit", priority: "high", status: "todo", assignee: USERS[0] },
    { title: "Book karting slot", priority: "medium", status: "todo", assignee: USERS[3] },
    { title: "Reserve Time Out Market table", priority: "medium", status: "todo", assignee: USERS[2] },
    { title: "Order matching shirts (NO embarrassing slogans)", priority: "low", status: "done", assignee: USERS[1] },
  ];
  for (const t of tasks) {
    await db.collection("tasks").add({
      eventId,
      title: t.title,
      description: "",
      status: t.status,
      priority: t.priority,
      dueDate: Timestamp.fromDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)),
      assigneeId: t.assignee.uid,
      assigneeName: t.assignee.name,
      createdBy: USERS[0].uid,
      createdByName: USERS[0].name,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  console.log("Seeding activity log…");
  const messages = [
    { type: "event_created", message: `${USERS[0].name} created the event`, by: USERS[0] },
    { type: "member_joined", message: `${USERS[1].name} joined`, by: USERS[1] },
    { type: "idea_created", message: `${USERS[2].name} pitched "Time Out Market dinner"`, by: USERS[2] },
    { type: "task_created", message: `${USERS[0].name} added task "Lock in flights"`, by: USERS[0] },
  ];
  for (const m of messages) {
    await db.collection("activityLog").add({
      eventId,
      type: m.type,
      message: m.message,
      userId: m.by.uid,
      userName: m.by.name,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  console.log(`\nDone. Seed event id: ${eventId}`);
  console.log("Sign up in the app with one of these emails to log in:");
  USERS.forEach((u) => console.log(`  ${u.email}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
