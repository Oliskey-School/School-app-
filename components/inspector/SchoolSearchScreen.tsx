import React, { useState, useEffect } from 'react';
import {
    Search, Building2, Filter, X, MapPin, Users,
    TrendingUp, AlertCircle, CheckCircle, FileText,
    ChevronRight, Award, Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SchoolSearchScreenProps {
    onSelectSchool: (schoolId: number) => void;
    onBack: () => void;
}

export default function SchoolSearchScreen({ onSelectSchool, onBack }: SchoolSearchScreenProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [schools, setSchools] = useState<any[]>([]);
    const [filteredSchools, setFilteredSchools] = useState<any[]>([]);
    const [filters, setFilters] = useState({
        curriculum: 'all', // 'all', 'nigerian', 'british', 'dual'
        complianceStatus: 'all', // 'all', 'compliant', 'attention', 'non-compliant'
        region: 'all',
    });
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchSchools();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [searchQuery, filters, schools]);

    const fetchSchools = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('schools')
                .select(`
          *,
          students(count),
          teachers(count),
          inspections(
            id,
            inspection_date,
            overall_rating,
            status
          )
        `)
                .order('name');

            if (error) throw error;

            // Calculate compliance status for each school
            const schoolsWithCompliance = await Promise.all((data || []).map(async (school) => {
                const complianceStatus = await calculateComplianceStatus(school.id);
                return {
                    ...school,
                    complianceStatus,
                    studentCount: school.students?.[0]?.count || 0,
                    teacherCount: school.teachers?.[0]?.count || 0,
                    latestInspection: school.inspections?.[0] || null,
                };
            }));

            setSchools(schoolsWithCompliance);
        } catch (error) {
            console.error('Error fetching schools:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateComplianceStatus = async (schoolId: number) => {
        try {
            // Check for expired documents
            const { data: docs } = await supabase
                .from('school_documents')
                .select('*')
                .eq('school_id', schoolId);

            const hasExpiredDocs = docs?.some(doc =>
                doc.expiry_date && new Date(doc.expiry_date) < new Date()
            );

            // Check for unqualified teachers
            const { data: teachers } = await supabase
                .from('teachers')
                .select('curriculum_eligibility')
                .eq('school_id', schoolId);

            const hasUnqualified = teachers?.some(t => !t.curriculum_eligibility);

            // Determine status
            if (hasExpiredDocs || hasUnqualified) {
                return 'attention';
            }

            // More checks can be added here
            return 'compliant';
        } catch (error) {
            return 'unknown';
        }
    };

    const applyFilters = () => {
        let filtered = [...schools];

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(school =>
                school.name?.toLowerCase().includes(query) ||
                school.address?.toLowerCase().includes(query) ||
                school.school_code?.toLowerCase().includes(query)
            );
        }

        // Curriculum filter
        if (filters.curriculum !== 'all') {
            filtered = filtered.filter(school => {
                if (filters.curriculum === 'dual') {
                    return school.curriculum_type === 'Dual';
                }
                return school.curriculum_type?.toLowerCase() === filters.curriculum;
            });
        }

        // Compliance filter
        if (filters.complianceStatus !== 'all') {
            filtered = filtered.filter(school =>
                school.complianceStatus === filters.complianceStatus
            );
        }

        // Region filter (if you have region data)
        if (filters.region !== 'all') {
            filtered = filtered.filter(school => school.region === filters.region);
        }

        setFilteredSchools(filtered);
    };

    const getComplianceColor = (status: string) => {
        switch (status) {
            case 'compliant':
                return 'bg-emerald-100 text-emerald-700';
            case 'attention':
                return 'bg-amber-100 text-amber-700';
            case 'non-compliant':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-slate-100 text-slate-700';
        }
    };

    const getComplianceIcon = (status: string) => {
        switch (status) {
            case 'compliant':
                return <CheckCircle className="w-4 h-4" />;
            case 'attention':
                return <AlertCircle className="w-4 h-4" />;
            case 'non-compliant':
                return <X className="w-4 h-4" />;
            default:
                return <FileText className="w-4 h-4" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Loading schools...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={onBack}
                        className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium"
                    >
                        ← Back to Dashboard
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">Search Schools</h1>
                            <p className="text-slate-600">
                                {filteredSchools.length} school{filteredSchools.length !== 1 ? 's' : ''} found
                            </p>
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                            <Filter className="w-4 h-4" />
                            Filters
                            {showFilters && <X className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by school name, code, or address..."
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                        />
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="mb-6 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4">Filter Schools</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Curriculum Filter */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Curriculum Type
                                </label>
                                <select
                                    value={filters.curriculum}
                                    onChange={(e) => setFilters({ ...filters, curriculum: e.target.value })}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">All Curricula</option>
                                    <option value="nigerian">Nigerian Only</option>
                                    <option value="british">British Only</option>
                                    <option value="dual">Dual Curriculum</option>
                                </select>
                            </div>

                            {/* Compliance Status Filter */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Compliance Status
                                </label>
                                <select
                                    value={filters.complianceStatus}
                                    onChange={(e) => setFilters({ ...filters, complianceStatus: e.target.value })}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="compliant">✅ Compliant</option>
                                    <option value="attention">⚠️ Needs Attention</option>
                                    <option value="non-compliant">❌ Non-Compliant</option>
                                </select>
                            </div>

                            {/* Region Filter */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Region
                                </label>
                                <select
                                    value={filters.region}
                                    onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">All Regions</option>
                                    <option value="Lagos">Lagos</option>
                                    <option value="Abuja">Abuja</option>
                                    <option value="Port Harcourt">Port Harcourt</option>
                                    <option value="Kano">Kano</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredSchools.length > 0 ? (
                        filteredSchools.map((school) => (
                            <SchoolCard
                                key={school.id}
                                school={school}
                                onSelect={() => onSelectSchool(school.id)}
                                getComplianceColor={getComplianceColor}
                                getComplianceIcon={getComplianceIcon}
                            />
                        ))
                    ) : (
                        <div className="col-span-2 text-center py-16">
                            <Building2 className="w-20 h-20 mx-auto text-slate-300 mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 mb-2">No schools found</h3>
                            <p className="text-slate-600">
                                Try adjusting your search or filters
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// School Card Component
function SchoolCard({ school, onSelect, getComplianceColor, getComplianceIcon }: any) {
    return (
        <div
            onClick={onSelect}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer overflow-hidden group"
        >
            {/* Header */}
            <div className="p-6 border-b border-slate-100">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-2">
                            {school.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                            <MapPin className="w-4 h-4" />
                            <span>{school.address || 'Address not available'}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                                {school.curriculum_type || 'Nigerian'}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getComplianceColor(school.complianceStatus)}`}>
                                {getComplianceIcon(school.complianceStatus)}
                                {school.complianceStatus === 'compliant' && 'Compliant'}
                                {school.complianceStatus === 'attention' && 'Needs Attention'}
                                {school.complianceStatus === 'non-compliant' && 'Non-Compliant'}
                            </span>
                        </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
            </div>

            {/* Stats */}
            <div className="p-6 bg-slate-50/50">
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <Users className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                        <p className="text-2xl font-bold text-slate-900">{school.studentCount}</p>
                        <p className="text-xs text-slate-600">Students</p>
                    </div>
                    <div className="text-center">
                        <Award className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                        <p className="text-2xl font-bold text-slate-900">{school.teacherCount}</p>
                        <p className="text-xs text-slate-600">Teachers</p>
                    </div>
                    <div className="text-center">
                        <Calendar className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                        <p className="text-sm font-semibold text-slate-900">
                            {school.latestInspection?.inspection_date
                                ? new Date(school.latestInspection.inspection_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                : 'No Inspection'}
                        </p>
                        <p className="text-xs text-slate-600">Last Inspection</p>
                    </div>
                </div>
            </div>

            {/* Latest Inspection Rating */}
            {school.latestInspection?.overall_rating && (
                <div className="px-6 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-slate-100">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Latest Rating:</span>
                        <span className="font-bold text-indigo-600">
                            {school.latestInspection.overall_rating}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
