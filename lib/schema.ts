import { boolean, integer, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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

export const activityTypeEnum = pgEnum("activity_type", ["watch", "listen", "read", "write"]);

export const activities = pgTable("activities", {
  id: text("id").primaryKey(),
  sectionId: text("section_id")
    .notNull()
    .references(() => sections.id, { onDelete: "cascade" }),
  type: activityTypeEnum("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  contentPayload: text("content_payload"),
  sourceRef: text("source_ref"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Module = typeof modules.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type Activity = typeof activities.$inferSelect;

export const assessmentTypeEnum = pgEnum("assessment_type", ["open_ended", "mcq"]);

export const assessments = pgTable("assessments", {
  id: text("id").primaryKey(),
  activityId: text("activity_id")
    .notNull()
    .references(() => activities.id, { onDelete: "cascade" }),
  type: assessmentTypeEnum("type").notNull().default("open_ended"),
  title: text("title").notNull(),
  description: text("description"),
  graded: boolean("graded").notNull().default(false),
  mcqModel: text("mcq_model"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Assessment = typeof assessments.$inferSelect;

export const submissions = pgTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    submissionText: text("submission_text"),
    fileUrl: text("file_url"),
    mcqAnswers: text("mcq_answers"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueSubmission: uniqueIndex("submissions_assessment_user_unique").on(table.assessmentId, table.userId),
  })
);

export const completions = pgTable(
  "completions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueCompletion: uniqueIndex("completions_user_activity_unique").on(table.userId, table.activityId),
  })
);

export type Submission = typeof submissions.$inferSelect;
export type Completion = typeof completions.$inferSelect;

export const activityNotes = pgTable(
  "activity_notes",
  {
    id: text("id").primaryKey(),
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueActivityUser: uniqueIndex("activity_notes_activity_user_unique").on(
      table.activityId,
      table.userId
    ),
  })
);

export type ActivityNote = typeof activityNotes.$inferSelect;

export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  preferredName: text("preferred_name"),
  timezone: text("timezone"),
  location: text("location"),
  linkedin: text("linkedin"),
  bio: text("bio"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;

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
  assessmentId: text("assessment_id")
    .notNull()
    .references(() => assessments.id, { onDelete: "cascade" }),
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

// ── OpenStax Content Library ───────────────────────────────────────────────

export const openstaxBooks = pgTable("openstax_books", {
  id: text("id").primaryKey(),          // slug, e.g. "college-physics-2e"
  title: text("title").notNull(),
  subject: text("subject"),
  cnxId: text("cnx_id").notNull(),      // archive.cnx.org UUID
  sourceUrl: text("source_url"),
  chapterCount: integer("chapter_count"),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const openstaxChapters = pgTable("openstax_chapters", {
  id: text("id").primaryKey(),          // composite: bookId-chapterNumber
  bookId: text("book_id").notNull().references(() => openstaxBooks.id, { onDelete: "cascade" }),
  chapterNumber: integer("chapter_number").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const openstaxSections = pgTable("openstax_sections", {
  id: text("id").primaryKey(),          // UUID from archive tree
  chapterId: text("chapter_id").notNull().references(() => openstaxChapters.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  contentHtml: text("content_html"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type OpenstaxBook = typeof openstaxBooks.$inferSelect;
export type OpenstaxChapter = typeof openstaxChapters.$inferSelect;
export type OpenstaxSection = typeof openstaxSections.$inferSelect;

// ── App Settings ───────────────────────────────────────────────────────────

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;
