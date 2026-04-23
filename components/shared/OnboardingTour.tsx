import React, { useState } from 'react';
import {
    X,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Home,
    Users,
    BookOpen,
    CreditCard,
    BarChart3,
    Settings,
    Bell,
    MessageSquare,
    Calendar,
    Shield,
    CheckCircle2
} from 'lucide-react';

interface TourStep {
    title: string;
    description: string;
    icon: React.ReactNode;
    highlight: string;
}

const ADMIN_STEPS: TourStep[] = [
    { title: 'Welcome to Your Dashboard!', description: 'This is your school\'s command center. You\'ll see an overview of total students, teachers, attendance, and critical alerts right here.', icon: <Home className="w-8 h-8" />, highlight: 'Dashboard Overview' },
    { title: 'Manage Your People', description: 'Add students, teachers, and parents. Approve pending registrations, assign classes, and manage user accounts — all in one place.', icon: <Users className="w-8 h-8" />, highlight: 'People Management' },
    { title: 'Academic Control', description: 'Create timetables with AI, manage exams, enter results, and publish report cards. The gradebook auto-calculates positions and grades.', icon: <BookOpen className="w-8 h-8" />, highlight: 'Academics' },
    { title: 'Fee Management', description: 'Assign fees by class, track payments, manage arrears, and send automated reminders. Paystack & Flutterwave are built in.', icon: <CreditCard className="w-8 h-8" />, highlight: 'Finance' },
    { title: 'Analytics & Reports', description: 'View enrollment trends, attendance heatmaps, financial reports, and build custom reports with our drag-and-drop report builder.', icon: <BarChart3 className="w-8 h-8" />, highlight: 'Analytics' },
    { title: 'Communication Hub', description: 'Send announcements, chat with teachers and parents, schedule conferences, and broadcast emergency alerts.', icon: <MessageSquare className="w-8 h-8" />, highlight: 'Communication' },
    { title: 'Security & Settings', description: 'Configure school settings, manage roles and permissions, view audit logs, and control data backups.', icon: <Settings className="w-8 h-8" />, highlight: 'Settings' },
];

const TEACHER_STEPS: TourStep[] = [
    { title: 'Welcome, Teacher!', description: 'Your dashboard shows your assigned classes, upcoming lessons, and pending tasks at a glance.', icon: <Home className="w-8 h-8" />, highlight: 'Dashboard' },
    { title: 'Take Attendance', description: 'Mark attendance for your classes with one tap. Use QR codes for faster check-ins. Reports are auto-generated weekly.', icon: <CheckCircle2 className="w-8 h-8" />, highlight: 'Attendance' },
    { title: 'Gradebook & Results', description: 'Enter grades, view class analytics, and submit results for report card publishing. Auto-grading works for MCQ assignments.', icon: <BookOpen className="w-8 h-8" />, highlight: 'Gradebook' },
    { title: 'Lesson Planner', description: 'Plan your lessons with AI-powered suggestions. Upload notes, create quizzes, and assign homework — all from one screen.', icon: <Calendar className="w-8 h-8" />, highlight: 'Lessons' },
    { title: 'Messages & Chat', description: 'Communicate directly with parents, admins, and other teachers. Join subject forums and collaborate on curriculum.', icon: <MessageSquare className="w-8 h-8" />, highlight: 'Communication' },
];

const PARENT_STEPS: TourStep[] = [
    { title: 'Welcome, Parent!', description: 'See all your children\'s daily updates in one dashboard — attendance, homework, fees, and bus status.', icon: <Home className="w-8 h-8" />, highlight: 'Today\'s View' },
    { title: 'Track Progress', description: 'View your child\'s grades, report cards, behavior logs, and attendance history. Get AI-powered insights and tips.', icon: <BarChart3 className="w-8 h-8" />, highlight: 'Progress' },
    { title: 'Pay Fees Online', description: 'Pay school fees online with Paystack or Flutterwave. View fee breakdowns, installment plans, and payment receipts.', icon: <CreditCard className="w-8 h-8" />, highlight: 'Fees' },
    { title: 'Stay Connected', description: 'Message teachers directly, receive notifications about your child, and RSVP to school events and PTA meetings.', icon: <MessageSquare className="w-8 h-8" />, highlight: 'Communication' },
    { title: 'Notifications', description: 'Customize your notification preferences — choose digest mode, instant alerts, or mute specific categories.', icon: <Bell className="w-8 h-8" />, highlight: 'Notifications' },
];

const STUDENT_STEPS: TourStep[] = [
    { title: 'Welcome, Student!', description: 'Your dashboard shows your upcoming assignments, recent grades, and daily schedule.', icon: <Home className="w-8 h-8" />, highlight: 'Dashboard' },
    { title: 'Assignments & Quizzes', description: 'View and submit assignments, take quizzes, and check your results. Computer-based tests open right in the app.', icon: <BookOpen className="w-8 h-8" />, highlight: 'Assignments' },
    { title: 'Rewards & Badges', description: 'Earn points for good behavior and academic achievements. Climb the leaderboard and unlock badges!', icon: <Sparkles className="w-8 h-8" />, highlight: 'Rewards' },
    { title: 'Study Tools', description: 'Access learning resources, find study buddies, use the AI chat assistant, and join virtual classes.', icon: <Users className="w-8 h-8" />, highlight: 'Learning' },
];

interface OnboardingTourProps {
    role: 'admin' | 'teacher' | 'parent' | 'student';
    onComplete: () => void;
    onSkip: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ role, onComplete, onSkip }) => {
    const [currentStep, setCurrentStep] = useState(0);

    const lowerRole = role?.toLowerCase();
    const steps = lowerRole === 'admin' ? ADMIN_STEPS : lowerRole === 'teacher' ? TEACHER_STEPS : lowerRole === 'parent' ? PARENT_STEPS : STUDENT_STEPS;
    const step = steps[currentStep];
    const isLast = currentStep === steps.length - 1;
    const progress = ((currentStep + 1) / steps.length) * 100;

    const gradients: Record<string, string> = {
        admin: 'from-indigo-600 to-purple-700',
        teacher: 'from-emerald-600 to-teal-700',
        parent: 'from-blue-600 to-indigo-700',
        student: 'from-amber-500 to-orange-600',
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl overflow-hidden">
                {/* Header with gradient */}
                <div className={`bg-gradient-to-br ${gradients[role]} p-8 text-white relative`}>
                    <button onClick={onSkip} className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center justify-center mb-4">
                        <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">{step.icon}</div>
                    </div>
                    <h2 className="text-2xl font-bold text-center font-outfit">{step.title}</h2>
                    <p className="text-center text-white/70 text-sm mt-2 font-bold">{step.highlight}</p>
                </div>

                {/* Content */}
                <div className="p-8">
                    <p className="text-gray-600 text-center leading-relaxed">{step.description}</p>

                    {/* Progress bar */}
                    <div className="mt-6">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-2 font-bold">{currentStep + 1} of {steps.length}</p>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-6">
                        <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0}
                            className="flex items-center space-x-1 px-4 py-2.5 text-gray-500 font-bold text-sm hover:text-gray-700 disabled:opacity-30 transition-all">
                            <ChevronLeft className="w-4 h-4" /><span>Back</span>
                        </button>
                        {isLast ? (
                            <button onClick={onComplete}
                                className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                                <CheckCircle2 className="w-5 h-5" /><span>Get Started!</span>
                            </button>
                        ) : (
                            <button onClick={() => setCurrentStep(s => Math.min(steps.length - 1, s + 1))}
                                className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                                <span>Next</span><ChevronRight className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    <button onClick={onSkip} className="w-full text-center text-sm text-gray-400 font-medium mt-4 hover:text-gray-600 transition-colors">
                        Skip Tour
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingTour;
