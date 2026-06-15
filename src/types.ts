export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  OPERATOR = "OPERATOR",
  ANALYST = "ANALYST"
}

export type StarLevel = 1 | 2 | 3;

export interface AppUser {
  username: string;
  role: UserRole;
  starLevel?: StarLevel;
  assignedTables?: string[]; // Allowed questionnaire IDs
  passwordChangeApplied?: boolean;
}

export type QuestionType = "SINGLE_CHOICE" | "MULTI_CHOICE" | "SHORT_TEXT" | "PARAGRAPH" | "RATING";

export interface Question {
  id: string;
  title: string;
  type: QuestionType;
  options?: string[]; // for single/multi choice
  required: boolean;
  minRating?: number; // default 1
  maxRating?: number; // default 5
}

export interface QuerySystemConfig {
  id: string;
  name: string;
  passwordRequired: boolean;
  password?: string;
  editableQuestionIds: string[]; // which questions can be modified in this query system
  searchQuestionId?: string; // Selected question ID to search by, empty means default response reference code
}

export interface Questionnaire {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  isActive: boolean;
  startTime?: string; // YYYY-MM-DDTHH:mm
  endTime?: string; // YYYY-MM-DDTHH:mm
  passwordRequired: boolean;
  password?: string;
  querySystems: QuerySystemConfig[];
  emailNotificationEnabled: boolean;
  distributedToAdmins?: boolean;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  answers: Record<string, any>; // questionId -> value
  submittedAt: string;
  submittedBy?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  target: string;
  details: string;
}

export interface PromotionApplication {
  id: string;
  username: string;
  currentRole: UserRole;
  currentStar?: StarLevel;
  targetRole: UserRole;
  targetStar?: StarLevel;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}
