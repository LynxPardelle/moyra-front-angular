import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { apiUrl, jsonAuthHeaders, storedToken } from './global';
import {
  CaseAuditEvent,
  CaseComment,
  CaseEntry,
  CaseFile,
  CaseFileVisibilityRequest,
  CaseItemResponse,
  CaseListResponse,
  CaseMembership,
  CaseNotification,
  CasePushSubscription,
  CaseRecord,
  CaseType,
  CreateCaseEntryRequest,
  InviteCaseMemberRequest,
  PresignCaseFileRequest,
  UpdateCasePermissionsRequest,
} from '../models/case';
import { AuthFacade } from '../store/auth/auth.facade';

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

  listCases(): Observable<CaseListResponse<CaseRecord>> {
    return this._http.get<CaseListResponse<CaseRecord>>(apiUrl('/cases'), {
      headers: this.authHeaders(),
    });
  }

  createCase(body: {
    title: string;
    reference?: string;
    description?: string;
    caseTypeId: string;
    statusId: string;
    leadUserId?: string;
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

  listEntries(caseId: string): Observable<CaseListResponse<CaseEntry>> {
    return this._http.get<CaseListResponse<CaseEntry>>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/entries`),
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
    body: { text: string; visibility?: string; parentCommentId?: string }
  ): Observable<CaseItemResponse<CaseComment>> {
    return this._http.post<CaseItemResponse<CaseComment>>(
      apiUrl(
        `/cases/${encodeURIComponent(caseId)}/entries/${encodeURIComponent(entryId)}/comments`
      ),
      body,
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
  ): Observable<{ status: string; file: CaseFile; upload: { method: 'PUT'; url: string } }> {
    return this._http.post<{ status: string; file: CaseFile; upload: { method: 'PUT'; url: string } }>(
      apiUrl(`/cases/${encodeURIComponent(caseId)}/files/presign`),
      body,
      { headers: this.authHeaders() }
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
      body,
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
    });
  }

  markNotificationRead(notificationId: string): Observable<CaseItemResponse<CaseNotification>> {
    return this._http.post<CaseItemResponse<CaseNotification>>(
      apiUrl(`/case-notifications/${encodeURIComponent(notificationId)}/read`),
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

  private authHeaders(): HttpHeaders {
    const token = this._authFacade?.token() || storedToken();
    return new HttpHeaders(jsonAuthHeaders(token));
  }
}

function cleanCaseEntryPayload(body: CreateCaseEntryRequest): CreateCaseEntryRequest {
  return Object.entries(body as Record<string, unknown>).reduce((payload, [key, value]) => {
    if (!FORBIDDEN_CASE_ENTRY_FIELDS.has(key)) {
      (payload as Record<string, unknown>)[key] = value;
    }
    return payload;
  }, {} as CreateCaseEntryRequest);
}
