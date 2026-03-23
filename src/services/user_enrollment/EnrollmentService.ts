import { getClient, ApiResponse } from '../../lib/http-client';
import { buildOfflineResponse } from '../../lib/http-client/offlineResponse';
import type { CourseEnrollmentResponse, TrackableCollection } from '../../types/collectionTypes';
import { enrolledCoursesDbService } from '../db/EnrolledCoursesDbService';
import type { EnrolledCourse, EnrolledCourseDetails } from '../db/EnrolledCoursesDbService';
import { networkService } from '../network/networkService';

const ORG_DETAILS_FIELDS = ['orgName', 'email'] as const;
const LICENSE_DETAILS_FIELDS = ['name', 'description', 'url'] as const;
const ENROLLMENT_CONTENT_FIELDS = [
    'contentType',
    'topic',
    'name',
    'channel',
    'mimeType',
    'posterImage',
    'appIcon',
    'resourceType',
    'identifier',
    'pkgVersion',
    'trackable',
    'primaryCategory',
    'organisation',
    'board',
    'medium',
    'gradeLevel',
    'subject',
] as const;
const BATCH_DETAILS_FIELDS = [
    'name',
    'endDate',
    'startDate',
    'status',
    'enrollmentType',
    'createdBy',
    'certificates',
] as const;

export class EnrollmentService {
    public async getUserEnrollments(userId: string): Promise<ApiResponse<CourseEnrollmentResponse>> {
        if (!networkService.isConnected()) {
            return this.readEnrollmentsFromDb(userId);
        }

        try {
            const searchParams = new URLSearchParams({
                orgdetails: ORG_DETAILS_FIELDS.join(','),
                licenseDetails: LICENSE_DETAILS_FIELDS.join(','),
                fields: ENROLLMENT_CONTENT_FIELDS.join(','),
                batchDetails: BATCH_DETAILS_FIELDS.join(','),
            });
            const url = `/course/v1/user/enrollment/list/${userId}?${searchParams.toString()}`;
            const response = await getClient().get<CourseEnrollmentResponse>(url);

            try {
                const courses = response.data?.courses ?? [];
                if (courses.length > 0) {
                    const rows: EnrolledCourse[] = courses.map(c => this.mapToEnrolledCourse(c, userId));
                    await enrolledCoursesDbService.upsertBatch(rows);
                }
            } catch (err) {
                console.warn('[EnrollmentService] Failed to cache enrollments to SQLite:', err);
            }

            return response;
        } catch {
            return this.readEnrollmentsFromDb(userId);
        }
    }

    private async readEnrollmentsFromDb(userId: string): Promise<ApiResponse<CourseEnrollmentResponse>> {
        const rows = await enrolledCoursesDbService.getByUser(userId);
        const courses: TrackableCollection[] = rows.map(row => ({
            courseId: row.course_id,
            contentId: row.course_id,
            courseName: row.details.name,
            batchId: row.details.batchId ?? '',
            userId: row.user_id,
            completionPercentage: row.progress,
            progress: row.progress,
            leafNodesCount: row.details.leafNodesCount,
            status: row.status === 'completed' ? 2 : 1,
            enrolledDate: new Date(row.enrolled_on).toISOString(),
            batch: row.details.batchId ? {
                identifier: row.details.batchId,
                name: row.details.batchName,
                status: row.details.batchStatus != null ? Number(row.details.batchStatus) : undefined,
            } : undefined,
        }));
        return buildOfflineResponse<CourseEnrollmentResponse>({ courses });
    }

    private mapToEnrolledCourse(course: TrackableCollection, userId: string): EnrolledCourse {
        const courseId = course.courseId ?? course.contentId ?? course.collectionId ?? '';
        const details: EnrolledCourseDetails = {
            courseId,
            name: course.courseName ?? '',
            leafNodesCount: course.leafNodesCount,
            batchId: course.batchId,
            batchStatus: course.batch?.status != null ? String(course.batch.status) : undefined,
            batchName: course.batch?.name,
        };
        return {
            course_id: courseId,
            user_id: userId,
            details,
            enrolled_on: course.enrolledDate ? new Date(course.enrolledDate).getTime() : Date.now(),
            progress: course.completionPercentage ?? course.progress ?? 0,
            status: course.status === 2 ? 'completed' : 'active',
        };
    }
}
