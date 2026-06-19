export type CasePermission =
  | 'case.read'
  | 'case.write_entry'
  | 'case.comment'
  | 'case.upload_file'
  | 'case.download_file'
  | 'case.manage_members'
  | 'case.manage_permissions'
  | 'case.manage_status'
  | 'case.approve_file_visibility'
  | 'case.read_audit'
  | 'case.manage_case_type'
  | 'case.manage_notifications'
  | string;

export type CaseVisibilityMode =
  | 'case_members'
  | 'internal_only'
  | 'selected_members'
  | 'selected_parties'
  | string;

export type CaseVisibilityObject = {
  mode: CaseVisibilityMode;
  memberIds?: string[];
  partyIds?: string[];
};

export type CaseVisibility = CaseVisibilityObject | CaseVisibilityMode;

export type CaseRolePreset = 'attorney' | 'pasante' | 'client' | 'observer' | string;

export type CaseMemberType = 'internal' | 'external' | string;

export type CaseMemberStatus = 'active' | 'removed' | 'invited' | string;

export type CaseExternalVisibilityStatus =
  | 'pending'
  | 'approved'
  | 'restricted'
  | 'rejected'
  | string;

export type CaseStatusDefinition = {
  id: string;
  label?: string;
  name?: string;
  color?: string;
  order?: number;
  active?: boolean;
  isDefault?: boolean;
};

export type CaseType = {
  id: string;
  entityType?: 'case-type';
  name: string;
  description?: string;
  active?: boolean;
  statuses: CaseStatusDefinition[];
  defaultStatusId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CaseRecord = {
  id: string;
  title: string;
  reference?: string;
  description?: string;
  caseTypeId: string;
  statusId: string;
  leadUserId?: string;
  active?: boolean;
  unreadCount?: number;
  createdAt?: string;
  updatedAt?: string;
  lastActivityAt?: string;
};

export type CaseMembership = {
  id: string;
  caseId: string;
  userId?: string;
  email?: string;
  displayName?: string;
  memberType: CaseMemberType;
  rolePreset: CaseRolePreset;
  permissions: CasePermission[];
  status: CaseMemberStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type CaseEntry = {
  id: string;
  caseId: string;
  title: string;
  text: string;
  insertions?: unknown[];
  authorUserId?: string;
  authorDisplayName?: string;
  visibility: CaseVisibility;
  fileIds?: string[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CaseComment = {
  id: string;
  caseId: string;
  entryId: string;
  parentCommentId?: string;
  text: string;
  authorUserId?: string;
  authorDisplayName?: string;
  visibility: CaseVisibility;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CaseFile = {
  id: string;
  caseId: string;
  fileName: string;
  contentType: string;
  size?: number;
  uploadedByUserId?: string;
  uploaderUserId?: string;
  uploadedAt?: string;
  uploadStatus?: 'pending' | 'pending_upload' | 'uploaded' | string;
  externalVisibilityStatus: CaseExternalVisibilityStatus;
  visibility: CaseVisibility;
  createdAt?: string;
  updatedAt?: string;
};

export type CaseNotification = {
  id: string;
  recipientUserId: string;
  caseId: string;
  eventType: string;
  targetType: string;
  targetId: string;
  title: string;
  body: string;
  link: {
    path: string;
  };
  readAt?: string;
  delivery: {
    inApp: {
      status: 'created';
    };
    email: {
      status: 'skipped' | 'pending' | 'sent' | 'failed';
      reason?: string;
      messageId?: string;
      sentAt?: string;
      failedAt?: string;
    };
    webPush: {
      status: 'skipped' | 'queued' | 'sent' | 'failed';
      reason?: string;
    };
  };
  dedupeKey?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CasePushSubscription = {
  id: string;
  userId: string;
  endpointHash: string;
  userAgent?: string;
  status: 'active' | 'disabled' | string;
  createdAt?: string;
  updatedAt?: string;
};

export type CaseNotificationEmailPreferences = {
  available: boolean;
  enabled: boolean;
  entryCreated: boolean;
  commentCreated: boolean;
  fileVisibilityApproved: boolean;
  statusChanged: boolean;
};

export type CaseNotificationWebPushPreferences = {
  available: boolean;
  enabled: boolean;
};

export type CaseNotificationPreferences = {
  id: string;
  email: CaseNotificationEmailPreferences;
  webPush: CaseNotificationWebPushPreferences;
};

export type CaseAuditEvent = {
  id: string;
  caseId: string;
  actorUserId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt?: string;
};

export type CaseListResponse<T> = {
  status: 'success' | string;
  items: T[];
  nextToken?: string | null;
};

export type CaseItemResponse<T> = {
  status: 'success' | string;
  item: T;
};

export type CreateCaseTypeRequest = {
  name: string;
  description?: string;
  active?: boolean;
  statuses: Array<Partial<CaseStatusDefinition>>;
  defaultStatusId?: string;
};

export type UpdateCaseTypeRequest = Partial<CreateCaseTypeRequest>;

export type CreateCaseEntryRequest = {
  title: string;
  text: string;
  visibility?: CaseVisibility;
  insertions?: unknown[];
  fileIds?: string[];
};

export type InviteCaseMemberRequest = {
  email: string;
  displayName?: string;
  rolePreset: CaseRolePreset;
  permissions?: CasePermission[];
};

export type UpdateCasePermissionsRequest = {
  permissions: CasePermission[];
};

export type PresignCaseFileRequest = {
  fileName: string;
  contentType: string;
  size?: number;
};

export type CaseFilePresignResponse = {
  status: 'success' | string;
  file: CaseFile;
  upload: {
    method: 'PUT';
    url: string;
    headers?: Record<string, string>;
    expiresIn?: number;
  };
};

export type CompleteCaseFileRequest = {
  fileId: string;
  etag?: string;
};

export type CaseFileVisibilityRequest = {
  externalVisibilityStatus: CaseExternalVisibilityStatus;
  visibility?: CaseVisibility;
};

export type CaseUnreadCountResponse = {
  status: 'success' | string;
  count: number;
};

export type CaseReadAllNotificationsResponse = {
  status: 'success' | string;
  updatedCount: number;
};

export type UpdateCaseNotificationPreferencesRequest = {
  email: Omit<CaseNotificationEmailPreferences, 'available'>;
  webPush: Omit<CaseNotificationWebPushPreferences, 'available'>;
};

export type RegisterCasePushSubscriptionRequest = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
};

export function caseStatusLabel(status: Pick<CaseStatusDefinition, 'id' | 'label' | 'name'>): string {
  return status.label || status.name || status.id;
}
