import { DatabaseService, databaseService } from './DatabaseService';
import { KeyValueDbService, KVKey, keyValueDbService } from './KeyValueDbService';

export type UserType = 'GUEST' | 'GOOGLE' | 'KEYCLOAK';

export interface UserDetails {
  displayName?: string;
  email?: string;
  imageUrl?: string;
  givenName?: string;
  familyName?: string;
  mobileNumber?: string;
  alternateEmail?: string;
  district?: string;
  state?: string;
  roles?: string[];
}

export interface User {
  id: string;
  details: UserDetails;
  user_type: UserType;
  created_on: number;
}

export class UserDbService {
  constructor(
    private db: DatabaseService,
    private kv: KeyValueDbService,
  ) {}

  async upsert(user: User): Promise<void> {
    await this.db.insert(
      'users',
      {
        id: user.id,
        details: JSON.stringify(user.details),
        user_type: user.user_type,
        created_on: user.created_on,
      },
      'REPLACE'
    );
  }

  async getById(id: string): Promise<User | null> {
    interface UserRow { id: string; details: UserDetails; user_type: string; created_on: number; }
    const rows = await this.db.select<UserRow>('users', {
      where: { eq: { id } },
    });
    return rows.length > 0 ? this.rowToUser(rows[0]) : null;
  }

  async getActive(): Promise<User | null> {
    const userId = await this.kv.get(KVKey.LAST_ACTIVE_USER_ID);
    if (!userId) return null;
    return this.getById(userId);
  }

  async updateDetails(id: string, patch: Partial<UserDetails>): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) return;
    const merged: UserDetails = { ...existing.details, ...patch };
    await this.db.update(
      'users',
      { details: JSON.stringify(merged) },
      { eq: { id } }
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.delete('users', { eq: { id } });
  }

  private rowToUser(row: { id: string; details: UserDetails; user_type: string; created_on: number }): User {
    let details: UserDetails = {};
    try {
      details = typeof row.details === 'string' ? JSON.parse(row.details as unknown as string) : row.details;
    } catch {
      details = {};
    }
    return {
      id: row.id,
      details,
      user_type: row.user_type as UserType,
      created_on: row.created_on,
    };
  }
}

export const userDbService = new UserDbService(databaseService, keyValueDbService);
