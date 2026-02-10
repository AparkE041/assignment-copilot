import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

if (process.env.NODE_ENV === "production") {
  console.error("Seed cannot run in production. Use migrations only. See DEPLOYMENT.md.");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  // Clean seed - delete in correct order to respect FKs
  await prisma.chatMessage.deleteMany();
  await prisma.chatThread.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.plannedSession.deleteMany();
  await prisma.reminderEvent.deleteMany();
  await prisma.reminderRule.deleteMany();
  await prisma.availabilityBlock.deleteMany();
  await prisma.assignmentLocalState.deleteMany();
  await prisma.embeddingChunk.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.canvasConnection.deleteMany();
  await prisma.aiSettings.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();

  // Create user with password for credentials auth
  const hashedPassword = await bcrypt.hash("password123", 12);
  const calendarFeedSecret = crypto.randomUUID();

  const user = await prisma.user.upsert({
    where: { email: "student@belmont.edu" },
    update: {},
    create: {
      email: "student@belmont.edu",
      name: "Test Student",
      password: hashedPassword,
      hasOnboarded: true,
      calendarFeedSecret,
      emailVerified: now,
      updatedAt: now,
    },
  });

  // Create courses
  const course1 = await prisma.course.upsert({
    where: { userId_canvasId: { userId: user.id, canvasId: "1001" } },
    update: {},
    create: {
      canvasId: "1001",
      userId: user.id,
      name: "Introduction to Computer Science",
      rawPayload: {},
    },
  });

  const course2 = await prisma.course.upsert({
    where: { userId_canvasId: { userId: user.id, canvasId: "1002" } },
    update: {},
    create: {
      canvasId: "1002",
      userId: user.id,
      name: "Data Structures",
      rawPayload: {},
    },
  });

  const course3 = await prisma.course.upsert({
    where: { userId_canvasId: { userId: user.id, canvasId: "1003" } },
    update: {},
    create: {
      canvasId: "1003",
      userId: user.id,
      name: "Web Development",
      rawPayload: {},
    },
  });

  const courses = [course1, course2, course3];

  // Create assignments with varied due dates
  const dueDates = [
    new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days
    new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
    new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days
    new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000), // 21 days
  ];

  const assignmentTitles = [
    "Programming Assignment 1: Hello World",
    "Linked List Implementation",
    "React Component Project",
    "Midterm Essay",
    "Final Project Proposal",
  ];

  const assignmentDescriptions = [
    "<p>Write a program that prints 'Hello, World!' to the console.</p>",
    "<p>Implement a doubly-linked list with insert, delete, and search operations.</p>",
    "<p>Build a todo list component using React with add, edit, and delete functionality.</p>",
    "<p>Write a 1500-word essay on the topic provided.</p>",
    "<p>Submit a 500-word proposal for your final project.</p>",
  ];

  const assignments = [];

  for (let i = 0; i < 5; i++) {
    const assignment = await prisma.assignment.upsert({
      where: {
        courseId_canvasId: {
          courseId: courses[i % 3].id,
          canvasId: `a${100 + i}`,
        },
      },
      update: {},
      create: {
        courseId: courses[i % 3].id,
        canvasId: `a${100 + i}`,
        title: assignmentTitles[i],
        descriptionHtml: assignmentDescriptions[i],
        dueAt: dueDates[i],
        points: [10, 50, 100, 100, 20][i],
        rawPayload: {},
      },
    });
    assignments.push(assignment);
  }

  // Create local state for assignments
  for (let i = 0; i < assignments.length; i++) {
    await prisma.assignmentLocalState.upsert({
      where: { assignmentId: assignments[i].id },
      update: {},
      create: {
        assignmentId: assignments[i].id,
        status: i === 0 ? "in_progress" : i < 3 ? "not_started" : "not_started",
        estimatedEffortMinutes: [60, 120, 180, 240, 90][i],
        priority: [1, 2, 1, 0, 0][i],
      },
    });
  }

  // Create availability blocks (from ICS)
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  for (let day = 0; day < 3; day++) {
    const start = new Date(today);
    start.setDate(start.getDate() + day);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(12, 0, 0, 0);
    await prisma.availabilityBlock.create({
      data: {
        userId: user.id,
        startAt: start,
        endAt: end,
        source: "ics",
      },
    });
  }

  // Create planned sessions
  const session1Start = new Date(today);
  session1Start.setDate(session1Start.getDate() + 1);
  session1Start.setHours(9, 0, 0, 0);
  const session1End = new Date(session1Start);
  session1End.setHours(11, 0, 0, 0);

  await prisma.plannedSession.create({
    data: {
      assignmentId: assignments[0].id,
      userId: user.id,
      startAt: session1Start,
      endAt: session1End,
      completed: false,
    },
  });

  const session2Start = new Date(today);
  session2Start.setDate(session2Start.getDate() + 2);
  session2Start.setHours(14, 0, 0, 0);
  const session2End = new Date(session2Start);
  session2End.setHours(16, 0, 0, 0);

  await prisma.plannedSession.create({
    data: {
      assignmentId: assignments[1].id,
      userId: user.id,
      startAt: session2Start,
      endAt: session2End,
      completed: false,
    },
  });

  // Create checklist items for first assignment
  await prisma.checklistItem.createMany({
    data: [
      { assignmentId: assignments[0].id, title: "Read assignment spec", checked: true, order: 0 },
      { assignmentId: assignments[0].id, title: "Set up development environment", checked: true, order: 1 },
      { assignmentId: assignments[0].id, title: "Implement solution", checked: false, order: 2 },
      { assignmentId: assignments[0].id, title: "Test and submit", checked: false, order: 3 },
    ],
    skipDuplicates: true,
  });

  // Create chat thread for first assignment
  const thread = await prisma.chatThread.create({
    data: {
      assignmentId: assignments[0].id,
      userId: user.id,
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      { threadId: thread.id, role: "user", content: "What do I need to submit?" },
      { threadId: thread.id, role: "assistant", content: "For this assignment, you need to submit a program that prints 'Hello, World!' to the console." },
    ],
  });

  // Create reminder rules
  await prisma.reminderRule.create({
    data: {
      userId: user.id,
      triggerHoursBefore: 48,
      channel: "email",
      quietStart: 22,
      quietEnd: 8,
    },
  });

  console.log("Seed completed successfully.");
  console.log("User:", user.email);
  console.log("Courses:", courses.length);
  console.log("Assignments:", assignments.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
