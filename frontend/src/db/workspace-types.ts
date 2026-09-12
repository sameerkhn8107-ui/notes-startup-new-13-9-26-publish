// Shared entity types for M2-M7 (databases, tasks, comments, versions, etc.).
import { Block } from "./pages-types";

export type PropertyType =
  | "title"
  | "text"
  | "number"
  | "checkbox"
  | "select"
  | "multiselect"
  | "date"
  | "datetime"
  | "url"
  | "email"
  | "phone"
  | "file"
  | "created"
  | "updated"
  | "formula"
  | "relation"
  | "rollup";

export type ViewType = "table" | "board" | "list" | "calendar" | "gallery";

export interface SelectOption {
  id: string;
  name: string;
  color: string;
}

export interface PropertyConfig {
  options?: SelectOption[];
  targetDatabaseId?: string; // relation
  relationPropertyId?: string; // rollup
  targetPropertyId?: string; // rollup
  rollupFn?:
    | "count"
    | "count_completed"
    | "sum"
    | "average"
    | "min"
    | "max"
    | "earliest"
    | "latest";
  expr?: string; // formula
}

export interface Property {
  id: string;
  databaseId: string;
  name: string;
  type: PropertyType;
  config: PropertyConfig;
  orderIndex: number;
}

export interface ViewFilter {
  propertyId: string;
  op: "is" | "is_not" | "contains" | "gt" | "lt" | "checked" | "unchecked";
  value?: any;
}

export interface ViewConfig {
  groupByPropertyId?: string;
  datePropertyId?: string;
  sortBy?: { propertyId: string; dir: "asc" | "desc" }[];
  filters?: ViewFilter[];
  hidden?: string[];
  search?: string;
}

export interface DBView {
  id: string;
  databaseId: string;
  type: ViewType;
  name: string;
  config: ViewConfig;
  orderIndex: number;
}

export interface DBRecord {
  id: string;
  databaseId: string;
  pageId: string | null; // linked page for record detail (records-as-pages)
  values: Record<string, any>; // propertyId -> value
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Database {
  id: string;
  pageId: string | null; // host page
  title: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = "todo" | "inprogress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null; // ISO date (yyyy-mm-dd)
  time: string | null; // HH:mm
  tags: string[];
  projectId: string | null;
  relatedPageId: string | null;
  relatedNoteId: string | null;
  reminderAt: string | null; // ISO datetime
  notificationId: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: number;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  targetType: "page" | "block" | "record";
  targetId: string;
  pageId: string | null;
  text: string;
  resolved: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageVersion {
  id: string;
  pageId: string;
  title: string;
  icon: string;
  blocks: Block[];
  label: string;
  createdAt: string;
}

export interface WorkspaceDoc {
  databases: Database[];
  properties: Property[];
  views: DBView[];
  records: DBRecord[];
  tasks: Task[];
  projects: Project[];
  comments: Comment[];
  versions: PageVersion[];
  templateFavorites: string[];
  templateRecent: string[];
}
