import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../layout/DashboardLayout';
import { InspectorOverview } from './InspectorOverview';
import { SchoolDirectory } from './SchoolDirectory';
import { SchoolProfileView } from './SchoolProfileView';
import { NewInspection } from './NewInspection';
import { useInspectorProfile, useInspectorStats } from '../../hooks/useInspector';
import { useInspections } from '../../hooks/useInspections';
import { motion, AnimatePresence } from 'framer-motion';
import { School } from '../../types';
import { SchoolProfile } from '../../types/inspector';
import toast from 'react-hot-toast';

type ActiveView = 'home' | 'directory' | 'profile' | 'inspecting';

const InspectorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [activeInspectionId, setActiveInspectionId] = useState<string | null>(null);

  // Data Hooks
  const { data: profile, isLoading: isLoadingProfile } = useInspectorProfile(user?.id);
  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useInspectorStats(profile?.id);
  const { data: inspections, isLoading: isLoadingInspections, refetch: refetchInspections } = useInspections(profile?.id);

  const handleRefresh = async () => {
    await Promise.all([refetchStats(), refetchInspections()]);
    toast.success('Dashboard updated');
  };

  const handleStartNew = () => {
    setActiveView('directory');
  };

  const handleSearchSchools = () => {
    setActiveView('directory');
  };

  const handleSelectSchool = (school: SchoolProfile) => {
    setSelectedSchool(school);
    setActiveView('profile');
  };

  const handleStartInspection = () => {
    if (!selectedSchool) return;
    setActiveView('inspecting');
    setActiveInspectionId(null);
  };

  const handleInspectionClick = (id: string) => {
    setActiveInspectionId(id);
    setActiveView('inspecting');
  };

  const handleInspectionComplete = () => {
    setActiveView('home');
    setActiveInspectionId(null);
    setSelectedSchool(null);
    refetchStats();
    refetchInspections();
  };

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center bg-red-50 border border-red-200 rounded-2xl m-8">
        <h2 className="text-xl font-bold text-red-800">Inspector Profile Not Found</h2>
        <p className="text-red-600 mt-2">Please contact the administrator to set up your account.</p>
      </div>
    );
  }

  return (
    <DashboardLayout 
      title={
        activeView === 'home' ? 'Inspector Dashboard' : 
        activeView === 'directory' ? 'School Directory' : 
        activeView === 'profile' ? 'School Profile' :
        'Inspection in Progress'
      }
      activeScreen={activeView}
      hideHeader={false}
      onBack={activeView !== 'home' ? () => setActiveView('home') : undefined}
    >
      <div className="pb-12">
        <AnimatePresence mode="wait">
          {activeView === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <InspectorOverview 
                inspector={profile}
                stats={stats || null}
                recentInspections={inspections?.filter(i => i.status === 'Completed').slice(0, 10) || []}
                upcomingInspections={inspections?.filter(i => i.status === 'Scheduled').slice(0, 5) || []}
                onStartNew={handleStartNew}
                onSearchSchools={handleSearchSchools}
                onInspectionClick={handleInspectionClick}
                onRefresh={handleRefresh}
                isRevalidating={isLoadingStats || isLoadingInspections}
              />
            </motion.div>
          )}

          {activeView === 'directory' && (
            <motion.div
              key="directory"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SchoolDirectory 
                jurisdictionIds={profile.jurisdiction_ids || []}
                onSelectSchool={handleSelectSchool}
                onBack={() => setActiveView('home')}
              />
            </motion.div>
          )}

          {activeView === 'profile' && selectedSchool && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SchoolProfileView 
                schoolId={selectedSchool.id}
                onBack={() => setActiveView('directory')}
                onStartInspection={handleStartInspection}
                onViewReport={handleInspectionClick}
              />
            </motion.div>
          )}

          {activeView === 'inspecting' && (
            <motion.div
              key="inspecting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <NewInspection 
                jurisdictionIds={profile.jurisdiction_ids || []}
                onComplete={() => setActiveView('home')}
                onBack={() => setActiveView('home')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default InspectorDashboard;
