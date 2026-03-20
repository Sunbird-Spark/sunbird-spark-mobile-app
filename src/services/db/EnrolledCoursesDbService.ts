import { DatabaseService, databaseService } from './DatabaseService';

export type CourseStatus = 'active' | 'completed' | 'dropped';

export interface EnrolledCourseDetails {
  courseId: string;
  name: string;
  description?: string;
  appIcon?: string;
  leafNodesCount?: number;
  batchId?: string;
  batchStatus?: string;
  batchName?: string;
  enrollmentEndDate?: string;
  certTemplates?: object;
  hashTagId?: string;
  createdBy?: string;
}

export interface EnrolledCourse {
  course_id: string;
  user_id: string;
  details: EnrolledCourseDetails;
  enrolled_on: number;
  progress: number;
  status: CourseStatus;
}

export class EnrolledCoursesDbService {
  constructor(private db: DatabaseService) {}

  async upsertBatch(courses: EnrolledCourse[]): Promise<void> {
    if (courses.length === 0) return;
    await this.db.transaction(async () => {
      for (const course of courses) {
        await this.db.insert(
          'enrolled_courses',
          {
            course_id: course.course_id,
            user_id: course.user_id,
            details: JSON.stringify(course.details),
            enrolled_on: course.enrolled_on,
            progress: course.progress,
            status: course.status,
          },
          'REPLACE'
        );
      }
    });
  }

  async getByUser(userId: string): Promise<EnrolledCourse[]> {
    const rows = await this.db.select<any>('enrolled_courses', {
      where: { eq: { user_id: userId } },
      orderBy: [{ column: 'enrolled_on', direction: 'DESC' }],
    });
    return rows.map(row => this.rowToCourse(row));
  }

  async getByStatus(userId: string, status: CourseStatus): Promise<EnrolledCourse[]> {
    const rows = await this.db.select<any>('enrolled_courses', {
      where: { eq: { user_id: userId, status } },
      orderBy: [{ column: 'enrolled_on', direction: 'DESC' }],
    });
    return rows.map(row => this.rowToCourse(row));
  }

  async updateProgress(
    courseId: string,
    userId: string,
    progress: number,
    status: CourseStatus
  ): Promise<void> {
    await this.db.update(
      'enrolled_courses',
      { progress, status },
      { eq: { course_id: courseId, user_id: userId } }
    );
  }

  async delete(courseId: string, userId: string): Promise<void> {
    await this.db.delete('enrolled_courses', {
      eq: { course_id: courseId, user_id: userId },
    });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.db.delete('enrolled_courses', { eq: { user_id: userId } });
  }

  private rowToCourse(row: any): EnrolledCourse {
    let details: EnrolledCourseDetails = { courseId: row.course_id, name: '' };
    try {
      details = JSON.parse(row.details);
    } catch {
      details = { courseId: row.course_id, name: '' };
    }
    return {
      course_id: row.course_id,
      user_id: row.user_id,
      details,
      enrolled_on: row.enrolled_on,
      progress: row.progress,
      status: row.status as CourseStatus,
    };
  }
}

export const enrolledCoursesDbService = new EnrolledCoursesDbService(databaseService);
