export interface UserOrganisationRole {
  role?: string;
  updatedBy?: string;
  oldUpdatedDate?: string;
  createdBy?: string;
  scope?: unknown[];
  oldCreatedDate?: string;
  [key: string]: unknown;
}

export interface UserOrganisation {
  organisationId?: string;
  orgName?: string;
  roles?: (string | UserOrganisationRole)[];
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  userName?: string;
  phone?: string;
  email?: string;
  recoveryEmail?: string;
  roles?: string[];
  organisations?: UserOrganisation[];
  promptTnC?: boolean;
  tncLatestVersion?: string;
  tncLatestVersionUrl?: string;
  tncAcceptedVersion?: string;
  tncAcceptedOn?: string;
  managedBy?: string;
  [key: string]: unknown;
}
