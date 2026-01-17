// Attio API Types

export interface AttioId {
  workspace_id: string;
  object_id?: string;
  record_id?: string;
  list_id?: string;
  entry_id?: string;
  note_id?: string;
  task_id?: string;
  attribute_id?: string;
}

export interface AttioObject {
  id: AttioId;
  api_slug: string;
  singular_noun: string;
  plural_noun: string;
  created_at: string;
}

export interface AttioAttribute {
  id: AttioId;
  title: string;
  description: string | null;
  api_slug: string;
  type: string;
  is_system_attribute: boolean;
  is_writable: boolean;
  is_required: boolean;
  is_unique: boolean;
  is_multiselect: boolean;
  is_default_value_enabled: boolean;
  is_archived: boolean;
  default_value: unknown;
  relationship: unknown | null;
  created_at: string;
}

export interface AttioRecord {
  id: AttioId;
  created_at: string;
  web_url: string;
  values: Record<string, AttioAttributeValue[]>;
}

export interface AttioAttributeValue {
  active_from: string;
  active_until: string | null;
  created_by_actor: AttioActor;
  attribute_type: string;
  [key: string]: unknown; // Type-specific fields
}

export interface AttioActor {
  type: "workspace-member" | "api-token" | "system";
  id: string | null;
}

export interface AttioList {
  id: AttioId;
  api_slug: string;
  name: string;
  parent_object: string[];
  workspace_access: "full-access" | "read-and-write" | "read-only" | null;
  workspace_member_access: AttioMemberAccess[];
  created_by_actor: AttioActor;
  created_at: string;
}

export interface AttioMemberAccess {
  workspace_member_id: string;
  access_level: "full-access" | "read-and-write" | "read-only";
}

export interface AttioEntry {
  id: AttioId;
  parent_record_id: string;
  parent_object: string;
  created_at: string;
  values: Record<string, AttioAttributeValue[]>;
}

export interface AttioNote {
  id: AttioId;
  parent_object: string;
  parent_record_id: string;
  title: string;
  content_plaintext: string;
  content_markdown: string;
  created_by_actor: AttioActor;
  created_at: string;
}

export interface AttioTask {
  id: AttioId;
  content_plaintext: string;
  deadline_at: string | null;
  is_completed: boolean;
  linked_records: AttioLinkedRecord[];
  assignees: AttioWorkspaceMember[];
  created_by_actor: AttioActor;
  created_at: string;
}

export interface AttioLinkedRecord {
  target_object_id: string;
  target_record_id: string;
}

export interface AttioWorkspaceMember {
  id: AttioId;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  email_address: string;
  created_at: string;
  access_level: "admin" | "member" | "suspended";
}

export interface AttioThread {
  id: AttioId;
  comments: AttioComment[];
  created_at: string;
}

export interface AttioComment {
  id: AttioId;
  thread_id: string;
  content_plaintext: string;
  author: AttioActor;
  created_at: string;
  resolved_at: string | null;
  resolved_by: AttioActor | null;
}

export interface AttioWebhook {
  id: AttioId;
  target_url: string;
  subscriptions: AttioWebhookSubscription[];
  status: "active" | "disabled";
  created_at: string;
}

export interface AttioWebhookSubscription {
  event_type: string;
  filter: AttioWebhookFilter;
}

export interface AttioWebhookFilter {
  $and?: Record<string, unknown>[];
  $or?: Record<string, unknown>[];
  object?: string;
  list?: string;
}

// API Response Types

export interface PaginatedResponse<T> {
  data: T[];
}

export interface SingleResponse<T> {
  data: T;
}

// API Request Types

export interface RecordsQueryRequest {
  filter?: RecordFilter;
  sorts?: RecordSort[];
  limit?: number;
  offset?: number;
}

export interface RecordFilter {
  attribute?: string;
  condition?: FilterCondition;
  value?: unknown;
  and?: RecordFilter[];
  or?: RecordFilter[];
}

export type FilterCondition =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equals"
  | "less_than_or_equals";

export interface RecordSort {
  attribute: string;
  direction: "asc" | "desc";
}

export interface RecordCreateRequest {
  data: {
    values: Record<string, unknown>;
  };
}

export interface RecordUpdateRequest {
  data: {
    values: Record<string, unknown>;
  };
}

export interface RecordAssertRequest {
  data: {
    values: Record<string, unknown>;
  };
  matching_attribute: string;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  objects?: string[];
}

// Error Types

export interface AttioErrorResponse {
  status_code: number;
  type: string;
  code: string;
  message: string;
}
