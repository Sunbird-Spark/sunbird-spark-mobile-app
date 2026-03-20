import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnrollmentService } from './EnrollmentService';
import { getClient } from '../../lib/http-client';

vi.mock('../../lib/http-client', () => ({
    getClient: vi.fn(),
}));

const mockEnrollmentResponse = {
    data: {
        id: 'api.user.enrollment.list',
        ver: 'v1',
        ts: '2026-03-20T10:00:00.000Z',
        params: {
            resmsgid: 'enrollment-msg-id',
            msgid: 'enrollment-msg-id',
            err: null,
            status: 'SUCCESS',
            errmsg: null,
        },
        responseCode: 'OK',
        result: {
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
    },
    status: 200,
    headers: {},
};

describe('EnrollmentService', () => {
    let enrollmentService: EnrollmentService;
    let mockHttpClient: any;

    beforeEach(() => {
        enrollmentService = new EnrollmentService();
        mockHttpClient = {
            get: vi.fn(),
        };
        (getClient as any).mockReturnValue(mockHttpClient);
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

            expect(result.data.result.courses).toHaveLength(1);
            expect(result.data.result.courses[0]).toHaveProperty('courseId');
            expect(result.data.result.courses[0]).toHaveProperty('batchId');
            expect(result.data.result.courses[0]).toHaveProperty('progress');
        });

        it('should handle empty enrollment results', async () => {
            const emptyResponse = {
                ...mockEnrollmentResponse,
                data: {
                    ...mockEnrollmentResponse.data,
                    result: { courses: [] },
                },
            };
            mockHttpClient.get.mockResolvedValue(emptyResponse);

            const result = await enrollmentService.getUserEnrollments('user_001');

            expect(result.data.result.courses).toHaveLength(0);
        });

        it('should handle API errors', async () => {
            mockHttpClient.get.mockRejectedValue(new Error('API Error'));

            await expect(enrollmentService.getUserEnrollments('user_001')).rejects.toThrow('API Error');
            expect(mockHttpClient.get).toHaveBeenCalled();
        });
    });
});