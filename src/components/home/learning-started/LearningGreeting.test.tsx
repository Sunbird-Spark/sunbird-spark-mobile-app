import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LearningGreeting } from './LearningGreeting';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (key === 'hiUser') return `Hi ${opts?.name}`;
      if (key === 'hiGuest') return 'Hi there';
      if (key === 'journeyStart') return 'Your exciting learning journey starts here.';
      if (key === 'welcomeMessage') return 'Welcome back!';
      return key;
    },
  }),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ userId: 'user-1' }),
}));

const mockUserProfile = { firstName: 'John', lastName: 'Doe' };
vi.mock('../../../hooks/useUser', () => ({
  useUser: () => ({ data: mockUserProfile }),
}));

vi.mock('../../../services/UserService', () => ({
  userService: {
    getDisplayName: (profile: any) => {
      if (!profile) return null;
      return [profile.firstName, profile.lastName].filter(Boolean).join(' ') || null;
    },
  },
}));

describe('LearningGreeting', () => {
  it('renders user greeting with name', () => {
    render(<LearningGreeting enrolledCount={0} />);
    expect(screen.getByText('Hi John Doe')).toBeInTheDocument();
  });

  it('renders journey start subtitle when no enrollments', () => {
    render(<LearningGreeting enrolledCount={0} />);
    expect(screen.getByText('Your exciting learning journey starts here.')).toBeInTheDocument();
  });

  it('renders welcome message when has enrollments', () => {
    render(<LearningGreeting enrolledCount={3} />);
    expect(screen.getByText('Welcome back!')).toBeInTheDocument();
  });
});
