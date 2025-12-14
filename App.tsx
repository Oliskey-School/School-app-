
import React, { useState, lazy, Suspense, useEffect } from 'react';
import { DashboardType } from './types';
import Login from './components/auth/Login';
import AIChatScreen from './components/shared/AIChatScreen';
import { requestNotificationPermission, showNotification } from './components/shared/notifications';
import { mockNotices, mockTeachers, mockStudents } from './data';
import { ProfileProvider } from './context/ProfileContext';


const AdminDashboard = lazy(() => import('./components/dashboards/AdminDashboard'));
const TeacherDashboard = lazy(() => import('./components/dashboards/TeacherDashboard'));
const ParentDashboard = lazy(() => import('./components/dashboards/ParentDashboard'));
const StudentDashboard = lazy(() => import('./components/dashboards/StudentDashboard'));

// A simple checkmark icon for the success animation, based on constants.tsx
const CheckCircleIcon = ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className || ''}`.trim()} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M9 12l2 2l4 -4" /></svg>;

// A component for the success screen shown after login
const SuccessScreen: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full bg-green-500 animate-fade-in">
        <div className="w-24 h-24 bg-white/30 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="w-20 h-20 text-white animate-checkmark-pop" />
        </div>
        <p className="mt-4 text-2xl font-bold text-white">Login Successful!</p>
    </div>
);

const LoadingScreen: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full bg-gray-100">
        <div className="w-12 h-12 border-4 border-t-4 border-gray-200 border-t-sky-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading Dashboard...</p>
    </div>
);


const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeDashboard, setActiveDashboard] = useState<DashboardType>(DashboardType.Student);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHomePage, setIsHomePage] = useState(true);
  const [loginStatus, setLoginStatus] = useState<'idle' | 'success'>('idle');

  useEffect(() => {
    if (isAuthenticated) {
        // Request permission once the user is authenticated.
        requestNotificationPermission();

        // --- Notification Simulation ---

        // 1. Simulate a new announcement after 10 seconds
        const announcementTimeout = setTimeout(() => {
            const newAnnouncement = mockNotices.find(n => n.category === 'Urgent');
            if (newAnnouncement) {
                showNotification(newAnnouncement.title, {
                    body: newAnnouncement.content,
                    icon: 'https://cdn-icons-png.flaticon.com/512/1007/1007996.png', // Megaphone icon
                    tag: `announcement-${newAnnouncement.id}`
                });
            }
        }, 10000);

        // 2. Simulate a new message after 15 seconds, tailored to the user role
        const messageTimeout = setTimeout(() => {
            let senderName: string | undefined;
            let senderAvatar: string | undefined;
            let messageBody = "Hello! Just checking in.";

            switch (activeDashboard) {
                case DashboardType.Admin:
                    senderName = mockTeachers[0].name;
                    senderAvatar = mockTeachers[0].avatarUrl;
                    messageBody = "The reports for Grade 10A are ready for review.";
                    break;
                case DashboardType.Teacher:
                    senderName = mockStudents[2].name; // Musa Ibrahim
                    senderAvatar = mockStudents[2].avatarUrl;
                    messageBody = "Good afternoon, I have a question about the assignment.";
                    break;
                case DashboardType.Parent:
                    senderName = mockTeachers[1].name; // Mrs. Funke Akintola
                    senderAvatar = mockTeachers[1].avatarUrl;
                    messageBody = "Hello, just a reminder about the PTA meeting tomorrow.";
                    break;
                case DashboardType.Student:
                    senderName = mockTeachers[0].name; // Mr. John Adeoye
                    senderAvatar = mockTeachers[0].avatarUrl;
                    messageBody = "Great work on the last test! Keep it up.";
                    break;
            }

            if (senderName) {
                showNotification(`New message from ${senderName}`, {
                    body: messageBody,
                    icon: senderAvatar,
                    tag: `message-${Date.now()}`
                });
            }
        }, 15000);

        // Cleanup timeouts on component unmount or when user logs out
        return () => {
            clearTimeout(announcementTimeout);
            clearTimeout(messageTimeout);
        };
    }
  }, [isAuthenticated, activeDashboard]);


  const handleLogin = (dashboard: DashboardType) => {
    setActiveDashboard(dashboard);
    setLoginStatus('success');
    setTimeout(() => {
      setIsAuthenticated(true);
      setIsHomePage(true);
      setLoginStatus('idle'); // Reset for next time, if user logs out and back in
    }, 1800); // Duration matches animations
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsChatOpen(false); // Reset chat state on logout
    setIsHomePage(true);
    setLoginStatus('idle');
  };

  const renderDashboard = () => {
    switch (activeDashboard) {
      case DashboardType.Admin:
        return <AdminDashboard onLogout={handleLogout} setIsHomePage={setIsHomePage} />;
      case DashboardType.Teacher:
        return <TeacherDashboard onLogout={handleLogout} setIsHomePage={setIsHomePage} />;
      case DashboardType.Parent:
        return <ParentDashboard onLogout={handleLogout} setIsHomePage={setIsHomePage} />;
      case DashboardType.Student:
        return <StudentDashboard onLogout={handleLogout} setIsHomePage={setIsHomePage} />;
      default:
        return <StudentDashboard onLogout={handleLogout} setIsHomePage={setIsHomePage} />;
    }
  };
  
  const appContent = (
    <>
      {loginStatus === 'success' ? (
        <SuccessScreen />
      ) : !isAuthenticated ? (
        <Login onLogin={handleLogin} />
      ) : isChatOpen ? (
        <AIChatScreen onBack={() => setIsChatOpen(false)} dashboardType={activeDashboard} />
      ) : (
        <Suspense fallback={<LoadingScreen />}>
          {renderDashboard()}
        </Suspense>
      )}
    </>
  );

  return (
    <ProfileProvider>
      <div className="font-sans w-screen h-screen bg-[#F0F2F5] flex flex-col items-center justify-center">
        <div className="relative w-full h-full flex flex-col shadow-2xl">
            {appContent}
        </div>
      </div>
    </ProfileProvider>
  );
};

export default App;
