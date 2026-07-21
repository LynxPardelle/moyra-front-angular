import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';

import { apiUrl, jsonAuthHeaders, storedToken } from './global';
import {
  CaseAuditEvent,
  CaseComment,
  CaseEntry,
  CaseFile,
  CaseFilePresignResponse,
  CaseFileVisibilityRequest,
  CaseItemResponse,
  CaseListResponse,
  CaseMembership,
  CaseNotification,
  CaseNotificationPreferences,
  CaseOperationsSummary,
  CasePushSubscription,
  CaseReadAllNotificationsResponse,
  CaseRecord,
  CaseType,
  CaseUnreadCountResponse,
  CompleteCaseFileRequest,
  CreateCaseOneDriveLinkRequest,
  CreateCaseTypeRequest,
  CreateCaseEntryRequest,
  InitialAttorneyRequest,
  InviteCaseMemberRequest,
  PresignCaseFileRequest,
  RegisterCasePushSubscriptionRequest,
  UpdateCaseEntryRequest,
  UpdateCaseMemberRequest,
  UpdateCaseRequest,
  UpdateCaseTypeRequest,
  UpdateCaseFileRequest,
  UpdateCasePermissionsRequest,
  UpdateCaseNotificationPreferencesRequest,
} from '../models/case';
import { AuthFacade } from '../store/auth/auth.facade';
import { normalizeCaseVisibilityForApi } from '../utils/case-visibility';

const FORBIDDEN_CASE_ENTRY_FIELDS = new Set([
  'seoTitle',
  'seoDescription',
  'seoKeywords',
  'slug',
  'urltitle',
  'publicUrl',
  'canonicalUrl',
  'published',
]);

@Injectable({ providedIn: 'root' })
export class CaseService {
  private readonly _authFacade = inject(AuthFacade, { optional: true });

  constructor(private _http: HttpClient) {}

  listCaseTypes(): Observable<CaseListResponse<CaseType>> {
    return this._http.get<CaseListResponse<CaseType>>(apiUrl('/case-types'), {
      headers: this.authHeaders(),
    });
  }

  createCaseType(body: CreateCaseTypeRequest): Observable<CaseItemResponse<CaseType>> {
    return this._http.post<CaseItemResponse<CaseType>>(apiUrl('/case-types'), body, {
      headers: this.authHeaders(),
    });
  }

  updateCaseType(
    caseTypeId: string,
    body: UpdateCaseTypeRequest
  ): Observable<CaseItemResponse<CaseType>> {
    return this._http.put<CaseItemResponse<CaseType>>(
      apiUrl(`/case-types/${encodeURIComponent(caseTypeId)}`),
      body,
      { headers: this.authHeaders() }
    );
  }

  listCases(): Observable<CaseListResponse<CaseRecord>> {
    return this._http.get<CaseListResponse<CaseRecord>>(apiUrl('/cases'), {
      headers: this.authHeaders(),
    });
  }

  getOperationsSummary(): Observable<CaseItemResponse<CaseOperationsSummary>> {
    return this._http.get<CaseItemResponse<CaseOperationsSummary>>(
      apiUrl('/case-operations/summary'),
      { headers: this.authHeaders() }
    );
  }

  createCase(body: {
    title: string;
    reference?: string;
    description?: string;
    caseTypeId: string;
    statusId: string;
    leadUserId?: string;
    initialAttorney: InitialAttorneyRequest;
  }): Observable<CaseItemResponse<CaseRecord>> {
    return this._http.post<CaseItemResponse<CaseRecord>>(apiUrl('/cases'), body, {
      headers: this.authHeaders(),
    });
  }

  getCase(caseId: string): Observable<CaseItemResponse<CaseRecord>> {
    return this._http.get<CaseItemResponse<CaseRecord>>(apiUrl(`/cases/${encodeURIComponent(caseId)}`), {
      headers: this.authHeaders(),
    });
  }

  updateCaseStatus(
    caseId: string,
    body: { statusId: string }
  ): Observable<CaseItemResponse<CaseRecord>> {
    return this._http.put<CaseItemResponse<CaseRecord>>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/status`),
      body,
      { headers: this.authHeaders() }
    );
  }

  updateCase(
    caseId: string,
    body: UpdateCaseRequest
  ): Observable<CaseItemResponse<CaseRecord>> {
    return this._http.put<CaseItemResponse<CaseRecord>>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}`),
      body,
      { headers: this.authHeaders() }
    );
  }

  listMembers(caseId: string): Observable<CaseListResponse<CaseMembership>> {
    return this._http.get<CaseListResponse<CaseMembership>>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/members`),
      { headers: this.authHeaders() }
    );
  }

  inviteMember(
    caseId: string,
    body: InviteCaseMemberRequest
  ): Observable<CaseItemResponse<CaseMembership>> {
    return this._http.post<CaseItemResponse<CaseMembership>>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/invites`),
      body,
      { headers: this.authHeaders() }
    );
  }

  updateMemberPermissions(
    caseId: string,
    membershipId: string,
    body: UpdateCasePermissionsRequest
  ): Observable<CaseItemResponse<CaseMembership>> {
    return this._http.put<CaseItemResponse<CaseMembership>>(
      apiUrl(
        `/cases/${encodeURIComponent(caseId)}/members/${encodeURIComponent(
          membershipId
        )}/permissions`
      ),
      body,
      { headers: this.authHeaders() }
    );
  }

  updateMember(
    caseId: string,
    membershipId: string,
    body: UpdateCaseMemberRequest
  ): Observable<CaseItemResponse<CaseMembership>> {
    return this._http.put<CaseItemResponse<CaseMembership>>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/members/${encodeURIComponent(membershipId)}`),
      body,
      { headers: this.authHeaders() }
    );
  }

  removeMember(
    caseId: string,
    membershipId: string
  ): Observable<CaseItemResponse<CaseMembership>> {
    return this._http.delete<CaseItemResponse<CaseMembership>>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/members/${encodeURIComponent(membershipId)}`),
      { headers: this.authHeaders() }
    );
  }

  listEntries(caseId: string): Observable<CaseListResponse<CaseEntry>> {
    return this._http.get<CaseListResponse<CaseEntry>>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/entries`),
      { headers: this.authHeaders() }
    );
  }

  getEntry(caseId: string, entryId: string): Observable<CaseItemResponse<CaseEntry>> {
    return this._http.get<CaseItemResponse<CaseEntry>>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/entries/${encodeURIComponent(entryId)}`),
      { headers: this.authHeaders() }
    );
  }

  createEntry(
    caseId: string,
    body: CreateCaseEntryRequest
  ): Observable<CaseItemResponse<CaseEntry>> {
    return this._http.post<CaseItemResponse<CaseEntry>>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/entries`),
      cleanCaseEntryPayload(body),
      { headers: this.authHeaders() }
    );
  }

  updateEntry(
    caseId: string,
    entryId: string,
    body: UpdateCaseEntryRequest
  ): Observable<CaseItemResponse<CaseEntry>> {
    return this._http.put<CaseItemResponse<CaseEntry>>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/entries/${encodeURIComponent(entryId)}`),
      cleanCaseEntryPayload(body),
      { headers: this.authHeaders() }
    );
  }

  listComments(caseId: string, entryId: string): Observable<CaseListResponse<CaseComment>> {
    return this._http.get<CaseListResponse<CaseComment>>(
      apiUrl(
        `/cases/${encodeURIComponent(caseId)}/entries/${encodeURIComponent(entryId)}/comments`
      ),
      { headers: this.authHeaders() }
    );
  }

  createComment(
    caseId: string,
    entryId: string,
    body: { text: string; visibility?: any; parentCommentId?: string }
  ): Observable<CaseItemResponse<CaseComment>> {
    return this._http.post<CaseItemResponse<CaseComment>>(
      apiUrl(
        `/cases/${encodeURIComponent(caseId)}/entries/${encodeURIComponent(entryId)}/comments`
      ),
      normalizeVisibilityPayload(body),
      { headers: this.authHeaders() }
    );
  }

  listFiles(caseId: string): Observable<CaseListResponse<CaseFile>> {
    return this._http.get<CaseListResponse<CaseFile>>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/files`),
      { headers: this.authHeaders() }
    );
  }

  presignCaseFile(
    caseId: string,
    body: PresignCaseFileRequest
  ): Observable<CaseFilePresignResponse> {
    return this._http.post<CaseFilePresignResponse>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/files/presign`),
      body,
      { headers: this.authHeaders() }
    );
  }

  completeCaseFile(
    caseId: string,
    body: CompleteCaseFileRequest
  ): Observable<CaseItemResponse<CaseFile>> {
    return this._http.post<CaseItemResponse<CaseFile>>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/files/complete`),
      body,
      { headers: this.authHeaders() }
    );
  }

  createOneDriveLink(
    caseId: string,
    body: CreateCaseOneDriveLinkRequest
  ): Observable<CaseItemResponse<CaseFile>> {
    return this._http.post<CaseItemResponse<CaseFile>>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/files/onedrive-link`),
      normalizeVisibilityPayload(body),
      { headers: this.authHeaders() }
    );
  }

  uploadCaseFile(
    caseId: string,
    entryId: string,
    file: File
  ): Observable<CaseItemResponse<CaseFile>> {
    return this.presignCaseFile(caseId, {
      entryId,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
    }).pipe(
      switchMap((presign) =>
        this._http
          .put(presign.upload.url, file, {
            headers: new HttpHeaders(presign.upload.headers || {}),
            responseType: 'text',
          })
          .pipe(
            switchMap(() =>
              this.completeCaseFile(caseId, {
                fileId: presign.file.id,
              })
            )
          )
      )
    );
  }

  updateFileVisibility(
    caseId: string,
    fileId: string,
    body: CaseFileVisibilityRequest
  ): Observable<CaseItemResponse<CaseFile>> {
    return this._http.put<CaseItemResponse<CaseFile>>(
      apiUrl(
        `/cases/${encodeURIComponent(caseId)}/files/${encodeURIComponent(fileId)}/visibility`
      ),
      normalizeVisibilityPayload(body),
      { headers: this.authHeaders() }
    );
  }

  deleteFile(caseId: string, fileId: string): Observable<CaseItemResponse<CaseFile>> {
    return this._http.delete<CaseItemResponse<CaseFile>>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/files/${encodeURIComponent(fileId)}`),
      { headers: this.authHeaders() }
    );
  }

  updateFile(
    caseId: string,
    fileId: string,
    body: UpdateCaseFileRequest
  ): Observable<CaseItemResponse<CaseFile>> {
    return this._http.put<CaseItemResponse<CaseFile>>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/files/${encodeURIComponent(fileId)}`),
      normalizeVisibilityPayload(body),
      { headers: this.authHeaders() }
    );
  }

  listAuditEvents(caseId: string): Observable<CaseListResponse<CaseAuditEvent>> {
    return this._http.get<CaseListResponse<CaseAuditEvent>>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/audit-events`),
      { headers: this.authHeaders() }
    );
  }

  listNotifications(): Observable<CaseListResponse<CaseNotification>> {
    return this._http.get<CaseListResponse<CaseNotification>>(apiUrl('/case-notifications'), {
      headers: this.authHeaders(),
    }).pipe(switchMap((response) => this.filterVisibleNotifications(response)));
  }

  markNotificationRead(notificationId: string): Observable<CaseItemResponse<CaseNotification>> {
    return this._http.post<CaseItemResponse<CaseNotification>>(
      apiUrl(`/case-notifications/${encodeURIComponent(notificationId)}/read`),
      {},
      { headers: this.authHeaders() }
    );
  }

  markNotificationUnread(notificationId: string): Observable<CaseItemResponse<CaseNotification>> {
    return this._http.post<CaseItemResponse<CaseNotification>>(
      apiUrl(`/case-notifications/${encodeURIComponent(notificationId)}/unread`),
      {},
      { headers: this.authHeaders() }
    );
  }

  getUnreadNotificationCount(): Observable<CaseUnreadCountResponse> {
    return this.listNotifications().pipe(
      map((response) => ({
        status: response.status,
        count: (response.items || []).filter((notification) => !notification.readAt).length,
      }))
    );
  }

  markAllNotificationsRead(): Observable<CaseReadAllNotificationsResponse> {
    return this._http.post<CaseReadAllNotificationsResponse>(
      apiUrl('/case-notifications/read-all'),
      {},
      { headers: this.authHeaders() }
    );
  }

  listPushSubscriptions(): Observable<CaseListResponse<CasePushSubscription>> {
    return this._http.get<CaseListResponse<CasePushSubscription>>(
      apiUrl('/case-push-subscriptions'),
      { headers: this.authHeaders() }
    );
  }

  getNotificationPreferences(): Observable<CaseItemResponse<CaseNotificationPreferences>> {
    return this._http.get<CaseItemResponse<CaseNotificationPreferences>>(
      apiUrl('/case-notification-preferences'),
      { headers: this.authHeaders() }
    );
  }

  updateNotificationPreferences(
    body: UpdateCaseNotificationPreferencesRequest
  ): Observable<CaseItemResponse<CaseNotificationPreferences>> {
    return this._http.put<CaseItemResponse<CaseNotificationPreferences>>(
      apiUrl('/case-notification-preferences'),
      body,
      { headers: this.authHeaders() }
    );
  }

  registerPushSubscription(
    body: RegisterCasePushSubscriptionRequest
  ): Observable<CaseItemResponse<CasePushSubscription>> {
    return this._http.post<CaseItemResponse<CasePushSubscription>>(
      apiUrl('/case-push-subscriptions'),
      body,
      { headers: this.authHeaders() }
    );
  }

  deletePushSubscription(subscriptionId: string): Observable<CaseItemResponse<CasePushSubscription>> {
    return this._http.delete<CaseItemResponse<CasePushSubscription>>(
      apiUrl(`/case-push-subscriptions/${encodeURIComponent(subscriptionId)}`),
      { headers: this.authHeaders() }
    );
  }

  private authHeaders(): HttpHeaders {
    const token = this._authFacade?.token() || storedToken();
    return new HttpHeaders(jsonAuthHeaders(token));
  }

  private filterVisibleNotifications(
    response: CaseListResponse<CaseNotification>
  ): Observable<CaseListResponse<CaseNotification>> {
    const notifications = response.items || [];
    if (
      this._authFacade?.isAdmin?.() ||
      notifications.every((item) => !this.isCommentNotification(item))
    ) {
      return of(response);
    }

    const caseIds = Array.from(
      new Set(
        notifications
          .filter((item) => this.isCommentNotification(item))
          .map((item) => item.caseId)
          .filter(Boolean)
      )
    );

    return forkJoin(
      caseIds.map((caseId) =>
        this.listMembers(caseId).pipe(
          map((members) => [caseId, members.items || []] as const),
          catchError(() => of([caseId, [] as CaseMembership[]] as const))
        )
      )
    ).pipe(
      map((membersByCaseEntries) => {
        const membersByCase = new Map(membersByCaseEntries);
        return {
          ...response,
          items: notifications.filter(
            (notification) =>
              !this.isCommentNotification(notification) ||
              this.canSeeCommentNotifications(membersByCase.get(notification.caseId) || [])
          ),
        };
      })
    );
  }

  private isCommentNotification(notification: CaseNotification): boolean {
    return notification.targetType === 'case-comment' || notification.eventType.includes('comment');
  }

  private canSeeCommentNotifications(members: CaseMembership[]): boolean {
    const membership = this.currentMembership(members);
    return Boolean(
      membership &&
        (membership.permissions?.includes('case.comment') ||
          membership.rolePreset === 'attorney' ||
          membership.rolePreset === 'pasante')
    );
  }

  private currentMembership(members: CaseMembership[]): CaseMembership | undefined {
    const identity = this._authFacade?.identity?.();
    const userId = identity?.id || identity?.sub || identity?.userId;
    const email = identity?.email;
    return members.find(
      (member) =>
        (userId && member.userId === userId) || (email && member.email === email)
    );
  }
}

function cleanCaseEntryPayload<T extends Partial<CreateCaseEntryRequest>>(body: T): T {
  const payload = Object.entries(body as Record<string, unknown>).reduce((payload, [key, value]) => {
    if (!FORBIDDEN_CASE_ENTRY_FIELDS.has(key)) {
      (payload as Record<string, unknown>)[key] = value;
    }
    return payload;
  }, {} as T);
  return normalizeVisibilityPayload(payload);
}

function normalizeVisibilityPayload<T extends { visibility?: any }>(body: T): T {
  if (!body.visibility) {
    return body;
  }

  return {
    ...body,
    visibility: normalizeCaseVisibilityForApi(body.visibility),
  };
}
