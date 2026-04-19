import { integer, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("user_role", ["learner", "instructor", "admin"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Sessions table removed - now using Clerk for authentication

export type User = typeof users.$inferSelect;

export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  instructorId: text("instructor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  published: text("published", { enum: ["true", "false"] })
    .$type<"true" | "false">()
    .default("false")
    .notNull(),
  sourceMetadata: text("source_metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Course = typeof courses.$inferSelect;

export const enrollments = pgTable(
  "enrollments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userCourseUnique: uniqueIndex("enrollments_user_course_unique").on(table.userId, table.courseId),
  })
);

export type Enrollment = typeof enrollments.$inferSelect;

export const modules = pgTable("modules", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order").notNull(),
  sourceRef: text("source_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sections = pgTable("sections", {
  id: text("id").primaryKey(),
  moduleId: text("module_id")
    .notNull()
    .references(() => modules.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order").notNull(),
  sourceRef: text("source_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contentTypeEnum = pgEnum("content_type", ["page", "link", "normalized_text", "pdf", "markdown", "watch", "listen", "read", "write"]);

export const contentItems = pgTable("content_items", {
  id: text("id").primaryKey(),
  sectionId: text("section_id")
    .notNull()
    .references(() => sections.id, { onDelete: "cascade" }),
  type: contentTypeEnum("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  contentPayload: text("content_payload"),
  sourceRef: text("source_ref"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Module = typeof modules.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;

export const assignments = pgTable("assignments", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  sectionId: text("section_id").references(() => sections.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").$type<"open_ended" | "mcq">().notNull().default("open_ended"),
  sourceContentItemId: text("source_content_item_id").references(() => contentItems.id, { onDelete: "set null" }),
  linkedActivityId: text("linked_activity_id").references(() => contentItems.id, { onDelete: "set null" }),
  mcqModel: text("mcq_model"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const submissions = pgTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    submissionText: text("submission_text"),
    fileUrl: text("file_url"),
    mcqAnswers: text("mcq_answers"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueSubmission: uniqueIndex("submissions_assignment_user_unique").on(table.assignmentId, table.userId),
  })
);

export const completions = pgTable(
  "completions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentItemId: text("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueCompletion: uniqueIndex("completions_user_item_unique").on(table.userId, table.contentItemId),
  })
);

export type Completion = typeof completions.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Submission = typeof submissions.$inferSelect;

export const grades = pgTable(
  "grades",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    gradedBy: text("graded_by")
      .references(() => users.id, { onDelete: "cascade" }),
    gradedAt: timestamp("graded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueSubmission: uniqueIndex("grades_submission_unique").on(table.submissionId),
  })
);

export type Grade = typeof grades.$inferSelect;

export const mcqQuestions = pgTable("mcq_questions", {
  id: text("id").primaryKey(),
  assignmentId: text("assignment_id")
    .notNull()
    .references(() => assignments.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  questionText: text("question_text").notNull(),
  options: text("options").notNull(),
  correctIndex: integer("correct_index").notNull(),
  explanation: text("explanation"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type McqQuestion = typeof mcqQuestions.$inferSelect;

export const announcements = pgTable("announcements", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Announcement = typeof announcements.$inferSelect;
