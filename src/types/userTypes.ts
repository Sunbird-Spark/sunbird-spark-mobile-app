export interface UserProfile {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  promptTnC?: boolean;
  tncLatestVersion?: string;
  tncLatestVersionUrl?: string;
  tncAcceptedVersion?: string;
  tncAcceptedOn?: string;
  managedBy?: string;
  [key: string]: unknown;
}
