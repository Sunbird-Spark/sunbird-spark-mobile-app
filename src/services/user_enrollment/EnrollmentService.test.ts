import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnrollmentService } from './EnrollmentService';
import { getClient } from '../../lib/http-client';

vi.mock('../../lib/http-client', () => ({
    getClient: vi.fn(),
}));

vi.mock('../db/EnrolledCoursesDbService', () => ({
    enrolledCoursesDbService: {
        upsertBatch: vi.fn().mockResolvedValue(undefined),
        getByUser: vi.fn().mockResolvedValue([]),
    },
}));

vi.mock('../network/networkService', () => ({
    networkService: { isConnected: vi.fn().mockReturnValue(true), subscribe: vi.fn() },
}));

vi.mock('../course/ContentStateSyncService', () => ({
    contentStateSyncService: {
        getLocalCompletionPercentage: vi.fn().mockResolvedValue(null),
    },
}));

import { networkService } from '../network/networkService';
import { enrolledCoursesDbService } from '../db/EnrolledCoursesDbService';
import { contentStateSyncService } from '../course/ContentStateSyncService';

const mockEnrollmentResponse = {
    data: {
        courses: [
            {
                courseId: 'do_course_001',
                batchId: 'batch_001',
                userId: 'user_001',
                contentId: 'do_course_001',
                courseName: 'Sample Course',
                status: 1,
                progress: 50,
                enrolledDate: '2026-01-15',
            },
        ],
    },
    status: 200,
    headers: {},
};

describe('EnrollmentService', () => {
    let enrollmentService: EnrollmentService;
    let mockHttpClient: any;

    beforeEach(() => {
        vi.clearAllMocks();
        enrollmentService = new EnrollmentService();
        mockHttpClient = {
            get: vi.fn(),
        };
        (getClient as any).mockReturnValue(mockHttpClient);
        (networkService.isConnected as any).mockReturnValue(true);
        (enrolledCoursesDbService.upsertBatch as any).mockResolvedValue(undefined);
        (enrolledCoursesDbService.getByUser as any).mockResolvedValue([]);
        (contentStateSyncService.getLocalCompletionPercentage as any).mockResolvedValue(null);
    });

    describe('getUserEnrollments', () => {
        it('should fetch user enrollments with correct URL and query params', async () => {
            // Arrange
            const userId = 'user_001';
            mockHttpClient.get.mockResolvedValue(mockEnrollmentResponse);

            // Act
            const result = await enrollmentService.getUserEnrollments(userId);

            // Assert
            const calledUrl = mockHttpClient.get.mock.calls[0][0] as string;
            expect(calledUrl).toContain(`/course/v1/user/enrollment/list/${userId}`);
            expect(result).toEqual(mockEnrollmentResponse);
        });

        it('should include orgdetails query param', async () => {
            mockHttpClient.get.mockResolvedValue(mockEnrollmentResponse);

            await enrollmentService.getUserEnrollments('user_001');

            const calledUrl = mockHttpClient.get.mock.calls[0][0] as string;
            expect(calledUrl).toContain('orgdetails=orgName%2Cemail');
        });

        it('should include licenseDetails query param', async () => {
            mockHttpClient.get.mockResolvedValue(mockEnrollmentResponse);

            await enrollmentService.getUserEnrollments('user_001');

            const calledUrl = mockHttpClient.get.mock.calls[0][0] as string;
            expect(calledUrl).toContain('licenseDetails=name%2Cdescription%2Curl');
        });

        it('should include fields query param with all enrollment content fields', async () => {
            mockHttpClient.get.mockResolvedValue(mockEnrollmentResponse);

            await enrollmentService.getUserEnrollments('user_001');

            const calledUrl = mockHttpClient.get.mock.calls[0][0] as string;
            const url = new URL(`http://localhost${calledUrl}`);
            const fields = url.searchParams.get('fields')!.split(',');
            expect(fields).toEqual([
                'contentType', 'topic', 'name', 'channel', 'mimeType',
                'posterImage', 'appIcon', 'resourceType', 'identifier',
                'pkgVersion', 'trackable', 'primaryCategory', 'organisation',
                'board', 'medium', 'gradeLevel', 'subject',
            ]);
        });

        it('should include batchDetails query param', async () => {
            mockHttpClient.get.mockResolvedValue(mockEnrollmentResponse);

            await enrollmentService.getUserEnrollments('user_001');

            const calledUrl = mockHttpClient.get.mock.calls[0][0] as string;
            const url = new URL(`http://localhost${calledUrl}`);
            const batchDetails = url.searchParams.get('batchDetails')!.split(',');
            expect(batchDetails).toEqual([
                'name', 'endDate', 'startDate', 'status',
                'enrollmentType', 'createdBy', 'certificates',
            ]);
        });

        it('should return enrollment data with correct structure', async () => {
            mockHttpClient.get.mockResolvedValue(mockEnrollmentResponse);

            const result = await enrollmentService.getUserEnrollments('user_001');

            expect(result.data.courses).toHaveLength(1);
            expect(result.data.courses[0]).toHaveProperty('courseId');
            expect(result.data.courses[0]).toHaveProperty('batchId');
            expect(result.data.courses[0]).toHaveProperty('progress');
        });

        it('should handle empty enrollment results', async () => {
            const emptyResponse = {
                ...mockEnrollmentResponse,
                data: { courses: [] },
            };
            mockHttpClient.get.mockResolvedValue(emptyResponse);

            const result = await enrollmentService.getUserEnrollments('user_001');

            expect(result.data.courses).toHaveLength(0);
        });

        it('should handle API errors', async () => {
            mockHttpClient.get.mockRejectedValue(new Error('API Error'));

            const result = await enrollmentService.getUserEnrollments('user_001');
            expect(result).toMatchObject({ data: { courses: [] }, status: 200 });
            expect(mockHttpClient.get).toHaveBeenCalled();
        });

        it('should persist enrollments to DB after successful fetch', async () => {
            mockHttpClient.get.mockResolvedValue(mockEnrollmentResponse);

            await enrollmentService.getUserEnrollments('user_001');

            // status=1, progress=50 → 'active'
            expect(enrolledCoursesDbService.upsertBatch).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        course_id: 'do_course_001',
                        user_id: 'user_001',
                        status: 'active',
                    }),
                ])
            );
        });

        it('should save status as active when status=1 and progress=0', async () => {
            const zeroProgressResponse = {
                ...mockEnrollmentResponse,
                data: {
                    courses: [{
                        ...mockEnrollmentResponse.data.courses[0],
                        status: 1,
                        progress: 0,
                        completionPercentage: 0,
                    }],
                },
            };
            mockHttpClient.get.mockResolvedValue(zeroProgressResponse);

            await enrollmentService.getUserEnrollments('user_001');

            expect(enrolledCoursesDbService.upsertBatch).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ status: 'active' }),
                ])
            );
        });

        it('should save status as not-started when status=0 (never started)', async () => {
            const notStartedResponse = {
                ...mockEnrollmentResponse,
                data: {
                    courses: [{
                        ...mockEnrollmentResponse.data.courses[0],
                        status: 0,
                        progress: 0,
                        completionPercentage: 0,
                    }],
                },
            };
            mockHttpClient.get.mockResolvedValue(notStartedResponse);

            await enrollmentService.getUserEnrollments('user_001');

            expect(enrolledCoursesDbService.upsertBatch).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ status: 'not-started' }),
                ])
            );
        });

        it('should save status as active when progress > 0 and < 100', async () => {
            mockHttpClient.get.mockResolvedValue(mockEnrollmentResponse); // progress=50

            await enrollmentService.getUserEnrollments('user_001');

            expect(enrolledCoursesDbService.upsertBatch).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ status: 'active' }),
                ])
            );
        });

        it('should not call upsertBatch when course list is empty', async () => {
            const emptyResponse = {
                ...mockEnrollmentResponse,
                data: { courses: [] },
            };
            mockHttpClient.get.mockResolvedValue(emptyResponse);

            await enrollmentService.getUserEnrollments('user_001');

            expect(enrolledCoursesDbService.upsertBatch).not.toHaveBeenCalled();
        });

        it('should return DB enrollments when offline', async () => {
            (networkService.isConnected as any).mockReturnValue(false);
            (enrolledCoursesDbService.getByUser as any).mockResolvedValue([{
                course_id: 'do_course_001',
                user_id: 'user_001',
                details: { courseId: 'do_course_001', name: 'Sample Course', batchId: 'batch_001', batchName: 'Batch 1', batchStatus: '1' },
                enrolled_on: Date.now(),
                progress: 50,
                status: 'active',
            }]);

            const result = await enrollmentService.getUserEnrollments('user_001');

            expect(mockHttpClient.get).not.toHaveBeenCalled();
            expect(result.data.courses).toHaveLength(1);
            expect(result.data.courses[0].courseId).toBe('do_course_001');
            expect(result.data.courses[0].completionPercentage).toBe(50);
        });

        it('should return empty courses array when offline and DB is empty', async () => {
            (networkService.isConnected as any).mockReturnValue(false);
            (enrolledCoursesDbService.getByUser as any).mockResolvedValue([]);

            const result = await enrollmentService.getUserEnrollments('user_001');

            expect(result.data.courses).toEqual([]);
            expect(result.status).toBe(200);
        });

        it('should map not-started course to status 0 from DB', async () => {
            (networkService.isConnected as any).mockReturnValue(false);
            (enrolledCoursesDbService.getByUser as any).mockResolvedValue([{
                course_id: 'do_course_001',
                user_id: 'user_001',
                details: { courseId: 'do_course_001', name: 'New Course' },
                enrolled_on: Date.now(),
                progress: 0,
                status: 'not-started',
            }]);

            const result = await enrollmentService.getUserEnrollments('user_001');

            expect(result.data.courses[0].status).toBe(0);
        });

        it('should map completed course (status 2) correctly from DB', async () => {
            (networkService.isConnected as any).mockReturnValue(false);
            (enrolledCoursesDbService.getByUser as any).mockResolvedValue([{
                course_id: 'do_course_001',
                user_id: 'user_001',
                details: { courseId: 'do_course_001', name: 'Done Course', leafNodesCount: 5 },
                enrolled_on: Date.now(),
                progress: 100,
                status: 'completed',
            }]);

            const result = await enrollmentService.getUserEnrollments('user_001');

            expect(result.data.courses[0].status).toBe(2);
        });

        it('should enrich completionPercentage from local content state cache when available', async () => {
            (contentStateSyncService.getLocalCompletionPercentage as any).mockResolvedValue(75);
            const courses: any[] = [{ courseId: 'do_course_001', batchId: 'batch_001', completionPercentage: 50, progress: 50 }];

            const result = await enrollmentService.enrichWithLocalProgress(courses, 'user_001');

            expect(result[0].completionPercentage).toBe(75);
            expect(result[0].progress).toBe(75);
        });

        it('should keep server completionPercentage when no local cache exists', async () => {
            (contentStateSyncService.getLocalCompletionPercentage as any).mockResolvedValue(null);
            const courses: any[] = [{ courseId: 'do_course_001', batchId: 'batch_001', completionPercentage: 50, progress: 50 }];

            const result = await enrollmentService.enrichWithLocalProgress(courses, 'user_001');

            // Server value (50) preserved when local cache returns null
            expect(result[0].completionPercentage).toBe(50);
        });

        it('should enrich offline DB courses with local content state progress', async () => {
            (contentStateSyncService.getLocalCompletionPercentage as any).mockResolvedValue(60);
            const courses: any[] = [{ courseId: 'do_course_001', batchId: 'batch_001', completionPercentage: 30, progress: 30 }];

            const result = await enrollmentService.enrichWithLocalProgress(courses, 'user_001');

            expect(result[0].completionPercentage).toBe(60);
        });

        it('should skip enrichment when batchId is missing', async () => {
            (contentStateSyncService.getLocalCompletionPercentage as any).mockResolvedValue(80);
            const courses: any[] = [{ courseId: 'do_course_001', batchId: '', completionPercentage: 40, progress: 40 }];

            const result = await enrollmentService.enrichWithLocalProgress(courses, 'user_001');

            // batchId empty → guard returns course unchanged
            expect(result[0].completionPercentage).toBe(40);
            expect(contentStateSyncService.getLocalCompletionPercentage).not.toHaveBeenCalled();
        });

        it('should not call upsertBatch when SQLite write fails silently', async () => {
            mockHttpClient.get.mockResolvedValue(mockEnrollmentResponse);
            (enrolledCoursesDbService.upsertBatch as any).mockRejectedValue(new Error('SQLite locked'));

            const result = await enrollmentService.getUserEnrollments('user_001');

            // Should still return the API response even if SQLite write fails
            expect(result.data.courses).toHaveLength(1);
        });

        it('should map batch details from DB row into the course object', async () => {
            (networkService.isConnected as any).mockReturnValue(false);
            (enrolledCoursesDbService.getByUser as any).mockResolvedValue([{
                course_id: 'do_course_001',
                user_id: 'user_001',
                details: {
                    courseId: 'do_course_001',
                    name: 'Course',
                    batchId: 'batch_001',
                    batchName: 'Batch 1',
                    batchStatus: '1',
                },
                enrolled_on: Date.now(),
                progress: 0,
                status: 'active',
            }]);

            const result = await enrollmentService.getUserEnrollments('user_001');

            const course = result.data.courses[0];
            expect(course.batch).toMatchObject({ identifier: 'batch_001', name: 'Batch 1', status: 1 });
        });

        it('should skip enrichment when courseId is missing', async () => {
            const courses: any[] = [{ batchId: 'b1', completionPercentage: 10 }];
            const result = await enrollmentService.enrichWithLocalProgress(courses, 'u1');
            expect(result[0].completionPercentage).toBe(10);
        });

        it('should handle errors in getLocalCompletionPercentage gracefully', async () => {
            (contentStateSyncService.getLocalCompletionPercentage as any).mockRejectedValue(new Error('DB Error'));
            const courses: any[] = [{ courseId: 'c1', batchId: 'b1', completionPercentage: 10 }];
            const result = await enrollmentService.enrichWithLocalProgress(courses, 'u1');
            expect(result[0].completionPercentage).toBe(10);
        });
    });
});