import React from 'react';
import { motion } from 'framer-motion';
import { Student } from '../../types';
import { ChevronRightIcon, DocumentTextIcon } from '../../constants';
import { useProfile } from '../../context/ProfileContext';

interface SelectReportTermScreenProps {
    student?: Student;
    navigateTo: (view: string, title: string, props: any) => void;
    handleBack: () => void;
    // Which view to land on after a term is picked, and what view key to
    // navigate to if the user wants to view another student's report (parent
    // flow only — omit for the student's own dashboard).
    targetView: string;
    changeChildView?: string;
}

// Shared "pick a school year, then pick a term" report viewer picker — the
// same two-step UX teachers already use for grade entry (see
// components/teacher/SelectTermForReportScreen.tsx), reused here for parents
// and students VIEWING a published report instead of a teacher entering one.
const SelectReportTermScreen: React.FC<SelectReportTermScreenProps> = ({ student: studentProp, navigateTo, handleBack, targetView, changeChildView }) => {
    const { profile } = useProfile();
    // A student viewing their own results has no student prop passed down —
    // fall back to their own profile record.
    const student = studentProp || (profile as any);

    if (!student) return <div className="flex items-center justify-center min-h-[40vh] p-8 text-center text-gray-500">Select a student first.</div>;

    const terms = ["First Term", "Second Term", "Third Term"];

    const getGradeName = (grade: number) => {
        const className = (student as any).className || '';
        if (className.toUpperCase().includes('SSS') || className.toUpperCase().includes('SENIOR')) {
            if (grade >= 1 && grade <= 3) return `SSS ${grade}`;
        }
        if (className.toUpperCase().includes('JSS') || className.toUpperCase().includes('JUNIOR')) {
            if (grade >= 1 && grade <= 3) return `JSS ${grade}`;
        }
        if (grade >= 7 && grade <= 9) return `JSS ${grade - 6}`;
        if (grade >= 10 && grade <= 12) return `SSS ${grade - 9}`;
        return `Grade ${grade}`;
    };

    const activeEntryYear = React.useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        return currentMonth >= 8 ? currentYear : currentYear - 1;
    }, []);

    const sessionData = React.useMemo(() => {
        const joinedAt = (student as any).createdAt || (student as any).created_at || (student as any).admissionDate;
        const joinDate = joinedAt ? new Date(joinedAt) : new Date(activeEntryYear, 0);
        const joinYear = joinDate.getFullYear();
        const startYear = joinDate.getMonth() >= 8 ? joinYear : joinYear - 1;

        const currentGrade = student.grade || 1;
        const list: any[] = [];
        const minStart = startYear;
        const maxEnd = activeEntryYear + (12 - currentGrade);

        for (let y = minStart; y <= maxEnd; y++) {
            const sessionStr = `${y}/${y + 1}`;
            const gradeAtSession = currentGrade - (activeEntryYear - y);
            if (gradeAtSession <= 0) continue;

            const isStart = y === startYear;
            const isCurrent = y === activeEntryYear;
            const isFuture = y > activeEntryYear;

            list.push({
                session: sessionStr,
                grade: gradeAtSession,
                gradeName: getGradeName(gradeAtSession),
                isStart,
                isCurrent,
                isFuture,
            });
        }

        return list;
    }, [student, activeEntryYear]);

    const defaultSession = React.useMemo(() => {
        const current = sessionData.find(s => s.isCurrent);
        return current ? current.session : (sessionData[0]?.session || `${activeEntryYear}/${activeEntryYear + 1}`);
    }, [sessionData, activeEntryYear]);

    const [selectedSession, setSelectedSession] = React.useState(defaultSession);

    React.useEffect(() => {
        setSelectedSession(defaultSession);
    }, [defaultSession]);

    React.useLayoutEffect(() => {
        setTimeout(() => {
            const activeEl = document.querySelector('[data-active="true"]');
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }, 100);
    }, []);

    const handleSelectTerm = (term: string) => {
        navigateTo(targetView, `${student.name}'s Report`, {
            student,
            studentId: student.id,
            term,
            session: selectedSession,
        });
    };

    return (
        <div className="flex flex-col h-full bg-white overflow-y-auto">
            <div className="p-4 space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-3xl text-center shadow-xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
                    <h3 className="text-2xl font-bold text-white mb-1 tracking-tight">Report Card</h3>
                    <p className="text-purple-100 font-medium text-sm">{student.name || 'Student'}</p>
                    {changeChildView && (
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() => navigateTo(changeChildView, 'Select Child', {})}
                            className="mt-3 text-xs font-bold text-white/90 underline underline-offset-2 hover:text-white"
                        >
                            Change Child
                        </motion.button>
                    )}
                </motion.div>

                <div>
                    <div className="flex items-center justify-between mb-4 px-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Academic Session</label>
                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                            Swipe SideWays →
                        </span>
                    </div>

                    <div className="flex overflow-x-auto pb-4 gap-4 px-2 no-scrollbar scroll-smooth snap-x">
                        {sessionData.map((item, i) => (
                            <motion.button
                                key={item.session}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.04 }}
                                whileTap={{ scale: 0.97 }}
                                data-active={selectedSession === item.session}
                                data-current={item.isCurrent}
                                onClick={() => setSelectedSession(item.session)}
                                className={`flex-shrink-0 w-44 p-4 rounded-3xl border-2 transition-colors duration-300 snap-center relative group ${selectedSession === item.session
                                        ? 'border-purple-600 bg-white shadow-xl scale-105'
                                        : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-purple-200'
                                    }`}
                            >
                                {selectedSession === item.session && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                                        className="absolute -top-2 -right-2 bg-purple-600 text-white p-1 rounded-full shadow-lg"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </motion.div>
                                )}
                                <div className={`text-xs font-bold mb-1 uppercase tracking-widest ${selectedSession === item.session ? 'text-purple-600' : 'text-gray-400'}`}>
                                    {item.gradeName}
                                </div>
                                <div className={`text-base font-bold ${selectedSession === item.session ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {item.session}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1 justify-center">
                                    {item.isStart && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-green-500 text-white shadow-sm">STARTED</span>
                                    )}
                                    {item.isCurrent && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-500 text-white shadow-sm">CURRENT</span>
                                    )}
                                    {item.isFuture && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-500 text-white shadow-sm">REMAINING</span>
                                    )}
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 block">Choose Term to View</label>
                    <div className="grid gap-4">
                        {terms.map((term, i) => (
                            <motion.button
                                key={term}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: i * 0.06 }}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleSelectTerm(term)}
                                className="group bg-white p-5 rounded-3xl border-2 border-gray-100 hover:border-purple-600 hover:shadow-xl transition-colors duration-300 flex items-center justify-between"
                            >
                                <div className="flex items-center">
                                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mr-4 group-hover:bg-purple-600 transition-all duration-300 shadow-sm">
                                        <DocumentTextIcon className="w-6 h-6 text-purple-600 group-hover:text-white" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-bold text-gray-900 text-lg group-hover:text-purple-700 transition-colors tracking-tight uppercase">{term}</h4>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{selectedSession} Session</p>
                                    </div>
                                </div>
                                <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-purple-50 transition-all duration-300">
                                    <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-purple-600" />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SelectReportTermScreen;
