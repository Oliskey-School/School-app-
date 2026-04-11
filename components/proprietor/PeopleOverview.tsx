import React, { useState, useEffect } from 'react';
import {
    Users,
    GraduationCap,
    UserCircle,
    Briefcase,
    Mail,
    Phone,
    Shield,
    UserPlus,
    MessageSquare,
    FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { api } from '../../lib/api';

export const PeopleOverview: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'students' | 'staff' | 'parents' | 'admins'>('students');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        students: { total: 0, active: 0, new: 0, attendance: '0%' },
        staff: { total: 0, teaching: 0, nonTeaching: 0, presence: '0%' },
        parents: { total: 0, pta: 0, appUsers: 0, debtFree: '0%' },
        admins: { total: 0, role: 'System Administrators', lastActive: 'N/A' }
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);

            // Fetch Students
            const { data: students, error: studentsError } = await api
                .from('students')
                .select('id, status, created_at');

            if (studentsError) throw studentsError;

            // Fetch Teachers
            const { data: teachers, error: teachersError } = await api
                .from('teachers')
                .select('id, is_teaching_staff');

            if (teachersError) throw teachersError;

            // Fetch Parents
            const { data: parents, error: parentsError } = await api
                .from('parents')
                .select('id, created_at');

            if (parentsError) throw parentsError;

            // Fetch Admins (users with role 'admin')
            const { data: admins, error: adminsError } = await api
                .from('users')
                .select('id, role, last_sign_in_at')
                .eq('role', 'admin');

            if (adminsError) throw adminsError;

            // Calculate stats
            const now = new Date();
            const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1));

            const activeStudents = students?.filter(s => s.status === 'active' || !s.status) || [];
            const newStudents = students?.filter(s => new Date(s.created_at) > oneMonthAgo) || [];

            const teachingStaff = teachers?.filter(t => t.is_teaching_staff !== false) || [];
            const nonTeachingStaff = teachers?.filter(t => t.is_teaching_staff === false) || [];

            setStats({
                students: {
                    total: students?.length || 0,
                    active: activeStudents.length,
                    new: newStudents.length,
                    attendance: '94%' // TODO: Calculate from attendance table
                },
                staff: {
                    total: teachers?.length || 0,
                    teaching: teachingStaff.length,
                    nonTeaching: nonTeachingStaff.length,
                    presence: '100%' // TODO: Calculate from attendance table
                },
                parents: {
                    total: parents?.length || 0,
                    pta: Math.floor((parents?.length || 0) * 0.8), // Estimate
                    appUsers: Math.floor((parents?.length || 0) * 0.65), // Estimate
                    debtFree: '80%' // TODO: Calculate from fees table
                },
                admins: {
                    total: admins?.length || 0,
                    role: 'System Administrators',
                    lastActive: admins?.[0]?.last_sign_in_at ?
                        new Date(admins[0].last_sign_in_at).toLocaleString() : 'N/A'
                }
            });

        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {loading && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            )}

            {!loading && (
                <>
                    {/* High Level Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card
                            className={`cursor-pointer transition-all border-2 ${activeTab === 'students' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-200'}`}
                            onClick={() => setActiveTab('students')}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500">Students</p>
                                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.students.total}</h3>
                                    <p className="text-xs text-green-600 mt-1">+{stats.students.new} this term</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <GraduationCap className="w-5 h-5 text-blue-600" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card
                            className={`cursor-pointer transition-all border-2 ${activeTab === 'staff' ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-purple-200'}`}
                            onClick={() => setActiveTab('staff')}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500">Staff</p>
                                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.staff.total}</h3>
                                    <p className="text-xs text-slate-500 mt-1">{stats.staff.teaching} Teaching</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                    <Briefcase className="w-5 h-5 text-purple-600" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card
                            className={`cursor-pointer transition-all border-2 ${activeTab === 'parents' ? 'border-orange-500 bg-orange-50' : 'border-slate-100 hover:border-orange-200'}`}
                            onClick={() => setActiveTab('parents')}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500">Parents</p>
                                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.parents.total}</h3>
                                    <p className="text-xs text-orange-600 mt-1">{stats.parents.debtFree} Debt Free</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-orange-600" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card
                            className={`cursor-pointer transition-all border-2 ${activeTab === 'admins' ? 'border-slate-800 bg-slate-50' : 'border-slate-100 hover:border-slate-400'}`}
                            onClick={() => setActiveTab('admins')}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500">Admins</p>
                                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.admins.total}</h3>
                                    <p className="text-xs text-green-600 mt-1">System Healthy</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-slate-700" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detail Section */}
                    <Card className="border-slate-200 shadow-sm min-h-[400px]">
                        <CardHeader className="border-b border-slate-100 p-6 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-bold text-slate-800 flex items-center">
                                    {activeTab === 'students' && <><GraduationCap className="mr-2 text-blue-600" /> Student Management</>}
                                    {activeTab === 'staff' && <><Briefcase className="mr-2 text-purple-600" /> Staff Directory</>}
                                    {activeTab === 'parents' && <><Users className="mr-2 text-orange-600" /> Parent Portal Overview</>}
                                    {activeTab === 'admins' && <><Shield className="mr-2 text-slate-700" /> Administrative Controls</>}
                                </CardTitle>
                                <p className="text-sm text-slate-500 mt-1">
                                    {activeTab === 'students' && "Manage enrollments, disciplinary actions, and academic records."}
                                    {activeTab === 'staff' && "Oversee teaching staff, payroll, and performance reviews."}
                                    {activeTab === 'parents' && "Monitor parent engagement, PTA activities, and communications."}
                                    {activeTab === 'admins' && "Manage system access, audit logs, and global settings."}
                                </p>
                            </div>
                            <div>
                                {activeTab === 'students' && (
                                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center">
                                        <UserPlus className="w-4 h-4 mr-2" /> New Admission
                                    </button>
                                )}
                                {activeTab === 'staff' && (
                                    <button className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center">
                                        <UserPlus className="w-4 h-4 mr-2" /> Hire Staff
                                    </button>
                                )}
                                {activeTab === 'parents' && (
                                    <button className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 flex items-center">
                                        <MessageSquare className="w-4 h-4 mr-2" /> Broadcast SMS
                                    </button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Quick Action Buttons */}
                                <ActionCard
                                    title="View Full Directory"
                                    desc="Access the complete list of all records."
                                    icon={<FileText className="w-5 h-5" />}
                                    color="bg-slate-50 text-slate-600"
                                />

                                {activeTab === 'students' && (
                                    <>
                                        <ActionCard title="Attendance Report" desc="View class-wise attendance trends." icon={<UserCircle className="w-5 h-5" />} color="bg-blue-50 text-blue-600" />
                                        <ActionCard title="Disciplinary Log" desc="Review recent incidents and actions." icon={<Shield className="w-5 h-5" />} color="bg-red-50 text-red-600" />
                                    </>
                                )}

                                {activeTab === 'staff' && (
                                    <>
                                        <ActionCard title="Payroll Statistics" desc="View salary distribution and status." icon={<DollarSignIcon className="w-5 h-5" />} color="bg-green-50 text-green-600" />
                                        <ActionCard title="Performance Reviews" desc="Access teacher appraisal reports." icon={<GraduationCap className="w-5 h-5" />} color="bg-purple-50 text-purple-600" />
                                    </>
                                )}

                                {activeTab === 'parents' && (
                                    <>
                                        <ActionCard title="Fee Compliance" desc="Check parent payment statuses." icon={<Briefcase className="w-5 h-5" />} color="bg-orange-50 text-orange-600" />
                                        <ActionCard title="PTA Meeting Log" desc="Notes from recent PTA gatherings." icon={<Users className="w-5 h-5" />} color="bg-indigo-50 text-indigo-600" />
                                    </>
                                )}

                                {activeTab === 'admins' && (
                                    <>
                                        <ActionCard title="Security Audit Log" desc="Review system access logs." icon={<Shield className="w-5 h-5" />} color="bg-slate-100 text-slate-700" />
                                        <ActionCard title="System Settings" desc="Configure school-wide parameters." icon={<Briefcase className="w-5 h-5" />} color="bg-slate-100 text-slate-700" />
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
};

// Helper internal component
const DollarSignIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
);

const ActionCard = ({ title, desc, icon, color }: { title: string, desc: string, icon: React.ReactNode, color: string }) => (
    <button className="flex items-start p-4 rounded-xl border border-slate-200 hover:shadow-md transition-all text-left bg-white group">
        <div className={`p-3 rounded-lg mr-4 ${color} group-hover:scale-110 transition-transform`}>
            {icon}
        </div>
        <div>
            <h4 className="font-bold text-slate-800">{title}</h4>
            <p className="text-xs text-slate-500 mt-1">{desc}</p>
        </div>
    </button>
);
