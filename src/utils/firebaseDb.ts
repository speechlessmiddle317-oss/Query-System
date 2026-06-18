import { db, auth } from "../lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  writeBatch 
} from "firebase/firestore";
import { Questionnaire, SurveyResponse, AuditLog, AppUser, PromotionApplication } from "../types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to check if database has seeded data
export async function isCollectionEmpty(collectionName: string): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, collectionName));
    return snap.empty;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collectionName);
  }
}

// === USERS COLLECTION ===
export async function saveUserToFirestore(username: string, userData: any): Promise<void> {
  if (!username) return;
  const lowercaseUsername = username.toLowerCase();
  const path = `users/${lowercaseUsername}`;
  try {
    await setDoc(doc(db, "users", lowercaseUsername), {
      ...userData,
      username: username // preserve capitalization if any
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveAllUsersToFirestore(usersMap: Record<string, any>): Promise<void> {
  try {
    const batch = writeBatch(db);
    Object.entries(usersMap).forEach(([rawUsername, userData]) => {
      const lowercaseUsername = rawUsername.toLowerCase();
      const userRef = doc(db, "users", lowercaseUsername);
      batch.set(userRef, {
        ...userData,
        username: rawUsername
      }, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "users");
  }
}

export async function fetchUsersFromFirestore(): Promise<Record<string, any>> {
  const usersMap: Record<string, any> = {};
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    querySnapshot.forEach((document) => {
      const data = document.data();
      const rawUsername = data.username || document.id;
      usersMap[rawUsername.toLowerCase()] = data;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, "users");
  }
  return usersMap;
}

// === QUESTIONNAIRES ===
export async function saveQuestionnaireToFirestore(q: Questionnaire): Promise<void> {
  if (!q.id) return;
  const path = `questionnaires/${q.id}`;
  try {
    await setDoc(doc(db, "questionnaires", q.id), q);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveAllQuestionnairesToFirestore(qs: Questionnaire[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    qs.forEach((q) => {
      if (!q.id) return;
      const ref = doc(db, "questionnaires", q.id);
      batch.set(ref, q);
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "questionnaires");
  }
}

export async function fetchQuestionnairesFromFirestore(): Promise<Questionnaire[]> {
  const list: Questionnaire[] = [];
  try {
    const snapshot = await getDocs(collection(db, "questionnaires"));
    snapshot.forEach((document) => {
      list.push(document.data() as Questionnaire);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, "questionnaires");
  }
  return list;
}

export async function deleteQuestionnaireFromFirestore(id: string): Promise<void> {
  const path = `questionnaires/${id}`;
  try {
    await deleteDoc(doc(db, "questionnaires", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// === RESPONSES ===
export async function saveResponseToFirestore(r: SurveyResponse): Promise<void> {
  if (!r.id) return;
  const path = `responses/${r.id}`;
  try {
    await setDoc(doc(db, "responses", r.id), r);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveAllResponsesToFirestore(rs: SurveyResponse[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    rs.forEach((r) => {
      if (!r.id) return;
      const ref = doc(db, "responses", r.id);
      batch.set(ref, r);
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "responses");
  }
}

export async function fetchResponsesFromFirestore(): Promise<SurveyResponse[]> {
  const list: SurveyResponse[] = [];
  try {
    const snapshot = await getDocs(collection(db, "responses"));
    snapshot.forEach((document) => {
      list.push(document.data() as SurveyResponse);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, "responses");
  }
  return list;
}

// === AUDIT LOGS ===
export async function saveAuditLogToFirestore(log: AuditLog): Promise<void> {
  if (!log.id) return;
  const path = `audit_logs/${log.id}`;
  try {
    await setDoc(doc(db, "audit_logs", log.id), log);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveAllAuditLogsToFirestore(logs: AuditLog[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    logs.forEach((log) => {
      if (!log.id) return;
      const ref = doc(db, "audit_logs", log.id);
      batch.set(ref, log);
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "audit_logs");
  }
}

export async function fetchAuditLogsFromFirestore(): Promise<AuditLog[]> {
  const list: AuditLog[] = [];
  try {
    const snapshot = await getDocs(collection(db, "audit_logs"));
    snapshot.forEach((document) => {
      list.push(document.data() as AuditLog);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, "audit_logs");
  }
  return list;
}

// === PROMOTIONS ===
export async function savePromotionToFirestore(promo: PromotionApplication): Promise<void> {
  if (!promo.id) return;
  const path = `promotions/${promo.id}`;
  try {
    await setDoc(doc(db, "promotions", promo.id), promo);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveAllPromotionsToFirestore(promos: PromotionApplication[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    promos.forEach((p) => {
      if (!p.id) return;
      const ref = doc(db, "promotions", p.id);
      batch.set(ref, p);
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "promotions");
  }
}

export async function fetchPromotionsFromFirestore(): Promise<PromotionApplication[]> {
  const list: PromotionApplication[] = [];
  try {
    const snapshot = await getDocs(collection(db, "promotions"));
    snapshot.forEach((document) => {
      list.push(document.data() as PromotionApplication);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, "promotions");
  }
  return list;
}

// === CHEAT REPORTS ===
export async function saveCheatReportToFirestore(report: any): Promise<void> {
  if (!report.id) return;
  const path = `cheat_reports/${report.id}`;
  try {
    await setDoc(doc(db, "cheat_reports", report.id), report);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveAllCheatReportsToFirestore(reports: any[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    reports.forEach((rep) => {
      if (!rep.id) return;
      const ref = doc(db, "cheat_reports", rep.id);
      batch.set(ref, rep);
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "cheat_reports");
  }
}

export async function fetchCheatReportsFromFirestore(): Promise<any[]> {
  const list: any[] = [];
  try {
    const snapshot = await getDocs(collection(db, "cheat_reports"));
    snapshot.forEach((document) => {
      list.push(document.data());
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, "cheat_reports");
  }
  return list;
}

// === QUOTA REQUESTS ===
export async function saveQuotaRequestToFirestore(req: any): Promise<void> {
  if (!req.id) return;
  const path = `quota_requests/${req.id}`;
  try {
    await setDoc(doc(db, "quota_requests", req.id), req);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveAllQuotaRequestsToFirestore(requests: any[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    requests.forEach((req) => {
      if (!req.id) return;
      const ref = doc(db, "quota_requests", req.id);
      batch.set(ref, req);
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "quota_requests");
  }
}

export async function fetchQuotaRequestsFromFirestore(): Promise<any[]> {
  const list: any[] = [];
  try {
    const snapshot = await getDocs(collection(db, "quota_requests"));
    snapshot.forEach((document) => {
      list.push(document.data());
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, "quota_requests");
  }
  return list;
}

// === TRIVIA QUESTIONS ===
export async function saveAllTriviaQuestionsToFirestore(questions: any[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    questions.forEach((q, i) => {
      const qId = q.id || `trivia-${i}`;
      const ref = doc(db, "trivia_questions", String(qId));
      batch.set(ref, { ...q, id: qId });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "trivia_questions");
  }
}

export async function fetchTriviaQuestionsFromFirestore(): Promise<any[]> {
  const list: any[] = [];
  try {
    const snapshot = await getDocs(collection(db, "trivia_questions"));
    snapshot.forEach((document) => {
      list.push(document.data());
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, "trivia_questions");
  }
  return list;
}
