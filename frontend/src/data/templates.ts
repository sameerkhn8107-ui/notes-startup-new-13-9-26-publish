// M6: EXACTLY 60 ready-made templates with real structure (blocks + databases).
// Installing clones everything with fresh IDs -> fully independent copies.
import { BlockType } from "@/src/db/pages-types";
import { PropertyType, ViewType } from "@/src/db/workspace-types";
import { genId, nowIso } from "@/src/lib/id";
import { serializeBlockContent } from "@/src/lib/blocks";
import { createPage } from "@/src/db/pages-repo";
import { replacePageBlocks } from "@/src/db/pages-repo";
import {
  addProperty,
  addRecentTemplate,
  addView,
  createEmptyDatabase,
  createRecord,
} from "@/src/db/workspace-store";

export interface TplBlock {
  type: BlockType;
  text?: string;
  checked?: boolean;
  emoji?: string;
}
export interface TplProp {
  name: string;
  type: PropertyType;
  options?: string[];
}
export interface TplDatabase {
  title: string;
  properties: TplProp[];
  records?: Record<string, any>[];
  views?: ViewType[];
}
export interface Template {
  id: string;
  name: string;
  icon: string;
  category: string;
  keywords: string[];
  description: string;
  blocks: TplBlock[];
  databases?: TplDatabase[];
}

// block shortcuts
const h1 = (t: string): TplBlock => ({ type: "h1", text: t });
const h2 = (t: string): TplBlock => ({ type: "h2", text: t });
const h3 = (t: string): TplBlock => ({ type: "h3", text: t });
const p = (t: string): TplBlock => ({ type: "text", text: t });
const b = (t: string): TplBlock => ({ type: "bullet", text: t });
const todo = (t: string): TplBlock => ({ type: "checklist", text: t, checked: false });
const quote = (t: string): TplBlock => ({ type: "quote", text: t });
const call = (t: string, emoji = "\uD83D\uDCA1"): TplBlock => ({ type: "callout", text: t, emoji });
const div = (): TplBlock => ({ type: "divider" });

const S = "select";
const D = "date";
const N = "number";
const C = "checkbox";
const TXT = "text";
const TTL = "title";

export const CATEGORIES = [
  "Personal & Life",
  "Productivity",
  "Study & Education",
  "Goals & Habits",
  "Projects & Work",
  "Finance",
  "Health & Fitness",
  "Content & Creator",
  "Travel & Lifestyle",
  "Knowledge & Reading",
];

export const TEMPLATES: Template[] = [
  // ---- Personal & Life ----
  { id: "personal-dashboard", name: "Personal Dashboard", icon: "\uD83C\uDFE0", category: "Personal & Life", keywords: ["home", "overview", "life"], description: "A central hub for your day, tasks and notes.",
    blocks: [h1("Personal Dashboard"), call("Welcome back! Here's your day at a glance."), h2("Today's Focus"), todo("Most important task"), todo("Second priority"), h2("Quick Notes"), p("Jot anything here...")],
    databases: [{ title: "Today's Tasks", properties: [{ name: "Task", type: TTL }, { name: "Status", type: S, options: ["Todo", "In Progress", "Done"] }, { name: "Due", type: D }], views: ["table", "board"], records: [{ Task: "Plan the day", Status: "Todo" }, { Task: "Review inbox", Status: "In Progress" }] }] },
  { id: "daily-journal", name: "Daily Journal", icon: "\uD83D\uDCD3", category: "Personal & Life", keywords: ["journal", "diary", "reflection"], description: "Reflect on your day with guided prompts.",
    blocks: [h1("Daily Journal"), h2("How I feel today"), p(""), h2("Three things that happened"), b(""), b(""), b(""), h2("What I'm grateful for"), p("")] },
  { id: "gratitude-journal", name: "Gratitude Journal", icon: "\uD83D\uDE4F", category: "Personal & Life", keywords: ["gratitude", "thankful"], description: "Cultivate gratitude daily.",
    blocks: [h1("Gratitude Journal"), call("Write 3 things you're grateful for each day."), todo("Grateful for..."), todo("Grateful for..."), todo("Grateful for...")] },
  { id: "mood-journal", name: "Mood Journal", icon: "\uD83D\uDE0A", category: "Personal & Life", keywords: ["mood", "emotions"], description: "Track your mood over time.",
    blocks: [h1("Mood Journal"), p("Log your mood and what influenced it.")],
    databases: [{ title: "Mood Log", properties: [{ name: "Date", type: TTL }, { name: "Mood", type: S, options: ["Great", "Good", "Okay", "Low", "Bad"] }, { name: "Energy", type: N }, { name: "Note", type: TXT }], views: ["table", "calendar"], records: [{ Date: "Today", Mood: "Good", Energy: 7 }] }] },
  { id: "life-goals", name: "Life Goals", icon: "\uD83C\uDF1F", category: "Personal & Life", keywords: ["goals", "vision"], description: "Define and track your big life goals.",
    blocks: [h1("Life Goals"), h2("Vision"), p("")],
    databases: [{ title: "Goals", properties: [{ name: "Goal", type: TTL }, { name: "Area", type: S, options: ["Career", "Health", "Relationships", "Finance", "Personal"] }, { name: "Target Date", type: D }, { name: "Progress", type: N }], views: ["table", "board"], records: [{ Goal: "Run a marathon", Area: "Health", Progress: 20 }] }] },
  { id: "bucket-list", name: "Bucket List", icon: "\uD83E\uDEA3", category: "Personal & Life", keywords: ["bucket", "dreams"], description: "Things to do before... everything.",
    blocks: [h1("Bucket List")],
    databases: [{ title: "Bucket List", properties: [{ name: "Experience", type: TTL }, { name: "Category", type: S, options: ["Travel", "Skill", "Adventure", "Other"] }, { name: "Done", type: C }], views: ["gallery", "table"], records: [{ Experience: "See the Northern Lights", Category: "Travel", Done: false }] }] },
  { id: "personal-growth", name: "Personal Growth Tracker", icon: "\uD83C\uDF31", category: "Personal & Life", keywords: ["growth", "self improvement"], description: "Track skills and personal development.",
    blocks: [h1("Personal Growth Tracker"), h2("Focus areas"), b("Mindset"), b("Skills"), b("Relationships")],
    databases: [{ title: "Growth Areas", properties: [{ name: "Area", type: TTL }, { name: "Level", type: N }, { name: "Next Step", type: TXT }], views: ["table"], records: [{ Area: "Public Speaking", Level: 3 }] }] },
  { id: "morning-routine", name: "Morning Routine", icon: "\u2600\uFE0F", category: "Personal & Life", keywords: ["routine", "morning"], description: "Start every day right.",
    blocks: [h1("Morning Routine"), todo("Drink water"), todo("Stretch / exercise"), todo("Plan the day"), todo("Healthy breakfast")] },

  // ---- Productivity ----
  { id: "daily-planner", name: "Daily Planner", icon: "\uD83D\uDCC5", category: "Productivity", keywords: ["planner", "day"], description: "Plan your day hour by hour.",
    blocks: [h1("Daily Planner"), h2("Top 3 priorities"), todo(""), todo(""), todo(""), h2("Schedule"), p("Morning:"), p("Afternoon:"), p("Evening:")] },
  { id: "weekly-planner", name: "Weekly Planner", icon: "\uD83D\uDCC6", category: "Productivity", keywords: ["planner", "week"], description: "Organize your entire week.",
    blocks: [h1("Weekly Planner"), h2("Goals this week"), todo(""), h2("Mon"), p(""), h2("Tue"), p(""), h2("Wed"), p("")] },
  { id: "monthly-planner", name: "Monthly Planner", icon: "\uD83D\uDDD3\uFE0F", category: "Productivity", keywords: ["planner", "month"], description: "Big-picture monthly planning.",
    blocks: [h1("Monthly Planner"), h2("Monthly goals"), todo("")],
    databases: [{ title: "Monthly Milestones", properties: [{ name: "Milestone", type: TTL }, { name: "Date", type: D }, { name: "Status", type: S, options: ["Planned", "Doing", "Done"] }], views: ["calendar", "table"] }] },
  { id: "time-blocking", name: "Time Blocking", icon: "\u23F1\uFE0F", category: "Productivity", keywords: ["time", "focus"], description: "Block time for deep work.",
    blocks: [h1("Time Blocking"), p("Assign each block a single focus."), h3("08:00 - 10:00"), p("Deep work"), h3("10:00 - 12:00"), p("Meetings")] },
  { id: "todo-list", name: "To-Do List", icon: "\u2705", category: "Productivity", keywords: ["todo", "tasks"], description: "A simple, powerful to-do list.",
    blocks: [h1("To-Do List"), todo("Add your first task"), todo("Add another task")] },
  { id: "priority-matrix", name: "Priority Matrix", icon: "\uD83D\uDD32", category: "Productivity", keywords: ["eisenhower", "priority"], description: "Urgent vs important decision matrix.",
    blocks: [h1("Priority Matrix"), h2("Do first (Urgent + Important)"), todo(""), h2("Schedule (Important)"), todo(""), h2("Delegate (Urgent)"), todo(""), h2("Eliminate")]  },
  { id: "gtd", name: "Getting Things Done", icon: "\uD83D\uDCE5", category: "Productivity", keywords: ["gtd", "inbox"], description: "Capture, clarify, organize, engage.",
    blocks: [h1("Getting Things Done"), h2("Inbox"), todo(""), h2("Next Actions"), todo(""), h2("Waiting For"), todo(""), h2("Someday / Maybe")] },
  { id: "productivity-dashboard", name: "Productivity Dashboard", icon: "\uD83D\uDE80", category: "Productivity", keywords: ["dashboard", "focus"], description: "Everything productive in one place.",
    blocks: [h1("Productivity Dashboard"), call("Stay focused on what matters.")],
    databases: [{ title: "Tasks", properties: [{ name: "Task", type: TTL }, { name: "Priority", type: S, options: ["Low", "Medium", "High", "Urgent"] }, { name: "Status", type: S, options: ["Todo", "In Progress", "Done"] }, { name: "Due", type: D }], views: ["board", "table", "calendar"], records: [{ Task: "Ship feature", Priority: "High", Status: "In Progress" }] }] },

  // ---- Study & Education ----
  { id: "student-dashboard", name: "Student Dashboard", icon: "\uD83C\uDF93", category: "Study & Education", keywords: ["student", "school"], description: "Your academic command center.",
    blocks: [h1("Student Dashboard"), call("Track classes, assignments and exams.")],
    databases: [{ title: "Assignments", properties: [{ name: "Assignment", type: TTL }, { name: "Subject", type: S, options: ["Math", "Science", "History", "English"] }, { name: "Due", type: D }, { name: "Status", type: S, options: ["Todo", "Doing", "Done"] }], views: ["table", "board", "calendar"], records: [{ Assignment: "Essay draft", Subject: "English", Status: "Todo" }] }] },
  { id: "study-planner", name: "Study Planner", icon: "\uD83D\uDCDA", category: "Study & Education", keywords: ["study", "plan"], description: "Plan study sessions effectively.",
    blocks: [h1("Study Planner"), h2("This week's focus"), todo(""), todo("")],
    databases: [{ title: "Study Sessions", properties: [{ name: "Topic", type: TTL }, { name: "Subject", type: TXT }, { name: "Date", type: D }, { name: "Hours", type: N }], views: ["table", "calendar"] }] },
  { id: "class-notes", name: "Class Notes", icon: "\uD83D\uDCDD", category: "Study & Education", keywords: ["notes", "class"], description: "Structured note-taking for classes.",
    blocks: [h1("Class Notes"), p("Subject:"), p("Date:"), h2("Key Points"), b(""), h2("Questions"), b(""), h2("Summary"), p("")] },
  { id: "lecture-notes", name: "Lecture Notes", icon: "\uD83C\uDFAB", category: "Study & Education", keywords: ["lecture", "cornell"], description: "Cornell-style lecture notes.",
    blocks: [h1("Lecture Notes"), h2("Cues"), b(""), h2("Notes"), p(""), h2("Summary"), p("")] },
  { id: "exam-prep", name: "Exam Preparation", icon: "\uD83D\uDCD6", category: "Study & Education", keywords: ["exam", "revision"], description: "Get exam-ready systematically.",
    blocks: [h1("Exam Preparation"), h2("Topics to cover"), todo(""), todo(""), h2("Practice"), todo("Past papers")],
    databases: [{ title: "Topics", properties: [{ name: "Topic", type: TTL }, { name: "Confidence", type: S, options: ["Low", "Medium", "High"] }, { name: "Reviewed", type: C }], views: ["board", "table"] }] },
  { id: "assignment-tracker", name: "Assignment Tracker", icon: "\uD83D\uDCCB", category: "Study & Education", keywords: ["assignment", "homework"], description: "Never miss a deadline.",
    blocks: [h1("Assignment Tracker")],
    databases: [{ title: "Assignments", properties: [{ name: "Assignment", type: TTL }, { name: "Course", type: TXT }, { name: "Due", type: D }, { name: "Status", type: S, options: ["Not started", "In progress", "Submitted"] }, { name: "Grade", type: TXT }], views: ["table", "board", "calendar"], records: [{ Assignment: "Lab report", Status: "Not started" }] }] },
  { id: "subject-tracker", name: "Subject Tracker", icon: "\uD83D\uDCD8", category: "Study & Education", keywords: ["subject", "grades"], description: "Track subjects and grades.",
    blocks: [h1("Subject Tracker")],
    databases: [{ title: "Subjects", properties: [{ name: "Subject", type: TTL }, { name: "Teacher", type: TXT }, { name: "Credits", type: N }, { name: "Grade", type: TXT }], views: ["table"] }] },
  { id: "semester-planner", name: "Semester Planner", icon: "\uD83D\uDDD3\uFE0F", category: "Study & Education", keywords: ["semester", "term"], description: "Plan the whole semester.",
    blocks: [h1("Semester Planner"), h2("Goals"), todo(""), h2("Key dates"), b("Midterms"), b("Finals")] },
  { id: "revision-tracker", name: "Revision Tracker", icon: "\uD83D\uDD01", category: "Study & Education", keywords: ["revision", "spaced"], description: "Spaced-repetition revision tracker.",
    blocks: [h1("Revision Tracker")],
    databases: [{ title: "Revision", properties: [{ name: "Topic", type: TTL }, { name: "Last Reviewed", type: D }, { name: "Next Review", type: D }, { name: "Mastery", type: N }], views: ["table", "calendar"] }] },
  { id: "research-notes", name: "Research Notes", icon: "\uD83D\uDD2C", category: "Study & Education", keywords: ["research", "sources"], description: "Organize research and sources.",
    blocks: [h1("Research Notes"), h2("Question"), p(""), h2("Sources"), b(""), h2("Findings"), p("")] },

  // ---- Goals & Habits ----
  { id: "habit-tracker", name: "Habit Tracker", icon: "\uD83D\uDD01", category: "Goals & Habits", keywords: ["habit", "streak"], description: "Build habits that stick.",
    blocks: [h1("Habit Tracker"), call("Consistency beats intensity.")],
    databases: [{ title: "Habits", properties: [{ name: "Habit", type: TTL }, { name: "Frequency", type: S, options: ["Daily", "Weekly"] }, { name: "Streak", type: N }, { name: "Done Today", type: C }], views: ["table", "board"], records: [{ Habit: "Read 20 min", Frequency: "Daily", Streak: 3 }] }] },
  { id: "30-day-challenge", name: "30-Day Challenge", icon: "\uD83D\uDCAA", category: "Goals & Habits", keywords: ["challenge", "30 days"], description: "Commit to a 30-day challenge.",
    blocks: [h1("30-Day Challenge"), p("Challenge:"), h2("Progress"), todo("Day 1"), todo("Day 2"), todo("Day 3")] },
  { id: "goal-tracker", name: "Goal Tracker", icon: "\uD83C\uDFAF", category: "Goals & Habits", keywords: ["goal", "okr"], description: "Track goals and key results.",
    blocks: [h1("Goal Tracker")],
    databases: [{ title: "Goals", properties: [{ name: "Goal", type: TTL }, { name: "Metric", type: TXT }, { name: "Target", type: N }, { name: "Current", type: N }, { name: "Deadline", type: D }], views: ["table", "board"], records: [{ Goal: "Save money", Target: 5000, Current: 1200 }] }] },
  { id: "new-year-goals", name: "New Year Goals", icon: "\uD83C\uDF86", category: "Goals & Habits", keywords: ["new year", "resolutions"], description: "Set intentions for the year.",
    blocks: [h1("New Year Goals"), h2("Theme for the year"), p(""), h2("Goals by area"), b("Health"), b("Career"), b("Personal")] },
  { id: "fitness-goals", name: "Fitness Goals", icon: "\uD83C\uDFCB\uFE0F", category: "Goals & Habits", keywords: ["fitness", "goals"], description: "Define fitness targets.",
    blocks: [h1("Fitness Goals")],
    databases: [{ title: "Fitness Goals", properties: [{ name: "Goal", type: TTL }, { name: "Type", type: S, options: ["Strength", "Cardio", "Flexibility"] }, { name: "Target", type: TXT }, { name: "Done", type: C }], views: ["table", "board"] }] },
  { id: "reading-goals", name: "Reading Goals", icon: "\uD83D\uDCD6", category: "Goals & Habits", keywords: ["reading", "books"], description: "Hit your reading targets.",
    blocks: [h1("Reading Goals"), p("Yearly target: ___ books")],
    databases: [{ title: "Reading List", properties: [{ name: "Book", type: TTL }, { name: "Author", type: TXT }, { name: "Status", type: S, options: ["To Read", "Reading", "Finished"] }, { name: "Rating", type: N }], views: ["board", "gallery", "table"] }] },
  { id: "habit-goal-dashboard", name: "Habit + Goal Dashboard", icon: "\uD83D\uDCCA", category: "Goals & Habits", keywords: ["dashboard", "habits", "goals"], description: "Habits and goals together.",
    blocks: [h1("Habit + Goal Dashboard"), h2("Active goals"), todo(""), h2("Daily habits"), todo("")] },

  // ---- Projects & Work ----
  { id: "project-dashboard", name: "Project Dashboard", icon: "\uD83D\uDCC1", category: "Projects & Work", keywords: ["project", "dashboard"], description: "Manage a project end-to-end.",
    blocks: [h1("Project Dashboard"), call("Overview, tasks and milestones.")],
    databases: [{ title: "Project Tasks", properties: [{ name: "Task", type: TTL }, { name: "Owner", type: TXT }, { name: "Status", type: S, options: ["Backlog", "In Progress", "Review", "Done"] }, { name: "Due", type: D }], views: ["board", "table", "calendar"], records: [{ Task: "Kickoff", Status: "Done" }, { Task: "Design", Status: "In Progress" }] }] },
  { id: "project-planner", name: "Project Planner", icon: "\uD83D\uDCD0", category: "Projects & Work", keywords: ["plan", "scope"], description: "Plan scope, timeline and resources.",
    blocks: [h1("Project Planner"), h2("Objective"), p(""), h2("Scope"), b(""), h2("Milestones"), todo("")] },
  { id: "task-management", name: "Task Management", icon: "\uD83D\uDDC2\uFE0F", category: "Projects & Work", keywords: ["tasks", "kanban"], description: "A flexible task board.",
    blocks: [h1("Task Management")],
    databases: [{ title: "Tasks", properties: [{ name: "Task", type: TTL }, { name: "Status", type: S, options: ["Todo", "Doing", "Done"] }, { name: "Priority", type: S, options: ["Low", "Medium", "High"] }], views: ["board", "table"], records: [{ Task: "Example task", Status: "Todo" }] }] },
  { id: "project-timeline", name: "Project Timeline", icon: "\uD83D\uDCC8", category: "Projects & Work", keywords: ["timeline", "gantt"], description: "Visualize project phases.",
    blocks: [h1("Project Timeline")],
    databases: [{ title: "Phases", properties: [{ name: "Phase", type: TTL }, { name: "Start", type: D }, { name: "End", type: D }, { name: "Status", type: S, options: ["Planned", "Active", "Done"] }], views: ["calendar", "table"] }] },
  { id: "meeting-notes", name: "Meeting Notes", icon: "\uD83D\uDCC3", category: "Projects & Work", keywords: ["meeting", "notes"], description: "Structured meeting notes.",
    blocks: [h1("Meeting Notes"), p("Date:"), p("Attendees:"), h2("Agenda"), b(""), h2("Notes"), p(""), h2("Action Items"), todo("")] },
  { id: "meeting-action-items", name: "Meeting Action Items", icon: "\u2611\uFE0F", category: "Projects & Work", keywords: ["actions", "follow up"], description: "Track meeting follow-ups.",
    blocks: [h1("Meeting Action Items")],
    databases: [{ title: "Action Items", properties: [{ name: "Action", type: TTL }, { name: "Owner", type: TXT }, { name: "Due", type: D }, { name: "Done", type: C }], views: ["table", "board"] }] },
  { id: "team-workspace", name: "Team Workspace", icon: "\uD83D\uDC65", category: "Projects & Work", keywords: ["team", "workspace"], description: "Shared team hub.",
    blocks: [h1("Team Workspace"), h2("Team goals"), todo(""), h2("Resources"), b(""), h2("Announcements"), p("")] },
  { id: "work-dashboard", name: "Work Dashboard", icon: "\uD83D\uDCBC", category: "Projects & Work", keywords: ["work", "dashboard"], description: "Your professional command center.",
    blocks: [h1("Work Dashboard"), h2("Priorities"), todo(""), h2("Projects"), b("")] },

  // ---- Finance ----
  { id: "monthly-budget", name: "Monthly Budget", icon: "\uD83D\uDCB0", category: "Finance", keywords: ["budget", "money"], description: "Plan income and expenses.",
    blocks: [h1("Monthly Budget"), call("Give every dollar a job.")],
    databases: [{ title: "Budget", properties: [{ name: "Item", type: TTL }, { name: "Type", type: S, options: ["Income", "Expense"] }, { name: "Category", type: S, options: ["Rent", "Food", "Transport", "Fun", "Savings"] }, { name: "Amount", type: N }], views: ["table", "board"], records: [{ Item: "Salary", Type: "Income", Amount: 4000 }, { Item: "Rent", Type: "Expense", Category: "Rent", Amount: 1200 }] }] },
  { id: "expense-tracker", name: "Expense Tracker", icon: "\uD83D\uDCB8", category: "Finance", keywords: ["expenses", "spending"], description: "Track every expense.",
    blocks: [h1("Expense Tracker")],
    databases: [{ title: "Expenses", properties: [{ name: "Expense", type: TTL }, { name: "Date", type: D }, { name: "Category", type: S, options: ["Food", "Transport", "Bills", "Shopping", "Other"] }, { name: "Amount", type: N }], views: ["table", "calendar"], records: [{ Expense: "Groceries", Category: "Food", Amount: 45 }] }] },
  { id: "income-tracker", name: "Income Tracker", icon: "\uD83D\uDCB5", category: "Finance", keywords: ["income", "earnings"], description: "Track income sources.",
    blocks: [h1("Income Tracker")],
    databases: [{ title: "Income", properties: [{ name: "Source", type: TTL }, { name: "Date", type: D }, { name: "Amount", type: N }, { name: "Recurring", type: C }], views: ["table"] }] },
  { id: "savings-goal", name: "Savings Goal", icon: "\uD83C\uDFE6", category: "Finance", keywords: ["savings", "goal"], description: "Reach your savings targets.",
    blocks: [h1("Savings Goal")],
    databases: [{ title: "Savings Goals", properties: [{ name: "Goal", type: TTL }, { name: "Target", type: N }, { name: "Saved", type: N }, { name: "Deadline", type: D }], views: ["table", "board"], records: [{ Goal: "Emergency fund", Target: 10000, Saved: 3500 }] }] },
  { id: "finance-dashboard", name: "Personal Finance Dashboard", icon: "\uD83D\uDCCA", category: "Finance", keywords: ["finance", "dashboard"], description: "All your money in one view.",
    blocks: [h1("Personal Finance Dashboard"), h2("Net worth"), p(""), h2("This month"), b("Income"), b("Expenses"), b("Savings")] },

  // ---- Health & Fitness ----
  { id: "workout-planner", name: "Workout Planner", icon: "\uD83C\uDFCB\uFE0F", category: "Health & Fitness", keywords: ["workout", "gym"], description: "Plan your training split.",
    blocks: [h1("Workout Planner")],
    databases: [{ title: "Workouts", properties: [{ name: "Day", type: TTL }, { name: "Focus", type: S, options: ["Push", "Pull", "Legs", "Cardio", "Rest"] }, { name: "Exercises", type: TXT }], views: ["table", "board", "calendar"], records: [{ Day: "Monday", Focus: "Push" }] }] },
  { id: "workout-log", name: "Workout Log", icon: "\uD83D\uDCAA", category: "Health & Fitness", keywords: ["log", "exercise"], description: "Log sets, reps and weights.",
    blocks: [h1("Workout Log")],
    databases: [{ title: "Log", properties: [{ name: "Exercise", type: TTL }, { name: "Date", type: D }, { name: "Sets", type: N }, { name: "Reps", type: N }, { name: "Weight", type: N }], views: ["table", "calendar"] }] },
  { id: "meal-planner", name: "Meal Planner", icon: "\uD83C\uDF7D\uFE0F", category: "Health & Fitness", keywords: ["meals", "food"], description: "Plan meals for the week.",
    blocks: [h1("Meal Planner")],
    databases: [{ title: "Meals", properties: [{ name: "Meal", type: TTL }, { name: "Day", type: S, options: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] }, { name: "Type", type: S, options: ["Breakfast", "Lunch", "Dinner", "Snack"] }, { name: "Calories", type: N }], views: ["board", "table", "calendar"] }] },
  { id: "water-tracker", name: "Water Tracker", icon: "\uD83D\uDCA7", category: "Health & Fitness", keywords: ["water", "hydration"], description: "Stay hydrated every day.",
    blocks: [h1("Water Tracker"), p("Goal: 8 glasses/day"), todo("Glass 1"), todo("Glass 2"), todo("Glass 3"), todo("Glass 4"), todo("Glass 5"), todo("Glass 6"), todo("Glass 7"), todo("Glass 8")] },
  { id: "health-dashboard", name: "Health & Wellness Dashboard", icon: "\uD83E\uDDD8", category: "Health & Fitness", keywords: ["health", "wellness"], description: "Holistic health overview.",
    blocks: [h1("Health & Wellness Dashboard"), h2("Today"), todo("Sleep 8h"), todo("Exercise"), todo("Eat well"), h2("Metrics"), b("Weight"), b("Steps")] },

  // ---- Content & Creator ----
  { id: "content-calendar", name: "Content Calendar", icon: "\uD83D\uDCC5", category: "Content & Creator", keywords: ["content", "calendar"], description: "Plan and schedule content.",
    blocks: [h1("Content Calendar")],
    databases: [{ title: "Content", properties: [{ name: "Title", type: TTL }, { name: "Platform", type: S, options: ["Instagram", "YouTube", "Blog", "X"] }, { name: "Status", type: S, options: ["Idea", "Draft", "Scheduled", "Published"] }, { name: "Publish Date", type: D }], views: ["calendar", "board", "table"], records: [{ Title: "Launch post", Status: "Idea" }] }] },
  { id: "social-media-planner", name: "Social Media Planner", icon: "\uD83D\uDCF1", category: "Content & Creator", keywords: ["social", "planner"], description: "Coordinate social posts.",
    blocks: [h1("Social Media Planner")],
    databases: [{ title: "Posts", properties: [{ name: "Post", type: TTL }, { name: "Platform", type: S, options: ["Instagram", "TikTok", "X", "LinkedIn"] }, { name: "Date", type: D }, { name: "Status", type: S, options: ["Draft", "Scheduled", "Posted"] }], views: ["board", "calendar", "table"] }] },
  { id: "youtube-planner", name: "YouTube Video Planner", icon: "\uD83C\uDFAC", category: "Content & Creator", keywords: ["youtube", "video"], description: "From idea to upload.",
    blocks: [h1("YouTube Video Planner"), h2("Title"), p(""), h2("Script"), p(""), h2("Checklist"), todo("Film"), todo("Edit"), todo("Thumbnail"), todo("Upload")] },
  { id: "content-ideas", name: "Content Ideas Database", icon: "\uD83D\uDCA1", category: "Content & Creator", keywords: ["ideas", "content"], description: "Capture content ideas.",
    blocks: [h1("Content Ideas Database")],
    databases: [{ title: "Ideas", properties: [{ name: "Idea", type: TTL }, { name: "Format", type: S, options: ["Short", "Long", "Post", "Story"] }, { name: "Priority", type: S, options: ["Low", "Medium", "High"] }], views: ["gallery", "board", "table"], records: [{ Idea: "Behind the scenes", Priority: "Medium" }] }] },

  // ---- Travel & Lifestyle ----
  { id: "travel-planner", name: "Travel Planner", icon: "\u2708\uFE0F", category: "Travel & Lifestyle", keywords: ["travel", "trip"], description: "Plan your next adventure.",
    blocks: [h1("Travel Planner"), h2("Destination"), p(""), h2("Budget"), p(""), h2("To book"), todo("Flights"), todo("Hotel")],
    databases: [{ title: "Itinerary", properties: [{ name: "Activity", type: TTL }, { name: "Day", type: D }, { name: "Location", type: TXT }], views: ["calendar", "table"] }] },
  { id: "trip-itinerary", name: "Trip Itinerary", icon: "\uD83D\uDDFA\uFE0F", category: "Travel & Lifestyle", keywords: ["itinerary", "schedule"], description: "Day-by-day trip schedule.",
    blocks: [h1("Trip Itinerary")],
    databases: [{ title: "Days", properties: [{ name: "Day", type: TTL }, { name: "Date", type: D }, { name: "Plan", type: TXT }], views: ["table", "calendar"] }] },
  { id: "packing-checklist", name: "Packing Checklist", icon: "\uD83E\uDDF3", category: "Travel & Lifestyle", keywords: ["packing", "checklist"], description: "Never forget the essentials.",
    blocks: [h1("Packing Checklist"), h2("Essentials"), todo("Passport"), todo("Phone charger"), todo("Medications"), h2("Clothes"), todo("Shirts"), todo("Shoes"), h2("Toiletries"), todo("Toothbrush")] },

  // ---- Knowledge & Reading ----
  { id: "book-tracker", name: "Book Tracker", icon: "\uD83D\uDCDA", category: "Knowledge & Reading", keywords: ["books", "reading"], description: "Track your reading journey.",
    blocks: [h1("Book Tracker")],
    databases: [{ title: "Books", properties: [{ name: "Title", type: TTL }, { name: "Author", type: TXT }, { name: "Status", type: S, options: ["To Read", "Reading", "Finished"] }, { name: "Rating", type: N }, { name: "Finished", type: D }], views: ["gallery", "board", "table"], records: [{ Title: "Atomic Habits", Author: "James Clear", Status: "Reading" }] }] },
  { id: "knowledge-base", name: "Personal Knowledge Base", icon: "\uD83E\uDDE0", category: "Knowledge & Reading", keywords: ["knowledge", "wiki", "zettelkasten"], description: "Your second brain.",
    blocks: [h1("Personal Knowledge Base"), call("Link notes with [[Page]] and @mentions."), h2("Topics"), b("Create a page per topic"), h2("Recent notes"), p("")] },
];

export function templatesByCategory(cat: string): Template[] {
  return TEMPLATES.filter((t) => t.category === cat);
}
export function searchTemplates(q: string): Template[] {
  const s = q.trim().toLowerCase();
  if (!s) return TEMPLATES;
  return TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(s) ||
      t.description.toLowerCase().includes(s) ||
      t.category.toLowerCase().includes(s) ||
      t.keywords.some((k) => k.toLowerCase().includes(s)),
  );
}

// Install a template into a NEW page (fresh IDs -> fully independent copy).
export async function installTemplate(
  tpl: Template,
  parentPageId: string | null = null,
): Promise<string> {
  const ts = nowIso();
  const page = await createPage(parentPageId, { title: tpl.name, icon: tpl.icon });
  const blocks = tpl.blocks.map((tb, i) => ({
    id: genId("blk"),
    pageId: page.id,
    parentBlockId: null,
    type: tb.type,
    content: serializeBlockContent({ text: tb.text, checked: tb.checked, emoji: tb.emoji }),
    depth: 0,
    orderIndex: i,
    createdAt: ts,
    updatedAt: ts,
  }));
  await replacePageBlocks(page.id, blocks as any);

  for (const dbSpec of tpl.databases ?? []) {
    const database = await createEmptyDatabase(page.id, dbSpec.title, "\uD83D\uDDC3\uFE0F");
    const propIdByName: Record<string, string> = {};
    for (let i = 0; i < dbSpec.properties.length; i++) {
      const ps = dbSpec.properties[i];
      const config: any = {};
      if ((ps.type === "select" || ps.type === "multiselect") && ps.options) {
        config.options = ps.options.map((name) => ({ id: genId("opt"), name, color: "gray" }));
      }
      const prop = await addProperty(database.id, ps.name, ps.type as any, config);
      propIdByName[ps.name] = prop.id;
    }
    const views = dbSpec.views && dbSpec.views.length ? dbSpec.views : (["table"] as ViewType[]);
    for (const vt of views) {
      await addView(database.id, vt, vt.charAt(0).toUpperCase() + vt.slice(1), {});
    }
    for (const rec of dbSpec.records ?? []) {
      const values: Record<string, any> = {};
      for (const key of Object.keys(rec)) {
        const pid = propIdByName[key];
        if (pid) values[pid] = rec[key];
      }
      await createRecord(database.id, values);
    }
  }
  await addRecentTemplate(tpl.id);
  return page.id;
}
