export type ContentType = 'video' | 'pdf';
export type CompletionStatus = 'not_started' | 'in_progress' | 'completed';

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  duration?: number; // in minutes for videos
  completed: boolean;
}

export interface Module {
  id: string;
  title: string;
  contents: ContentItem[];
}

export interface Course {
  id: string;
  title: string;
  titleAr?: string;
  titleFr?: string;
  titlePt?: string;
  description: string;
  descriptionAr?: string;
  descriptionFr?: string;
  descriptionPt?: string;
  thumbnail: string;
  duration: number; // in hours
  lessons: number;
  progress: number; // 0-100
  enrolled: boolean;
  featured: boolean;
  category: string;
  instructor: string;
  rating: number;
  learningPoints: string[];
  modules: Module[];
}

export interface Certificate {
  id: string;
  courseId: string;
  courseTitle: string;
  earnedDate: string;
  userName: string;
  certificateNumber: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  enrolledCourses: string[];
  completedCourses: string[];
}

export const courses: Course[] = [
  {
    id: '1',
    title: 'Digital Literacy Fundamentals',
    titleAr: 'أساسيات الثقافة الرقمية',
    titleFr: 'Fondamentaux de la littératie numérique',
    titlePt: 'Fundamentos de Alfabetização Digital',
    description: 'Learn essential digital skills for the modern world including internet safety, basic computing, and online communication.',
    descriptionAr: 'تعلم المهارات الرقمية الأساسية للعالم الحديث بما في ذلك سلامة الإنترنت والحوسبة الأساسية والتواصل عبر الإنترنت.',
    descriptionFr: 'Apprenez les compétences numériques essentielles pour le monde moderne, y compris la sécurité sur Internet.',
    descriptionPt: 'Aprenda habilidades digitais essenciais para o mundo moderno, incluindo segurança na internet.',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop',
    duration: 8,
    lessons: 24,
    progress: 65,
    enrolled: true,
    featured: true,
    category: 'Technology',
    instructor: 'Dr. Sarah Chen',
    rating: 4.8,
    learningPoints: [
      'Understanding computer basics',
      'Internet safety and security',
      'Email and online communication',
      'Using productivity tools',
    ],
    modules: [
      {
        id: 'm1-1',
        title: 'Introduction to Computers',
        contents: [
          { id: 'c1-1-1', title: 'What is a Computer?', type: 'video', duration: 15, completed: true },
          { id: 'c1-1-2', title: 'Hardware Components', type: 'video', duration: 20, completed: true },
          { id: 'c1-1-3', title: 'Computer Basics Guide', type: 'pdf', completed: true },
        ],
      },
      {
        id: 'm1-2',
        title: 'Operating Systems',
        contents: [
          { id: 'c1-2-1', title: 'Introduction to Operating Systems', type: 'video', duration: 18, completed: true },
          { id: 'c1-2-2', title: 'File Management', type: 'video', duration: 22, completed: true },
          { id: 'c1-2-3', title: 'OS Comparison Chart', type: 'pdf', completed: false },
        ],
      },
      {
        id: 'm1-3',
        title: 'Internet Safety',
        contents: [
          { id: 'c1-3-1', title: 'Staying Safe Online', type: 'video', duration: 25, completed: true },
          { id: 'c1-3-2', title: 'Recognizing Scams', type: 'video', duration: 18, completed: false },
          { id: 'c1-3-3', title: 'Password Best Practices', type: 'pdf', completed: false },
          { id: 'c1-3-4', title: 'Privacy Settings Guide', type: 'pdf', completed: false },
        ],
      },
      {
        id: 'm1-4',
        title: 'Email & Communication',
        contents: [
          { id: 'c1-4-1', title: 'Email Basics', type: 'video', duration: 15, completed: false },
          { id: 'c1-4-2', title: 'Professional Communication', type: 'video', duration: 20, completed: false },
          { id: 'c1-4-3', title: 'Email Etiquette Guide', type: 'pdf', completed: false },
        ],
      },
    ],
  },
  {
    id: '2',
    title: 'Sustainable Development Goals',
    titleAr: 'أهداف التنمية المستدامة',
    titleFr: 'Objectifs de développement durable',
    titlePt: 'Objetivos de Desenvolvimento Sustentável',
    description: 'Explore the 17 UN Sustainable Development Goals and learn how to contribute to a better future for all.',
    descriptionAr: 'استكشف أهداف الأمم المتحدة للتنمية المستدامة الـ 17 وتعلم كيف تساهم في مستقبل أفضل للجميع.',
    descriptionFr: 'Explorez les 17 objectifs de développement durable de l\'ONU.',
    descriptionPt: 'Explore os 17 Objetivos de Desenvolvimento Sustentável da ONU.',
    thumbnail: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&h=250&fit=crop',
    duration: 12,
    lessons: 34,
    progress: 30,
    enrolled: true,
    featured: true,
    category: 'Education',
    instructor: 'Prof. James Okonkwo',
    rating: 4.9,
    learningPoints: [
      'Understanding all 17 SDGs',
      'Global challenges and solutions',
      'Taking action in your community',
      'Measuring sustainable impact',
    ],
    modules: [
      {
        id: 'm2-1',
        title: 'Introduction to SDGs',
        contents: [
          { id: 'c2-1-1', title: 'What are SDGs?', type: 'video', duration: 20, completed: true },
          { id: 'c2-1-2', title: 'History of Sustainable Development', type: 'video', duration: 25, completed: true },
          { id: 'c2-1-3', title: 'SDG Overview Document', type: 'pdf', completed: true },
        ],
      },
      {
        id: 'm2-2',
        title: 'People-Focused Goals',
        contents: [
          { id: 'c2-2-1', title: 'No Poverty & Zero Hunger', type: 'video', duration: 30, completed: true },
          { id: 'c2-2-2', title: 'Good Health & Education', type: 'video', duration: 28, completed: false },
          { id: 'c2-2-3', title: 'Gender Equality', type: 'video', duration: 22, completed: false },
          { id: 'c2-2-4', title: 'Case Studies', type: 'pdf', completed: false },
        ],
      },
      {
        id: 'm2-3',
        title: 'Planet-Focused Goals',
        contents: [
          { id: 'c2-3-1', title: 'Climate Action', type: 'video', duration: 25, completed: false },
          { id: 'c2-3-2', title: 'Life Below Water & On Land', type: 'video', duration: 30, completed: false },
          { id: 'c2-3-3', title: 'Environmental Impact Report', type: 'pdf', completed: false },
        ],
      },
    ],
  },
  {
    id: '3',
    title: 'Financial Literacy for Everyone',
    titleAr: 'الثقافة المالية للجميع',
    titleFr: 'Littératie financière pour tous',
    titlePt: 'Alfabetização Financeira para Todos',
    description: 'Master personal finance, budgeting, saving, and making informed financial decisions.',
    descriptionAr: 'أتقن التمويل الشخصي والميزانية والادخار واتخاذ قرارات مالية مستنيرة.',
    descriptionFr: 'Maîtrisez les finances personnelles, la budgétisation et l\'épargne.',
    descriptionPt: 'Domine finanças pessoais, orçamento e economia.',
    thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=250&fit=crop',
    duration: 6,
    lessons: 18,
    progress: 0,
    enrolled: false,
    featured: true,
    category: 'Finance',
    instructor: 'Maria Santos',
    rating: 4.7,
    learningPoints: [
      'Creating and managing budgets',
      'Understanding savings and investments',
      'Making smart financial decisions',
      'Planning for the future',
    ],
    modules: [
      {
        id: 'm3-1',
        title: 'Budgeting Basics',
        contents: [
          { id: 'c3-1-1', title: 'Why Budgeting Matters', type: 'video', duration: 15, completed: false },
          { id: 'c3-1-2', title: 'Creating Your First Budget', type: 'video', duration: 25, completed: false },
          { id: 'c3-1-3', title: 'Budget Template', type: 'pdf', completed: false },
        ],
      },
      {
        id: 'm3-2',
        title: 'Saving Strategies',
        contents: [
          { id: 'c3-2-1', title: 'Emergency Funds', type: 'video', duration: 18, completed: false },
          { id: 'c3-2-2', title: 'Saving Goals', type: 'video', duration: 20, completed: false },
          { id: 'c3-2-3', title: 'Savings Calculator Guide', type: 'pdf', completed: false },
        ],
      },
      {
        id: 'm3-3',
        title: 'Introduction to Investing',
        contents: [
          { id: 'c3-3-1', title: 'Investment Basics', type: 'video', duration: 30, completed: false },
          { id: 'c3-3-2', title: 'Risk and Return', type: 'video', duration: 25, completed: false },
          { id: 'c3-3-3', title: 'Investment Types Overview', type: 'pdf', completed: false },
        ],
      },
    ],
  },
  {
    id: '4',
    title: 'Health & Wellness Basics',
    titleAr: 'أساسيات الصحة والعافية',
    titleFr: 'Bases de la santé et du bien-être',
    titlePt: 'Fundamentos de Saúde e Bem-estar',
    description: 'Learn about nutrition, exercise, mental health, and maintaining a healthy lifestyle.',
    descriptionAr: 'تعرف على التغذية والتمارين والصحة النفسية والحفاظ على نمط حياة صحي.',
    descriptionFr: 'Apprenez sur la nutrition, l\'exercice et la santé mentale.',
    descriptionPt: 'Aprenda sobre nutrição, exercício e saúde mental.',
    thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=250&fit=crop',
    duration: 10,
    lessons: 28,
    progress: 100,
    enrolled: true,
    featured: false,
    category: 'Health',
    instructor: 'Dr. Ahmed Hassan',
    rating: 4.6,
    learningPoints: [
      'Nutrition fundamentals',
      'Exercise and physical activity',
      'Mental health awareness',
      'Building healthy habits',
    ],
    modules: [
      {
        id: 'm4-1',
        title: 'Nutrition Fundamentals',
        contents: [
          { id: 'c4-1-1', title: 'Understanding Macronutrients', type: 'video', duration: 20, completed: true },
          { id: 'c4-1-2', title: 'Micronutrients & Vitamins', type: 'video', duration: 18, completed: true },
          { id: 'c4-1-3', title: 'Nutrition Guide', type: 'pdf', completed: true },
        ],
      },
      {
        id: 'm4-2',
        title: 'Physical Fitness',
        contents: [
          { id: 'c4-2-1', title: 'Benefits of Exercise', type: 'video', duration: 15, completed: true },
          { id: 'c4-2-2', title: 'Creating a Workout Plan', type: 'video', duration: 25, completed: true },
          { id: 'c4-2-3', title: 'Exercise Routines', type: 'pdf', completed: true },
        ],
      },
      {
        id: 'm4-3',
        title: 'Mental Health',
        contents: [
          { id: 'c4-3-1', title: 'Understanding Mental Health', type: 'video', duration: 22, completed: true },
          { id: 'c4-3-2', title: 'Stress Management', type: 'video', duration: 20, completed: true },
          { id: 'c4-3-3', title: 'Mindfulness Techniques', type: 'pdf', completed: true },
        ],
      },
    ],
  },
  {
    id: '5',
    title: 'Introduction to Climate Change',
    titleAr: 'مقدمة في تغير المناخ',
    titleFr: 'Introduction au changement climatique',
    titlePt: 'Introdução às Mudanças Climáticas',
    description: 'Understand climate science, its impacts, and actions we can take to address this global challenge.',
    descriptionAr: 'فهم علم المناخ وتأثيراته والإجراءات التي يمكننا اتخاذها لمعالجة هذا التحدي العالمي.',
    descriptionFr: 'Comprendre la science du climat et ses impacts.',
    descriptionPt: 'Entenda a ciência do clima e seus impactos.',
    thumbnail: 'https://images.unsplash.com/photo-1569163139599-0f4517e36f31?w=400&h=250&fit=crop',
    duration: 8,
    lessons: 22,
    progress: 0,
    enrolled: false,
    featured: false,
    category: 'Environment',
    instructor: 'Dr. Elena Rodriguez',
    rating: 4.8,
    learningPoints: [
      'Climate science basics',
      'Understanding greenhouse gases',
      'Climate change impacts',
      'Solutions and actions',
    ],
    modules: [
      {
        id: 'm5-1',
        title: 'Climate Science Basics',
        contents: [
          { id: 'c5-1-1', title: 'What is Climate?', type: 'video', duration: 18, completed: false },
          { id: 'c5-1-2', title: 'Weather vs Climate', type: 'video', duration: 15, completed: false },
          { id: 'c5-1-3', title: 'Climate Data Overview', type: 'pdf', completed: false },
        ],
      },
      {
        id: 'm5-2',
        title: 'Greenhouse Effect',
        contents: [
          { id: 'c5-2-1', title: 'How Greenhouse Gases Work', type: 'video', duration: 22, completed: false },
          { id: 'c5-2-2', title: 'Human Impact on Climate', type: 'video', duration: 25, completed: false },
          { id: 'c5-2-3', title: 'Emissions Report', type: 'pdf', completed: false },
        ],
      },
    ],
  },
  {
    id: '6',
    title: 'Effective Communication Skills',
    titleAr: 'مهارات التواصل الفعال',
    titleFr: 'Compétences en communication efficace',
    titlePt: 'Habilidades de Comunicação Eficaz',
    description: 'Develop strong verbal, written, and interpersonal communication skills for personal and professional success.',
    descriptionAr: 'طور مهارات التواصل الشفهي والكتابي والشخصي للنجاح الشخصي والمهني.',
    descriptionFr: 'Développez de solides compétences en communication.',
    descriptionPt: 'Desenvolva fortes habilidades de comunicação.',
    thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=250&fit=crop',
    duration: 5,
    lessons: 15,
    progress: 0,
    enrolled: false,
    featured: false,
    category: 'Skills',
    instructor: 'Lisa Thompson',
    rating: 4.5,
    learningPoints: [
      'Verbal communication',
      'Written communication',
      'Active listening',
      'Non-verbal cues',
    ],
    modules: [
      {
        id: 'm6-1',
        title: 'Verbal Communication',
        contents: [
          { id: 'c6-1-1', title: 'Speaking with Clarity', type: 'video', duration: 20, completed: false },
          { id: 'c6-1-2', title: 'Public Speaking Tips', type: 'video', duration: 25, completed: false },
          { id: 'c6-1-3', title: 'Speech Templates', type: 'pdf', completed: false },
        ],
      },
      {
        id: 'm6-2',
        title: 'Written Communication',
        contents: [
          { id: 'c6-2-1', title: 'Writing Effectively', type: 'video', duration: 22, completed: false },
          { id: 'c6-2-2', title: 'Business Writing', type: 'video', duration: 20, completed: false },
          { id: 'c6-2-3', title: 'Writing Style Guide', type: 'pdf', completed: false },
        ],
      },
    ],
  },
];

export const certificates: Certificate[] = [
  {
    id: 'cert-1',
    courseId: '4',
    courseTitle: 'Health & Wellness Basics',
    earnedDate: '2024-01-15',
    userName: 'Rahul Warrier',
    certificateNumber: 'SB-2024-HW-001234',
  },
];

export const currentUser: User = {
  id: 'user-1',
  name: 'Rahul Warrier',
  email: 'rahul.warrier@email.com',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  enrolledCourses: ['1', '2', '4'],
  completedCourses: ['4'],
};

export const getCourseById = (id: string): Course | undefined => {
  return courses.find(course => course.id === id);
};

export const getEnrolledCourses = (): Course[] => {
  return courses.filter(course => course.enrolled);
};

export const getFeaturedCourses = (): Course[] => {
  return courses.filter(course => course.featured);
};

export const getInProgressCourses = (): Course[] => {
  return courses.filter(course => course.enrolled && course.progress > 0 && course.progress < 100);
};

// Helper functions for module/content status
export const getModuleStatus = (module: Module): CompletionStatus => {
  const completedCount = module.contents.filter(c => c.completed).length;
  if (completedCount === 0) return 'not_started';
  if (completedCount === module.contents.length) return 'completed';
  return 'in_progress';
};

export const getCourseStatus = (course: Course): CompletionStatus => {
  if (course.progress === 0) return 'not_started';
  if (course.progress === 100) return 'completed';
  return 'in_progress';
};
