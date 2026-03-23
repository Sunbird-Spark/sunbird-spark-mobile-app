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

import { networkService } from '../network/networkService';
import { enrolledCoursesDbService } from '../db/EnrolledCoursesDbService';

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
    });
});