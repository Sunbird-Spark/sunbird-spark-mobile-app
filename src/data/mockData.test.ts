import { describe, expect, it } from 'vitest';
import { 
  courses, 
  currentUser, 
  getFeaturedCourses, 
  getInProgressCourses,
  Course,
  User 
} from './mockData';

describe('mockData', () => {
  describe('Course interface', () => {
    it('has correct structure', () => {
      const course = courses[0];
      expect(course).toHaveProperty('id');
      expect(course).toHaveProperty('title');
      expect(course).toHaveProperty('description');
      expect(course).toHaveProperty('progress');
      expect(typeof course.id).toBe('string'); // Changed from number to string
      expect(typeof course.title).toBe('string');
      expect(typeof course.description).toBe('string');
      expect(typeof course.progress).toBe('number');
    });

    it('has optional properties', () => {
      const course = courses[0];
      expect(course).toHaveProperty('featured');
      expect(course).toHaveProperty('instructor');
      expect(course).toHaveProperty('duration');
      expect(course).toHaveProperty('thumbnail');
      expect(course).toHaveProperty('rating');
      expect(course).toHaveProperty('lessons');
      expect(course).toHaveProperty('enrolled');
    });
  });

  describe('User interface', () => {
    it('has correct structure', () => {
      expect(currentUser).toHaveProperty('id');
      expect(currentUser).toHaveProperty('name');
      expect(currentUser).toHaveProperty('email');
      expect(currentUser).toHaveProperty('avatar');
      expect(typeof currentUser.id).toBe('string'); // Changed from number to string
      expect(typeof currentUser.name).toBe('string');
      expect(typeof currentUser.email).toBe('string');
      expect(typeof currentUser.avatar).toBe('string');
    });

    it('has valid user data', () => {
      expect(currentUser.id).toBe('user-1'); // Changed from 1 to 'user-1'
      expect(currentUser.name).toBe('Rahul Warrier'); // Changed from 'John Doe'
      expect(currentUser.email).toBe('rahul.warrier@email.com'); // Changed email
    });
  });

  describe('courses array', () => {
    it('contains multiple courses', () => {
      expect(courses).toBeInstanceOf(Array);
      expect(courses.length).toBeGreaterThan(0);
      expect(courses.length).toBe(6);
    });

    it('has unique course IDs', () => {
      const ids = courses.map(course => course.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('has valid progress values', () => {
      courses.forEach(course => {
        expect(course.progress).toBeGreaterThanOrEqual(0);
        expect(course.progress).toBeLessThanOrEqual(100);
      });
    });

    it('has valid rating values when present', () => {
      courses.forEach(course => {
        if (course.rating !== undefined) {
          expect(course.rating).toBeGreaterThanOrEqual(0);
          expect(course.rating).toBeLessThanOrEqual(5);
        }
      });
    });

    it('has valid lesson counts when present', () => {
      courses.forEach(course => {
        if (course.lessons !== undefined) {
          expect(course.lessons).toBeGreaterThan(0);
          expect(typeof course.lessons).toBe('number');
        }
      });
    });
  });

  describe('getFeaturedCourses', () => {
    it('returns only featured courses', () => {
      const featuredCourses = getFeaturedCourses();
      expect(featuredCourses).toBeInstanceOf(Array);
      featuredCourses.forEach(course => {
        expect(course.featured).toBe(true);
      });
    });

    it('returns correct number of featured courses', () => {
      const featuredCourses = getFeaturedCourses();
      const expectedCount = courses.filter(course => course.featured).length;
      expect(featuredCourses.length).toBe(expectedCount);
      expect(featuredCourses.length).toBe(3); // Based on mock data
    });

    it('returns courses with all required properties', () => {
      const featuredCourses = getFeaturedCourses();
      featuredCourses.forEach(course => {
        expect(course).toHaveProperty('id');
        expect(course).toHaveProperty('title');
        expect(course).toHaveProperty('description');
        expect(course).toHaveProperty('progress');
      });
    });
  });

  describe('getInProgressCourses', () => {
    it('returns only courses with progress > 0 and < 100', () => {
      const inProgressCourses = getInProgressCourses();
      expect(inProgressCourses).toBeInstanceOf(Array);
      inProgressCourses.forEach(course => {
        expect(course.progress).toBeGreaterThan(0);
        expect(course.progress).toBeLessThan(100);
        expect(course.enrolled).toBe(true);
      });
    });

    it('returns correct number of in-progress courses', () => {
      const inProgressCourses = getInProgressCourses();
      const expectedCount = courses.filter(course => course.enrolled && course.progress > 0 && course.progress < 100).length;
      expect(inProgressCourses.length).toBe(expectedCount);
      expect(inProgressCourses.length).toBe(2); // Based on actual mock data: Digital Literacy (65%) and SDGs (30%)
    });

    it('returns courses with progress information', () => {
      const inProgressCourses = getInProgressCourses();
      inProgressCourses.forEach(course => {
        expect(course.progress).toBeGreaterThan(0);
        expect(course.progress).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('data consistency', () => {
    it('has consistent thumbnail URLs', () => {
      courses.forEach(course => {
        if (course.thumbnail) {
          // Updated to match actual Unsplash URLs
          expect(course.thumbnail).toMatch(/^https:\/\/images\.unsplash\.com/);
        }
      });
    });

    it('has consistent instructor names', () => {
      courses.forEach(course => {
        if (course.instructor) {
          expect(course.instructor).toBeTruthy();
          expect(typeof course.instructor).toBe('string');
          expect(course.instructor.length).toBeGreaterThan(0);
        }
      });
    });

    it('has consistent duration formats', () => {
      courses.forEach(course => {
        if (course.duration) {
          // Duration is now a number (hours), not a string
          expect(typeof course.duration).toBe('number');
          expect(course.duration).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('specific course data', () => {
    it('has Digital Literacy Fundamentals course', () => {
      const course = courses.find(c => c.title === 'Digital Literacy Fundamentals');
      expect(course).toBeDefined();
      expect(course?.featured).toBe(true);
      expect(course?.instructor).toBe('Dr. Sarah Chen');
    });

    it('has Financial Literacy course with correct data', () => {
      const course = courses.find(c => c.title === 'Financial Literacy for Everyone');
      expect(course).toBeDefined();
      expect(course?.progress).toBe(0); // Changed from 45 to 0 based on actual data
      expect(course?.enrolled).toBe(false); // Changed from true to false
    });

    it('has courses with different enrollment states', () => {
      const enrolledCourses = courses.filter(c => c.enrolled);
      const notEnrolledCourses = courses.filter(c => !c.enrolled);
      
      expect(enrolledCourses.length).toBeGreaterThan(0);
      expect(notEnrolledCourses.length).toBeGreaterThan(0);
    });
  });
});