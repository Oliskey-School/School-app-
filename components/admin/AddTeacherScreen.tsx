import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import { 
    CameraIcon, 
    UserIcon, 
    MailIcon, 
    PhoneIcon, 
    BookOpenIcon, 
    UsersIcon, 
    XCircleIcon, 
    CheckCircleIcon, 
    ChevronDownIcon,
    ChevronRightIcon,
    SUBJECTS_LIST,
    DEFAULT_STANDARD_CLASSES,
    getFormattedClassName
} from '../../constants';
import { Teacher, DashboardType } from '../../types';
import { api } from '../../lib/api';
import { sendVerificationEmail } from '../../lib/auth';

// import { checkUserLimit } from '../../lib/usage-limits'; // Replaced by useTenantLimit
import CredentialsModal from '../ui/CredentialsModal';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useTenantLimit } from '../../hooks/useTenantLimit';
import { useAutoSync } from '../../hooks/useAutoSync';

import UpgradeModal from '../shared/UpgradeModal';

interface AddTeacherScreenProps {
    teacherToEdit?: Teacher;
    forceUpdate: () => void;
    handleBack: () => void;
    navigateTo?: (view: string, title: string, props?: any) => void;
}

const MultiSelect: React.FC<{
    label: string;
    selected: string[];
    setSelected: React.Dispatch<React.SetStateAction<string[]>>;
    placeholder: string;
    options: string[];
}> = ({ label, selected, setSelected, placeholder, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filterText, setFilterText] = useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleSelection = (option: string) => {
        if (selected.includes(option)) {
            setSelected(selected.filter(item => item !== option));
        } else {
            setSelected([...selected, option]);
        }
        setFilterText(''); // Reset filter after selection
    };

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(filterText.toLowerCase()) &&
        !selected.includes(opt)
    );

    return (
        <div className="relative" ref={containerRef}>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>

            {/* Main Input Container */}
            <div
                className="min-h-[42px] p-2 border border-gray-300 rounded-lg bg-gray-50 flex flex-wrap gap-2 items-center cursor-text focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all"
                onClick={() => setIsOpen(true)}
            >
                {/* Selected Tags */}
                <AnimatePresence initial={false}>
                {selected.map(item => (
                    <motion.span
                        key={item}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="flex items-center gap-1 bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-md"
                    >
                        {item}
                        <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleSelection(item); }}
                            className="text-blue-600 hover:text-blue-800 focus:outline-none"
                        >
                            <XCircleIcon className="w-4 h-4" />
                        </motion.button>
                    </motion.span>
                ))}
                </AnimatePresence>

                {/* Input Field */}
                <div className="flex-grow flex items-center min-w-[120px]">
                    <input
                        type="text"
                        value={filterText}
                        onChange={(e) => { setFilterText(e.target.value); setIsOpen(true); }}
                        onFocus={() => setIsOpen(true)}
                        placeholder={selected.length === 0 ? placeholder : ""}
                        className="w-full bg-transparent outline-none text-gray-700 placeholder-gray-400 text-sm"
                    />
                </div>

                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <motion.div
                                key={option}
                                whileHover={{ x: 2 }}
                                onClick={() => toggleSelection(option)}
                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 flex items-center justify-between transition-colors"
                            >
                                <span>{option}</span>
                            </motion.div>
                        ))
                    ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            {options.length === 0 ? "No options available" : "No matching options"}
                        </div>
                    )}
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};


const AddTeacherScreen: React.FC<AddTeacherScreenProps> = ({ teacherToEdit, forceUpdate, handleBack, navigateTo }) => {
    const { profile } = useProfile();
    const { currentSchool, currentBranchId, role } = useAuth();
    const { currentBranch, isMainAdmin: branchIsMain } = useBranch();

    // Branch governance: a teacher's profile (identity, qualifications, photo, login,
    // assigned branches) is editable only by the MAIN admin or the teacher's HOME branch.
    // A branch admin the teacher is merely lent to assigns classes/subjects/scheduling via
    // the Timetable & Class screens — not here. (The backend enforces this regardless.)
    const myBranchId = currentBranchId || (profile as any)?.branchId || null;
    // A main admin's branch_id is truthy (Main branch), so use the backend is_main_admin
    // signal (via BranchContext) instead of inferring from the branch id.
    const isMainAdmin = role === DashboardType.Proprietor || role === DashboardType.SuperAdmin
        || (role === DashboardType.Admin && branchIsMain !== false);
    const teacherHomeBranch = (teacherToEdit as any)?.branch_id || null;
    const canEditIdentity = !teacherToEdit || isMainAdmin || (!!myBranchId && myBranchId === teacherHomeBranch);

    // Triple-layer schoolId detection
    const schoolId = profile?.schoolId || currentSchool?.id;
    // Use the ACTIVE branch (the one the admin is currently viewing/switched into),
    // NOT their home branch — so a teacher created while viewing Lekki is created in
    // Lekki (correct branch ID, branch-scoped classes/subjects), not Main.
    const branchId = currentBranch?.id || currentBranchId || profile.branchId || null;

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [primaryCurriculum, setPrimaryCurriculum] = useState<'Nigerian' | 'British' | 'Both'>('Nigerian');
    const [subjects, setSubjects] = useState<string[]>([]);
    const [classes, setClasses] = useState<string[]>([]);
    const [status, setStatus] = useState<'Active' | 'Inactive' | 'On Leave'>('Active');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [branches, setBranches] = useState<string[]>([]);
    const [selectedBranchNames, setSelectedBranchNames] = useState<string[]>([]);
    const [branchIdMap, setBranchIdMap] = useState<Record<string, string>>({});

    // Phase 7: Curriculum & Compliance
    const [curriculumEligibility, setCurriculumEligibility] = useState<string[]>(['NIGERIAN']); // Default to Nigerian
    const [uploadedDocs, setUploadedDocs] = useState<File[]>([]);

    const [dbSubjects, setDbSubjects] = useState<any[]>([]);
    const [validClasses, setValidClasses] = useState<string[]>([]);
    const [classIdMap, setClassIdMap] = useState<Record<string, string>>({});
    const [subjectIdMap, setSubjectIdMap] = useState<Record<string, string>>({});
    const [loadingRefs, setLoadingRefs] = useState(true);

    // Dynamic subject filtering based on curriculum
    const filteredSubjectOptions = React.useMemo(() => {
        const dbNames = dbSubjects.map(s => s.name);
        let standardFiltered = SUBJECTS_LIST;
        
        if (primaryCurriculum === 'Nigerian') {
            standardFiltered = SUBJECTS_LIST.filter(s => s.curriculum === 'Nigerian' || s.curriculum === 'Both');
        } else if (primaryCurriculum === 'British') {
            standardFiltered = SUBJECTS_LIST.filter(s => s.curriculum === 'British' || s.curriculum === 'Both');
        }
        
        const standardNames = standardFiltered.map(s => s.name);
        return Array.from(new Set([...dbNames, ...standardNames])).sort();
    }, [dbSubjects, primaryCurriculum]);

    const [credentials, setCredentials] = useState<{
        username: string;
        password: string;
        email: string;
    } | null>(null);

    // Fetch Reference Data
    const fetchRefs = async () => {
        try {
            // Fetch Subjects from DB
            const sData = await api.getSubjects(schoolId, branchId || undefined);
            setDbSubjects(sData || []);
            
            const dbSubjectIdMap: Record<string, string> = {};
            if (sData) sData.forEach((s: any) => { dbSubjectIdMap[s.name] = s.id; });
            setSubjectIdMap(dbSubjectIdMap);

            // Keep branches clean: a teacher may only be given classes from THEIR OWN
            // branch(es). We fetch the active-branch classes, then HARD-filter to the
            // teacher's branch ids so another branch's class (e.g. an ikorodu class) can
            // never be assigned to a Lekki teacher. School-wide classes (no branch) stay.
            const teacherBranchIds: string[] = (() => {
                if (teacherToEdit) {
                    const assigned = (teacherToEdit as any).allowed_branch_ids;
                    if (Array.isArray(assigned) && assigned.length) return assigned as string[];
                    const home = (teacherToEdit as any).branch_id;
                    return home ? [home] : [];
                }
                return branchId ? [branchId] : [];
            })();
            const cDataRaw = await api.getClasses(schoolId, branchId || 'all', true);
            const cData = (cDataRaw || []).filter((c: any) => {
                const cb = c.branch_id ?? c.branch?.id ?? null;
                if (cb == null) return true;                     // school-wide class — always allowed
                if (teacherBranchIds.length === 0) return false; // unknown teacher branch → standard levels only
                return teacherBranchIds.includes(cb);
            });
            {
                const processedClasses = (cData || []).map((c: any) => ({
                    id: c.id,
                    grade: c.grade,
                    section: c.section || 'A',
                    displayName: (cData || []).filter((d: any) => d.name === c.name).length > 1 && c.branch
                        ? `${c.name} (${c.branch.name})`
                        : c.name
                }));

                const map: Record<string, string> = {};
                processedClasses.forEach((c: any) => { map[c.displayName] = c.id; });

                // Admin: also expose all 16 standard academic levels even when no class
                // record exists for them yet. Use a `__create__:grade:section` placeholder id;
                // it will be materialized on submit.
                const realKeys = new Set(processedClasses.map((p: any) => `${p.grade}:${p.section}`));
                DEFAULT_STANDARD_CLASSES.forEach(level => {
                    const key = `${level.grade}:${level.section}`;
                    if (!realKeys.has(key) && !map[level.name]) {
                        map[level.name] = `__create__:${level.grade}:${level.section}:`;
                    }
                });

                const allNames = [
                    ...DEFAULT_STANDARD_CLASSES.map(l => l.name),
                    ...processedClasses.map((p: any) => p.displayName).filter((n: string) => !DEFAULT_STANDARD_CLASSES.some(l => l.name === n))
                ];
                const uniqueNames = Array.from(new Set(allNames));
                setValidClasses(uniqueNames);
                setClassIdMap(map);
            }

            // Fetch Branches
            // Use the full branch list (labels only) so a home-branch admin can lend the
            // teacher to other branches — the backend allows main + home to assign branches.
            const bData = await api.getBranchOptions();
            if (bData) {
                const bNames = bData.map((b: any) => b.name);
                setBranches(bNames);
                const bMap: Record<string, string> = {};
                bData.forEach((b: any) => { bMap[b.name] = b.id; });
                setBranchIdMap(bMap);

                // Default selection if editing
                if (teacherToEdit) {
                    // Show ALL assigned branches. The previous expression had a
                    // precedence bug that always collapsed to just the home branch,
                    // so a second assigned branch (e.g. Lekki) never appeared here.
                    const assigned = (teacherToEdit as any).allowed_branch_ids;
                    const currentBranches = Array.isArray(assigned) && assigned.length > 0
                        ? assigned
                        : ((teacherToEdit as any).branch_id ? [(teacherToEdit as any).branch_id] : []);
                    const currentBranchNames = bData
                        .filter((b: any) => currentBranches.includes(b.id))
                        .map((b: any) => b.name);
                    setSelectedBranchNames(currentBranchNames);
                } else if (branchId) {
                    // New teacher defaults to the ADMIN's ACTIVE branch (e.g. Lekki),
                    // so they're created in the branch the admin is actually viewing.
                    const activeBranch = bData.find((b: any) => b.id === branchId);
                    if (activeBranch) setSelectedBranchNames([activeBranch.name]);
                }
            }
        } catch (err) {
            console.error("Error fetching reference data:", err);
        } finally {
            setLoadingRefs(false);
        }
    };

    useEffect(() => {
        fetchRefs();
    }, [schoolId, branchId]);

    useAutoSync(['subjects', 'classes'], () => {
        console.log('🔄 [AddTeacher] Real-time auto-sync triggered');
        fetchRefs();
    });

    useEffect(() => {
        if (teacherToEdit) {
            setName(teacherToEdit.name || (teacherToEdit as any).full_name || '');
            setEmail(teacherToEdit.email || '');
            setPhone(teacherToEdit.phone || '');
            
            // Handle subjects - try multiple fields and ensure strings - deduplicate by name
            const rawSubjects = teacherToEdit.subjects || (teacherToEdit as any).subject_specialty || (teacherToEdit as any).teacher_subjects || [];
            const mappedSubjects = rawSubjects.map((s: any) => {
                if (typeof s === 'string') return s;
                return s.subject || s.name || 'Unknown';
            });
            setSubjects(Array.from(new Set(mappedSubjects)));

            // Handle classes - normalize to names/strings - deduplicate by name
            const rawClasses = teacherToEdit.classes || (teacherToEdit as any).assigned_classes || [];
            const mappedClasses = rawClasses.map((c: any) => 
                typeof c === 'string' ? c : (c.class?.name || c.name || 'Unknown Class')
            );
            setClasses(Array.from(new Set(mappedClasses)));

            setStatus(teacherToEdit.status || 'Active');
            setAvatar(teacherToEdit.avatarUrl || (teacherToEdit as any).avatar_url || null);
            setPrimaryCurriculum((teacherToEdit as any).curriculum_type || 'Nigerian');
            
            if ((teacherToEdit as any).curriculum_eligibility) {
                setCurriculumEligibility((teacherToEdit as any).curriculum_eligibility.map((c: string) => c.toUpperCase()));
            }

            // Always refresh the assigned Subjects + Classes straight from the database.
            // The list row passed into this form usually has NO assignments, which is why
            // they showed empty when you re-opened it. Fetching the teacher's real record
            // makes the previously-assigned subjects/classes persist and display.
            const editId = (teacherToEdit as any).id;
            if (editId) {
                (async () => {
                    try {
                        const full: any = await api.getTeacherById(editId);
                        if (!full) return;
                        // Identity fields come straight from the teacher's HOME record, so a
                        // branch admin editing a lent teacher sees their real name/phone/etc.
                        // (read-only for them) instead of blank fields.
                        if (full.full_name || full.name) setName(full.full_name || full.name);
                        if (full.email || full.user?.email) setEmail(full.email || full.user?.email);
                        if (full.phone || full.user?.phone) setPhone(full.phone || full.user?.phone);
                        if (full.curriculum_type) setPrimaryCurriculum(full.curriculum_type);

                        const subs = (full.subjects || full.subject_specialty || [])
                            .map((s: any) => (typeof s === 'string' ? s : s?.subject || s?.name))
                            .filter(Boolean);
                        if (subs.length) setSubjects(Array.from(new Set(subs)) as string[]);
                        const cls = (full.classes || [])
                            .map((c: any) => (typeof c === 'string' ? c : c?.class?.name || c?.name))
                            .filter(Boolean);
                        if (cls.length) setClasses(Array.from(new Set(cls)) as string[]);

                        // Assigned Branches from the home record, mapped to names.
                        const allowed: string[] = (Array.isArray(full.allowed_branch_ids) && full.allowed_branch_ids.length)
                            ? full.allowed_branch_ids
                            : (full.branch_id ? [full.branch_id] : []);
                        if (allowed.length) {
                            const opts = await api.getBranchOptions().catch(() => []);
                            const names = (opts || []).filter((b: any) => allowed.includes(b.id)).map((b: any) => b.name);
                            if (names.length) setSelectedBranchNames(names);
                        }
                    } catch (e) {
                        console.warn('[AddTeacher] Could not refresh teacher data from DB:', e);
                    }
                })();
            }
        }
    }, [teacherToEdit]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => { setAvatar(reader.result as string); };
            reader.readAsDataURL(file);
        }
    };

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const { isLimitReached, currentCount, maxLimit } = useTenantLimit();

    const navigate = useNavigate();
    const navigateToSubscription = () => {
        setShowUpgradeModal(false);
        navigate('/subscription');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!teacherToEdit && isLimitReached) {
            setShowUpgradeModal(true);
            return;
        }

        setIsLoading(true);
        let currentTeacherId: string | null = null;
        let authResult: any = null;

        try {
            let avatarUrl = avatar;

            // Handle Photo Upload via API
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${Date.now()}_avatar.${fileExt}`;
                const filePath = `avatars/${fileName}`;

                try {
                    const uploadResult = await api.uploadFile('teacher-documents', filePath, avatarFile);
                    avatarUrl = (uploadResult.publicUrl || (uploadResult as any).url);
                } catch (uploadError) {
                    console.error("Failed to upload avatar:", uploadError);
                }
            }

            const curriculumData = curriculumEligibility.map(c => c === 'NIGERIAN' ? 'Nigerian' : 'British');
            
            // Shared Document Uploads
            const complianceDocs: Record<string, string> = {};
            if (uploadedDocs.length > 0) {
                for (const file of uploadedDocs) {
                    try {
                        const fileName = `${Date.now()}_${file.name}`;
                        let folder = 'general';
                        let dbField = '';
                        if (file.name.toLowerCase().includes('trcn')) { folder = 'trcn'; dbField = 'trcn_certificate'; }
                        else if (file.name.toLowerCase().includes('british') || file.name.toLowerCase().includes('qts')) { folder = 'british'; dbField = 'british_qualification'; }
                        else { folder = 'degree'; dbField = 'degree_certificate'; }

                        const uploadResult = await api.uploadFile('teacher-documents', `temp/${folder}/${fileName}`, file);
                        if (dbField) complianceDocs[dbField] = (uploadResult.publicUrl || (uploadResult as any).url);
                    } catch (err) { console.error("Doc upload failed:", err); }
                }
            }

            // Link each class to each subject for now to ensure availability
            const classSubjectLinks: any[] = [];
            // Resolve every ticked class name to a concrete (or virtual) class id.
            const updatedClassIdMap: Record<string, string> = { ...classIdMap };
            const classIds: string[] = [];
            for (const className of classes) {
                let cid = updatedClassIdMap[className];

                // A standard level (e.g. "SSS 1") that didn't resolve to a real class id —
                // either no "__create__" placeholder was set because a class for that
                // grade/section already exists under a DIFFERENT name, or the lookup
                // simply missed. Fall back to a `std-{grade}-{section}` virtual id: the
                // backend then links the EXISTING class for that grade/section (or creates
                // it once), instead of the assignment being silently dropped.
                const stdLevel = DEFAULT_STANDARD_CLASSES.find(l => l.name === className);
                if ((!cid || cid.startsWith('__create__:')) && stdLevel) {
                    cid = `std-${stdLevel.grade}-${stdLevel.section}`;
                    updatedClassIdMap[className] = cid;
                }

                // Non-standard placeholder (a custom class name) — materialize it directly.
                if (typeof cid === 'string' && cid.startsWith('__create__:')) {
                    const [, gradeStr, sectionStr] = cid.split(':');
                    const gradeNum = Number(gradeStr);
                    const sectionVal = sectionStr || 'A';
                    try {
                        const created = await api.createClass({
                            name: getFormattedClassName(gradeNum, sectionVal, true),
                            grade: gradeNum,
                            section: sectionVal,
                            school_id: schoolId,
                            branch_id: branchId || null,
                        });
                        if (created?.id) cid = created.id;
                    } catch (createErr: any) {
                        console.error('Failed to auto-create class', className, createErr);
                        toast.error(`Could not create ${className}: ${createErr.message || 'unknown error'}`);
                    }
                }

                if (cid && !cid.startsWith('__create__')) classIds.push(cid);
            }
            
            // Create missing subjects if any
            const updatedSubjectIdMap = { ...subjectIdMap };
            for (const subjectName of subjects) {
                if (!updatedSubjectIdMap[subjectName]) {
                    try {
                        const newSubject = await api.createSubject({ name: subjectName, school_id: schoolId });
                        updatedSubjectIdMap[subjectName] = newSubject.id;
                    } catch (err) {
                        console.error(`Failed to create subject ${subjectName}:`, err);
                    }
                }
            }
            
            // Deduplicate to avoid unique constraint errors in backend
            const uniqueClassIds = Array.from(new Set(classIds));
            const uniqueSubjectIds = Array.from(new Set(subjects.map(s => updatedSubjectIdMap[s]).filter(Boolean)));

            uniqueClassIds.forEach(classId => {
                if (uniqueSubjectIds.length > 0) {
                    uniqueSubjectIds.forEach(subjectId => {
                        classSubjectLinks.push({ classId, subjectId });
                    });
                } else {
                    classSubjectLinks.push(classId); // Fallback to just class ID
                }
            });

            // Branch admin (not home/main): can ONLY assign this teacher to classes &
            // subjects in THEIR branch. Identity is locked, so skip the full update and
            // save just the branch assignments (replaces this branch's links only).
            if (!canEditIdentity && teacherToEdit) {
                await api.assignTeacherBranchClasses(teacherToEdit.id, classSubjectLinks);
                toast.success('Classes & subjects assigned for this branch.');
                handleBack();
                return;
            }

            const payload = {
                full_name: name,
                email,
                phone,
                status,
                avatar_url: avatarUrl,
                branch_id: selectedBranchNames.length > 0 ? branchIdMap[selectedBranchNames[0]] : branchId,
                allowed_branch_ids: selectedBranchNames.map(name => branchIdMap[name]),
                curriculum_eligibility: curriculumData,
                curriculum_type: primaryCurriculum,
                subject_specialty: subjects, // Keep names for specialty display
                classes: classSubjectLinks,
                ...complianceDocs
            };

            if (teacherToEdit) {
                // UPDATE MODE
                await api.updateTeacher(teacherToEdit.id, payload);
                toast.success('Teacher updated successfully!');
                handleBack();
            } else {
                // CREATE MODE
                const createdTeacher = await api.createTeacher(payload);
                
                // Final Redirect/UI Feedback
                await sendVerificationEmail(name, email || '', 'School App');
                setCredentials({ 
                    username: createdTeacher.username, 
                    password: createdTeacher.initial_password, 
                    email: email || '' 
                });
                setShowCredentialsModal(true);
            }
        } catch (error: any) {
            console.error('❌ Error saving teacher:', error);
            toast.error('Failed to save teacher: ' + (error.message || 'Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                currentCount={currentCount}
                limit={maxLimit}
                onUpgrade={navigateToSubscription}
            />
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
                {!canEditIdentity && (
                    <div className="mx-4 mt-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                        This teacher's profile (name, email, qualifications) is managed by their home branch and is read-only here.
                        You <span className="font-semibold">can</span> assign them to <span className="font-semibold">Subjects &amp; Classes</span> for your branch below — saved separately from their other branches, and shown to them when they're in your branch.
                    </div>
                )}
                <main className={`flex-grow p-4 space-y-6 overflow-y-auto ${!canEditIdentity ? 'pointer-events-none select-none' : ''}`}>
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-100 shadow-sm">
                                {avatar ? (
                                    <img 
                                        src={avatar} 
                                        alt="Teacher" 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'T')}&background=random`;
                                        }}
                                    />
                                ) : (
                                    <UserIcon className="w-12 h-12 text-gray-400" />
                                )}
                            </div>
                            <motion.label
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.92 }}
                                htmlFor="photo-upload"
                                className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full border-2 border-white cursor-pointer hover:bg-blue-700 shadow-lg"
                            >
                                <CameraIcon className="text-white h-4 w-4" />
                                <input id="photo-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                            </motion.label>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                        <InputField id="name" label="Full Name" value={name} onChange={setName} icon={<UserIcon className="w-5 h-5" />} />
                        <InputField id="email" label="Email" value={email} onChange={setEmail} icon={<MailIcon className="w-5 h-5" />} type="email" />
                        <InputField id="phone" label="Phone" value={phone} onChange={setPhone} icon={<PhoneIcon className="w-5 h-5" />} type="tel" />

                        <div>
                            <label htmlFor="primaryCurriculum" className="block text-sm font-medium text-gray-700 mb-1">Primary Curriculum</label>
                            <select id="primaryCurriculum" value={primaryCurriculum} onChange={e => setPrimaryCurriculum(e.target.value as any)} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                                <option value="Nigerian">Nigerian</option>
                                <option value="British">British</option>
                                <option value="Both">Both</option>
                            </select>
                        </div>

                        <MultiSelect
                            label="Assigned Branches"
                            selected={selectedBranchNames}
                            setSelected={setSelectedBranchNames}
                            placeholder={loadingRefs ? "Loading branches..." : "Select branches..."}
                            options={branches}
                        />

                        {/* Subjects & Classes stay editable for a branch admin (identity above
                            is locked). For a branch admin we highlight + re-enable this block. */}
                        <div className={!canEditIdentity ? 'pointer-events-auto rounded-xl ring-2 ring-indigo-200 bg-indigo-50/30 p-3 space-y-4' : 'space-y-4'}>
                            {!canEditIdentity && <p className="text-xs font-semibold text-indigo-700">Assign for your branch</p>}
                            <MultiSelect
                                label="Subjects"
                                selected={subjects}
                                setSelected={setSubjects}
                                placeholder={loadingRefs ? "Loading subjects..." : "Select subjects..."}
                                options={filteredSubjectOptions}
                            />
                            <MultiSelect
                                label="Classes"
                                selected={classes}
                                setSelected={setClasses}
                                placeholder={loadingRefs ? "Loading classes..." : "Select classes..."}
                                options={validClasses}
                            />
                        </div>

                        {teacherToEdit && navigateTo && (
                            <motion.button
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={() => navigateTo('teacherAssignments', `${teacherToEdit.name || (teacherToEdit as any).full_name}'s Assignments`, {
                                    teacherId: teacherToEdit.id,
                                    teacherName: teacherToEdit.name || (teacherToEdit as any).full_name,
                                    handleBack,
                                })}
                                className="w-full flex items-center justify-between gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-600 rounded-lg">
                                        <UsersIcon className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-indigo-900 text-sm">Manage Class Teacher & Subject Teacher Roles</p>
                                        <p className="text-xs text-indigo-600">Formally assign this teacher, track workload, and view teaching history</p>
                                    </div>
                                </div>
                                <ChevronRightIcon className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                            </motion.button>
                        )}

                        {/* Curriculum Section */}
                        <div className="pt-2 border-t border-gray-100">
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Curriculum Eligibility <span className="text-red-500">*</span></label>
                            <div className="flex gap-4 mb-4">
                                <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${curriculumEligibility.includes('NIGERIAN') ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <input
                                        type="checkbox"
                                        checked={curriculumEligibility.includes('NIGERIAN')}
                                        onChange={e => {
                                            if (e.target.checked) setCurriculumEligibility([...curriculumEligibility, 'NIGERIAN']);
                                            else setCurriculumEligibility(curriculumEligibility.filter(c => c !== 'NIGERIAN'));
                                        }}
                                        className="rounded text-green-600 focus:ring-green-500"
                                    />
                                    <div>
                                        <span className="font-semibold text-gray-800 text-sm">Nigerian</span>
                                        <p className="text-xs text-gray-500">Requires TRCN</p>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${curriculumEligibility.includes('BRITISH') ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <input
                                        type="checkbox"
                                        checked={curriculumEligibility.includes('BRITISH')}
                                        onChange={e => {
                                            if (e.target.checked) setCurriculumEligibility([...curriculumEligibility, 'BRITISH']);
                                            else setCurriculumEligibility(curriculumEligibility.filter(c => c !== 'BRITISH'));
                                        }}
                                        className="rounded text-red-600 focus:ring-red-500"
                                    />
                                    <div>
                                        <span className="font-semibold text-gray-800 text-sm">British</span>
                                        <p className="text-xs text-gray-500">Requires QTS/Intl Cert</p>
                                    </div>
                                </label>
                            </div>

                            <label className="text-sm font-medium text-gray-700 mb-2 block">Compliance Documents</label>
                            
                            {/* Existing Documents Display */}
                            {teacherToEdit && ((teacherToEdit as any).trcn_certificate || (teacherToEdit as any).degree_certificate || (teacherToEdit as any).british_qualification) && (
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
                                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">Previously Uploaded Documents</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        {(teacherToEdit as any).trcn_certificate && (
                                            <div className="flex items-center justify-between text-xs bg-white p-2 rounded border border-blue-200">
                                                <span className="flex items-center gap-1"><CheckCircleIcon className="w-3 h-3 text-green-500" /> TRCN Certificate</span>
                                                <button type="button" onClick={() => window.open((teacherToEdit as any).trcn_certificate, '_blank')} className="text-blue-600 hover:underline">View</button>
                                            </div>
                                        )}
                                        {(teacherToEdit as any).degree_certificate && (
                                            <div className="flex items-center justify-between text-xs bg-white p-2 rounded border border-blue-200">
                                                <span className="flex items-center gap-1"><CheckCircleIcon className="w-3 h-3 text-green-500" /> Degree Certificate</span>
                                                <button type="button" onClick={() => window.open((teacherToEdit as any).degree_certificate, '_blank')} className="text-blue-600 hover:underline">View</button>
                                            </div>
                                        )}
                                        {(teacherToEdit as any).british_qualification && (
                                            <div className="flex items-center justify-between text-xs bg-white p-2 rounded border border-blue-200">
                                                <span className="flex items-center gap-1"><CheckCircleIcon className="w-3 h-3 text-green-500" /> British/QTS Cert</span>
                                                <button type="button" onClick={() => window.open((teacherToEdit as any).british_qualification, '_blank')} className="text-blue-600 hover:underline">View</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <motion.div whileTap={{ scale: 0.99 }} className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 hover:border-blue-300 transition-colors cursor-pointer" onClick={() => (document.getElementById('doc-upload') as HTMLInputElement)?.click()}>
                                <UsersIcon className="mx-auto h-8 w-8 text-gray-400" />
                                <p className="mt-1 text-sm text-gray-600">Click to upload TRCN / Certificates</p>
                                <p className="text-xs text-gray-400 mt-1">(PDF, JPG, PNG)</p>
                                <input id="doc-upload" type="file" multiple className="hidden" onChange={(e) => {
                                    if (e.target.files) setUploadedDocs(Array.from(e.target.files));
                                    toast.success("Documents selected for upload");
                                }} />
                                {uploadedDocs.length > 0 && (
                                    <div className="mt-2 text-left space-y-1">
                                        <p className="text-xs font-bold text-gray-400 uppercase">New Selection:</p>
                                        {uploadedDocs.map((file, i) => (
                                            <p key={i} className="text-xs text-green-600 flex items-center gap-1">
                                                <CheckCircleIcon className="w-3 h-3" /> {file.name}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select id="status" value={status} onChange={e => setStatus(e.target.value as 'Active' | 'Inactive' | 'On Leave')} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                                <option value="Active">Active</option>
                                <option value="On Leave">On Leave</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </main>
                <div className="p-4 mt-auto bg-gray-50">
                    <motion.button
                        whileHover={!isLoading ? { scale: 1.01 } : {}}
                        whileTap={!isLoading ? { scale: 0.98 } : {}}
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex justify-center py-3 px-4 rounded-lg text-white ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} transition-colors`}
                    >
                        {isLoading ? 'Saving...' : (!canEditIdentity ? 'Assign Classes & Subjects to my branch' : (teacherToEdit ? 'Update Teacher' : 'Save Teacher'))}
                    </motion.button>
                </div>
            </form>

            {credentials && (
                <CredentialsModal
                    isOpen={showCredentialsModal}
                    userName={name}
                    username={credentials.username}
                    password={credentials.password}
                    email={credentials.email}
                    userType="Teacher"
                    onClose={() => {
                        setShowCredentialsModal(false);
                        forceUpdate();
                        handleBack();
                    }}
                />
            )}
        </div>
    );
};

const InputField: React.FC<{ id: string, label: string, value: string, onChange: (val: string) => void, icon: React.ReactNode, type?: string }> = ({ id, label, value, onChange, icon, type = 'text' }) => (
    <div>
        <label htmlFor={id} className="text-sm font-medium text-gray-600 sr-only">{label}</label>
        <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">{icon}</span>
            <input type={type} name={id} id={id} value={value} onChange={e => onChange(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder={label} required />
        </div>
    </div>
);

export default AddTeacherScreen;
