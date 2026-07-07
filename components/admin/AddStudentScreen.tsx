import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Phone as PhoneIcon, Mail as MailIcon, Camera as CameraIcon, X as XMarkIcon, AlertTriangle as ExclamationTriangleIcon, Search as SearchIcon, CheckCircle as CheckCircleIcon, ChevronDown as ChevronDownIcon } from 'lucide-react';
import { Student, Department } from '../../types';
import { api } from '../../lib/api';
import { compressImage } from '../../lib/imageCompression';
import { useAutoSync } from '../../hooks/useAutoSync';
import { SUBJECTS_LIST, DEFAULT_STANDARD_CLASSES, getFormattedClassName } from '../../constants';

import { createUserAccount, generateUsername, generatePassword, sendVerificationEmail, checkEmailExists } from '../../lib/auth';
import CredentialsModal from '../ui/CredentialsModal';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useTenantLimit } from '../../hooks/useTenantLimit';
import UpgradeModal from '../shared/UpgradeModal';

// Standard Nigerian curriculum used as a fallback when a class has no subjects
// configured yet (names match SUBJECTS_LIST). The class's own configured subjects
// take precedence when present.
const AUTO_SUBJECTS = {
    primary: ['Mathematics', 'English Studies', 'Basic Science and Technology (BST)', 'Social Studies', 'Civic Education', 'Cultural and Creative Arts (CCA)', 'Physical and Health Education (PHE)', 'Computer Studies/ICT'],
    junior: ['Mathematics', 'English Studies', 'Basic Science and Technology (BST)', 'Social Studies', 'Civic Education', 'Cultural and Creative Arts (CCA)', 'Physical and Health Education (PHE)', 'Computer Studies/ICT', 'Business Studies', 'Agricultural Science', 'Christian Religious Studies (CRS)'],
    seniorCore: ['English Language', 'General Mathematics', 'Civic Education', 'Computer Studies/ICT'],
    science: ['Physics', 'Chemistry', 'Biology', 'Further Mathematics', 'Agricultural Science'],
    commercial: ['Financial Accounting', 'Commerce', 'Economics', 'Business Studies', 'Office Practice'],
    arts: ['Literature-in-English', 'Government', 'History', 'Christian Religious Studies (CRS)', 'Geography'],
};

interface AddStudentScreenProps {
    studentToEdit?: Student;
    forceUpdate: () => void;
    handleBack: () => void;
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
                className="min-h-[42px] p-2 border border-gray-300 rounded-lg bg-gray-50 flex flex-wrap gap-2 items-center cursor-text focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all"
                onClick={() => setIsOpen(true)}
            >
                {/* Selected Tags */}
                {selected.map(item => (
                    <span key={item} className="flex items-center gap-1 bg-indigo-100 text-indigo-800 text-sm font-medium px-2 py-1 rounded-md">
                        {item}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleSelection(item); }}
                            className="text-indigo-600 hover:text-indigo-800 focus:outline-none"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </span>
                ))}

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
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <div
                                key={option}
                                onClick={() => toggleSelection(option)}
                                className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-gray-700 flex items-center justify-between"
                            >
                                <span>{option}</span>
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            {options.length === 0 ? "No options available" : "No matching options"}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const AddStudentScreen: React.FC<AddStudentScreenProps> = ({ studentToEdit, forceUpdate, handleBack }) => {
    const { profile, refreshProfile } = useProfile();
    const { currentSchool, currentBranchId, user } = useAuth(); // Added user and currentBranchId
    const { currentBranch } = useBranch();
    // The branch the admin is ACTIVELY viewing — new students are created here, not
    // in the admin's home branch. (Falls back to home branch if none is active.)
    const activeBranchId = currentBranch?.id || currentBranchId;

    // Triple-layer schoolId detection
    const schoolId = profile?.schoolId || currentSchool?.id;

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [fullName, setFullName] = useState('');
    const [gender, setGender] = useState('');
    const [birthday, setBirthday] = useState('');
    const [selectedBusId, setSelectedBusId] = useState<string | null>((studentToEdit as any)?.schoolBusId || null);
    const [buses, setBuses] = useState<any[]>([]); // State to store fetched buses
    const [loadingBuses, setLoadingBuses] = useState(true);
    const [department, setDepartment] = useState<Department | ''>('');
    const [curriculumType, setCurriculumType] = useState<'Nigerian' | 'British' | 'Both'>('Nigerian');
    const [isLoading, setIsLoading] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [credentials, setCredentials] = useState<{
        username: string;
        password: string;
        email: string;
        studentId?: string;
        secondary?: {
            userName: string;
            username: string;
            password: string;
            email: string;
            userType: string;
        };
    } | null>(null);

    const [guardianName, setGuardianName] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');
    const [guardianEmail, setGuardianEmail] = useState('');
    const [availableParents, setAvailableParents] = useState<any[]>([]);
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
    const [searchParentTerm, setSearchParentTerm] = useState('');
    const [parentImageErrors, setParentImageErrors] = useState<Record<string, boolean>>({});
    const [showNewParentForm, setShowNewParentForm] = useState(true);
    const [admissionNumber, setAdmissionNumber] = useState(''); // ⚠️ Added orphaned field
    const [studentAddress, setStudentAddress] = useState(''); // ⚠️ Added orphaned field
    const [subjects, setSubjects] = useState<string[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [branchNameMap, setBranchNameMap] = useState<Record<string, string>>({});
    const [allClasses, setAllClasses] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>(activeBranchId || '');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    // For a NEW student, lock onto the admin's active branch once it resolves (the
    // branch context can load a beat after the form mounts). Won't override edits.
    const branchAutoSetRef = React.useRef(false);
    useEffect(() => {
        if (studentToEdit) return;
        if (currentBranch?.id && !branchAutoSetRef.current) {
            setSelectedBranchId(currentBranch.id);
            branchAutoSetRef.current = true;
        }
    }, [currentBranch?.id, studentToEdit]);

    // Subject options come from the SCHOOL's own subject rows — anything the
    // admin adds (e.g. in the timetable builder) appears here immediately, and
    // deleted subjects vanish. Falls back to the static curriculum catalog only
    // while the school list hasn't loaded.
    const [schoolSubjects, setSchoolSubjects] = useState<string[]>([]);
    useEffect(() => {
        if (!schoolId) return;
        let active = true;
        const loadSchoolSubjects = async () => {
            try {
                const subs = await api.getSubjects(schoolId, currentBranchId && currentBranchId !== 'all' ? currentBranchId : undefined);
                if (!active) return;
                setSchoolSubjects(
                    (Array.isArray(subs) ? subs : [])
                        .map((s: any) => (typeof s === 'string' ? s : s?.name))
                        .filter(Boolean)
                );
            } catch { /* fall back to catalog below */ }
        };
        loadSchoolSubjects();
        const onUpdate = (e: any) => { if (e?.detail?.table === 'subjects') loadSchoolSubjects(); };
        window.addEventListener('realtime-update', onUpdate);
        return () => { active = false; window.removeEventListener('realtime-update', onUpdate); };
    }, [schoolId, currentBranchId]);

    const filteredSubjectOptions = useMemo(() => {
        if (schoolSubjects.length > 0) {
            return Array.from(new Set(schoolSubjects)).sort();
        }
        let standardFiltered = SUBJECTS_LIST;

        if (curriculumType === 'Nigerian') {
            standardFiltered = SUBJECTS_LIST.filter(s => s.curriculum === 'Nigerian' || s.curriculum === 'Both');
        } else if (curriculumType === 'British') {
            standardFiltered = SUBJECTS_LIST.filter(s => s.curriculum === 'British' || s.curriculum === 'Both');
        }

        return standardFiltered.map(s => s.name).sort();
    }, [curriculumType, schoolSubjects]);

    const isTeacherRole = useMemo(() => {
        const r = String(profile?.role || '').toUpperCase();
        return r === 'TEACHER';
    }, [profile?.role]);

    const branchScopedClasses = useMemo(() => {
        if (!selectedBranchId) return allClasses;
        return allClasses.filter(cls => cls.branch_id === selectedBranchId || cls.branch_id === null);
    }, [allClasses, selectedBranchId]);

    // Admins see ALL 16 standard academic levels in the dropdown — even ones with no class
    // record yet. For those, we emit a placeholder id (`__create__:grade:section:branch`)
    // and materialize a real class record on submit. Teachers keep the assigned-only view.
    const availableClasses = useMemo(() => {
        const branchId = selectedBranchId || null;
        const existingByKey = new Map<string, any>();
        branchScopedClasses.forEach(cls => {
            const key = `${cls.grade}:${cls.section || 'A'}`;
            existingByKey.set(key, cls);
        });

        const merged: any[] = [];
        DEFAULT_STANDARD_CLASSES.forEach(level => {
            const key = `${level.grade}:${level.section}`;
            const existing = existingByKey.get(key);
            if (existing) {
                merged.push(existing);
            } else {
                merged.push({
                    id: `__create__:${level.grade}:${level.section}:${branchId || ''}`,
                    name: level.name,
                    grade: level.grade,
                    section: level.section,
                    branch_id: branchId,
                    studentCount: 0,
                    _pendingCreate: true,
                });
            }
        });

        // Append extra sections (e.g. SSS 1-B) that exist but aren't in the standard list.
        branchScopedClasses.forEach(cls => {
            const key = `${cls.grade}:${cls.section || 'A'}`;
            if (!DEFAULT_STANDARD_CLASSES.some(l => `${l.grade}:${l.section}` === key)) {
                merged.push(cls);
            }
        });

        return merged;
    }, [branchScopedClasses, selectedBranchId, isTeacherRole]);

    const grade = useMemo(() => {
        if (selectedClassIds.length === 0) return 0;
        const primaryClass = availableClasses.find(c => c.id === selectedClassIds[0]);
        return primaryClass?.grade || 0;
    }, [selectedClassIds, availableClasses]);

    const section = useMemo(() => {
        if (selectedClassIds.length === 0) return '';
        const primaryClass = availableClasses.find(c => c.id === selectedClassIds[0]);
        return primaryClass?.section || 'A';
    }, [selectedClassIds, availableClasses]);

    // Auto-select the subjects a student will offer based on the chosen (primary) class
    // and department. Uses the class's CONFIGURED subjects when present; otherwise falls
    // back to the standard curriculum for that level. The admin/teacher can add/remove after.
    const autoFillKey = `${selectedClassIds[0] || ''}|${department || ''}|${curriculumType || ''}`;
    useEffect(() => {
        const primaryClass = availableClasses.find(c => c.id === selectedClassIds[0]);
        if (!primaryClass) return;

        const gradeNum = Number(primaryClass.grade) || 0;
        const level: 'senior' | 'junior' | 'primary' = gradeNum >= 10 ? 'senior' : gradeNum >= 7 ? 'junior' : 'primary';
        const valid = new Set(filteredSubjectOptions);
        const keep = (names: string[]) => Array.from(new Set(names.filter(n => valid.has(n))));

        const applyFallback = () => {
            let names: string[];
            if (level === 'senior') {
                names = [...AUTO_SUBJECTS.seniorCore];
                const dep = String(department || '').toLowerCase();
                if (dep.includes('science')) names = names.concat(AUTO_SUBJECTS.science);
                else if (dep.includes('commerc') || dep.includes('business')) names = names.concat(AUTO_SUBJECTS.commercial);
                else if (dep.includes('art') || dep.includes('human')) names = names.concat(AUTO_SUBJECTS.arts);
            } else if (level === 'junior') {
                names = [...AUTO_SUBJECTS.junior];
            } else {
                names = [...AUTO_SUBJECTS.primary];
            }
            setSubjects(keep(names));
        };

        const isRealClass = primaryClass.id && !String(primaryClass.id).startsWith('__create__');
        if (isRealClass) {
            api.getClassSubjects(primaryClass.id)
                .then((rows: any[]) => {
                    const names = Array.isArray(rows) ? rows.map((s: any) => s?.name).filter(Boolean) : [];
                    if (names.length) setSubjects(keep(names));
                    else applyFallback();
                })
                .catch(() => applyFallback());
        } else {
            applyFallback();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoFillKey]);

    useEffect(() => {
        if (studentToEdit) {
            setAdmissionNumber(studentToEdit.admission_number || '');
        } else if (schoolId) {
            api.getNextAdmissionNumber()
                .then(res => setAdmissionNumber(res.admissionNumber))
                .catch(err => console.error("Error pre-fetching admission number:", err));
        }
    }, [schoolId, studentToEdit]);

    useEffect(() => {
        const loadParents = async () => {
            if (schoolId) {
                try {
                    const data = await api.getParents(schoolId, currentBranchId || undefined);
                    setAvailableParents(data || []);
                } catch (err) {
                    console.error("Error loading parents:", err);
                }
            }
        };
        loadParents();
    }, [schoolId, currentBranchId]);

    useEffect(() => {
        if (!schoolId) {
            console.log("School ID missing in profile/auth, refreshing...");
            refreshProfile();
        }
    }, [refreshProfile, schoolId]);

    useEffect(() => {
        const loadClasses = async () => {
            try {
                const classes = await api.getClasses(schoolId, 'all', true, true);
                setAllClasses(classes || []);
            } catch (err) {
                console.error("Error loading classes:", err);
            }
        };
        if (schoolId) loadClasses();
    }, [schoolId, currentBranchId]);

    useAutoSync(['classes'], () => {
        const loadClasses = async () => {
            try {
                const classes = await api.getClasses(schoolId, 'all', true, true);
                setAllClasses(classes || []);
            } catch (err) {
                console.error("Error loading classes:", err);
            }
        };
        if (schoolId) loadClasses();
    });

    // Load buses for the school
    useEffect(() => {
        const loadBuses = async () => {
            if (!schoolId) return;
            setLoadingBuses(true);
            try {
                const busesData = await api.getBuses(schoolId, currentBranchId || undefined);
                setBuses(busesData || []);
            } catch (err) {
                console.error("Error loading buses:", err);
            } finally {
                setLoadingBuses(false);
            }
        };
        loadBuses();
    }, [schoolId, currentBranchId]);

    // Auto-sync buses
    useAutoSync(['transport_buses'], () => {
        const loadBuses = async () => {
            if (!schoolId) return;
            try {
                const busesData = await api.getBuses(schoolId, currentBranchId || undefined);
                setBuses(busesData || []);
            } catch (err) {
                console.error("Error loading buses:", err);
            }
        };
        loadBuses();
    });

    useAutoSync(['parents'], () => {
        if (schoolId) {
            const loadParents = async () => {
                try {
                    const data = await api.getParents(schoolId, currentBranchId || undefined);
                    setAvailableParents(data || []);
                } catch (err) {
                    console.error("Error loading parents:", err);
                }
            };
            loadParents();
        }
    });

    useEffect(() => {
        const loadBranches = async () => {
            if (schoolId) {
                try {
                    const data = await api.getBranches(schoolId);
                    setBranches(data || []);
                    setBranchNameMap((data || []).reduce((acc: Record<string, string>, branch: any) => {
                        if (branch?.id && branch?.name) acc[branch.id] = branch.name;
                        return acc;
                    }, {}));
                    if (!selectedBranchId && data.length > 0) {
                        setSelectedBranchId(data[0].id);
                    }
                } catch (err) {
                    console.error("Error loading branches:", err);
                }
            }
        };
        loadBranches();
    }, [schoolId]);

    useEffect(() => {
        if (allClasses.length === 0) return;
        setSelectedClassIds(prevSelected => prevSelected.filter(id => availableClasses.some(cls => cls.id === id)));
    }, [selectedBranchId, availableClasses, allClasses.length]);

    useEffect(() => {
        if (!studentToEdit) return;
        
        const loadFreshData = async () => {
            setIsLoading(true);
            try {
                const studentData = await api.getStudentById(studentToEdit.id);
                if (studentData) {
                    setSelectedImage(studentData.avatarUrl || studentData.avatar_url || null);
                    setFullName(studentData.name || studentData.full_name || '');
                    
                    // Format DOB for HTML date input (YYYY-MM-DD)
                    const rawDob = studentData.dob || studentData.birthday || studentData.dateOfBirth || '';
                    if (rawDob) {
                        try {
                            const dateObj = new Date(rawDob);
                            if (!isNaN(dateObj.getTime())) {
                                setBirthday(dateObj.toISOString().split('T')[0]);
                            }
                        } catch (e) {
                            console.warn('Failed to parse DOB:', rawDob);
                        }
                    }
                    
                    setDepartment(studentData.department || '');
                    setCurriculumType((studentData as any).curriculum_type || 'Nigerian');
                    setAdmissionNumber(studentData.admission_number || '');
                    setStudentAddress(studentData.address || '');
                    setGender(studentData.gender || '');
                    setSelectedBusId(studentData.school_bus_id || (studentData as any).schoolBusId || null);
                    setSelectedBranchId(studentData.branch_id || '');

                    // Set Enrollments
                    if (studentData.enrollments) {
                        setSelectedClassIds(studentData.enrollments.map((e: any) => e.class_id));
                    }

                    // Set Guardian Info
                    if (studentData.parents && studentData.parents.length > 0) {
                        const p = studentData.parents[0].parent;
                        if (p) {
                            setSelectedParentId(p.id);
                            setGuardianName(p.full_name || p.name || '');
                            setGuardianEmail(p.email || '');
                            setGuardianPhone(p.phone || '');
                            setShowNewParentForm(false);
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching fresh student data:", err);
                toast.error("Failed to load student details");
            } finally {
                setIsLoading(false);
            }
        };

        loadFreshData();
    }, [studentToEdit]);

    const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            try {
                // Shrink the photo before embedding so it always fits the upload limit.
                setSelectedImage(await compressImage(file));
            } catch {
                const reader = new FileReader();
                reader.onloadend = () => setSelectedImage(reader.result as string);
                reader.readAsDataURL(file);
            }
        }
    };
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    // Cap students at the PAID capacity (per-student billing) — adding beyond it prompts
    // to pay for more seats, instead of the generic all-users limit.
    const { isLimitReached, currentCount, maxLimit, isPremium } = useTenantLimit('students');

    const navigate = useNavigate();
    const navigateToSubscription = () => {
        setShowUpgradeModal(false);
        navigate('/subscription');
    };

    const filteredParents = useMemo(() => {
        const term = searchParentTerm.toLowerCase();
        return availableParents.filter(p => {
            const name = p.name || p.full_name || '';
            const email = p.email || '';
            const sid = p.school_generated_id || '';
            return name.toLowerCase().includes(term) || 
                   email.toLowerCase().includes(term) || 
                   sid.toLowerCase().includes(term);
        });
    }, [availableParents, searchParentTerm]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        console.log('🚀 [AddStudentScreen] Form Submitted. schoolId:', schoolId);
        console.log('🚀 [AddStudentScreen] isLimitReached:', isLimitReached, 'currentCount:', currentCount, 'maxLimit:', maxLimit);

        if (!studentToEdit && isLimitReached) {
            console.warn('🚨 [AddStudentScreen] Limit reached. Showing upgrade modal.');
            setShowUpgradeModal(true);
            setIsLoading(false);
            return;
        }

        if (selectedClassIds.length === 0) {
            console.warn('🚨 [AddStudentScreen] No classes selected.');
            toast.error('Please select at least one class for enrollment.');
            setIsLoading(false);
            return;
        }

        try {
            // Materialize any "__create__" placeholder class ids into real Class records
            // so the admin can enroll into a standard academic level that didn't exist yet.
            const resolvedClassIds: string[] = [];
            for (const cid of selectedClassIds) {
                if (typeof cid === 'string' && cid.startsWith('__create__:')) {
                    const [, gradeStr, sectionStr, branchStr] = cid.split(':');
                    const gradeNum = Number(gradeStr);
                    const sectionVal = sectionStr || 'A';
                    const levelDef = DEFAULT_STANDARD_CLASSES.find(l => l.grade === gradeNum && l.section === sectionVal);
                    try {
                        const created = await api.createClass({
                            name: levelDef?.name || getFormattedClassName(gradeNum, sectionVal, true),
                            grade: gradeNum,
                            section: sectionVal,
                            school_id: schoolId,
                            branch_id: branchStr || selectedBranchId || null,
                        });
                        if (created?.id) resolvedClassIds.push(created.id);
                    } catch (createErr: any) {
                        console.error('Failed to auto-create class', cid, createErr);
                        toast.error(`Could not create ${levelDef?.name || 'class'}: ${createErr.message || 'unknown error'}`);
                        setIsLoading(false);
                        return;
                    }
                } else {
                    resolvedClassIds.push(cid);
                }
            }
            // Use resolved ids from this point on
            const selectedClassIdsForSubmit = resolvedClassIds;

            const avatarUrl = selectedImage || `https://i.pravatar.cc/150?u=${fullName.replace(' ', '')}`;
            const [firstName, ...lastNameParts] = fullName.split(' ');
            const lastName = lastNameParts.join(' ') || '.';

            const studentData = {
                firstName,
                lastName,
                fullName,
                email: !studentToEdit ? `${fullName.toLowerCase().replace(/\s+/g, '.')}@student.school.com` : undefined,
                gender: gender || undefined,
                dob: birthday,
                grade,
                branch_id: selectedBranchId,
                admission_number: admissionNumber,
                section,
                class_id: selectedClassIdsForSubmit[0],
                selectedClassIds: selectedClassIdsForSubmit,
                department,
                curriculum_type: curriculumType,
                school_id: schoolId,
                address: studentAddress,
                avatar_url: avatarUrl, // persisted to the student + user so the photo shows everywhere
                subjects: subjects, // per-student subject assignment (admin-picked)
                schoolBusId: selectedBusId || undefined,
                parentId: !showNewParentForm ? selectedParentId : undefined,
                parentName: showNewParentForm ? guardianName : undefined,
                parentEmail: showNewParentForm ? guardianEmail : undefined,
                parentPhone: showNewParentForm ? guardianPhone : undefined,
                documentUrls: { passportPhoto: avatarUrl }
            };

            console.log('🚀 [AddStudentScreen] studentData:', JSON.stringify(studentData, null, 2));

            if (studentToEdit) {
                // UPDATE
                console.log('🚀 [AddStudentScreen] Updating student:', studentToEdit.id, {
                    full_name: fullName,
                    dob: birthday,
                    school_id: schoolId,
                    address: studentAddress,
                    admission_number: admissionNumber,
                    schoolBusId: selectedBusId
                });
                await api.updateStudent(studentToEdit.id, {
                    full_name: fullName,
                    dob: birthday ? new Date(birthday).toISOString() : null,
                    avatar_url: avatarUrl,
                    gender: gender || null,
                    department: department || null,
                    branch_id: currentBranchId || profile?.branchId || null,
                    school_id: schoolId,
                    address: studentAddress || null,
                    admission_number: admissionNumber || null,
                    school_bus_id: selectedBusId || null,
                    subjects: subjects, // per-student subject assignment (admin-picked)
                } as any);

                // Sync Enrollments
                await api.syncStudentClasses(studentToEdit.id, selectedClassIdsForSubmit);

                // Guardian Update
                if (!showNewParentForm && selectedParentId) {
                    try {
                        await api.linkParentToChildUnique(selectedParentId, studentToEdit.id, schoolId);
                    } catch (linkErr) {
                        console.warn('⚠️ Non-critical error linking guardian:', linkErr);
                        // We swallow this error because the student update itself was successful
                    }
                }

                const isTeacher = profile.role === 'teacher' || profile.role === 'TEACHER';
                toast.success(isTeacher 
                    ? 'Student enrollment submitted and pending admin approval.' 
                    : 'Student enrolled successfully.');
            } else {
                // CREATE via Backend
                console.log('🚀 [AddStudentScreen] Calling api.enrollStudent with data:', JSON.stringify(studentData));
                const result = await api.enrollStudent(studentData);
                console.log('🚀 [AddStudentScreen] Enrollment result received:', JSON.stringify(result));

                if (result.status === 'Pending') {
                    console.log('🚀 [AddStudentScreen] Status is Pending. Showing toast.');
                    toast.success('Student added successfully. Awaiting Admin approval.');
                } else {
                    console.log('🚀 [AddStudentScreen] Status is Active. Showing CredentialsModal.');
                    setCredentials({
                        username: result.username || result.email,
                        password: result.password,
                        email: result.email,
                        studentId: result.school_generated_id || result.schoolGeneratedId,
                        secondary: result.parentCredentials ? {
                            userName: result.parentCredentials.userName,
                            username: result.parentCredentials.username,
                            password: result.parentCredentials.password,
                            email: result.parentCredentials.email,
                            userType: 'Parent'
                        } : undefined
                    });
                    setShowCredentialsModal(true);
                    setIsLoading(false);
                    return;
                }
            }

            console.log('🚀 [AddStudentScreen] Completing submission, calling handleBack.');
            forceUpdate();
            handleBack();
        } catch (error: any) {
            console.error('Error saving student:', error);
            toast.error('Failed to save student: ' + (error.message || 'Unknown error'));
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="ml-3 text-lg text-gray-600">Loading student data...</div>
            </div>
        );
    }

    // New Block: Prevent form usage if School ID is missing
    if (!schoolId) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-amber-50 rounded-2xl border border-amber-100 m-4 shadow-sm">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                    <ExclamationTriangleIcon className="w-8 h-8 text-amber-600" />
                </div>
                <div className="text-xl font-bold text-slate-800 mb-2">Tenancy Handshake Missing</div>
                <p className="text-slate-600 mb-6 text-center max-w-xs text-sm">
                    We've detected you're logged in, but your session hasn't been linked to your school profile yet.
                </p>
                <div className="flex flex-col w-full space-y-3">
                    <button
                        onClick={async () => {
                            setIsLoading(true);
                            await refreshProfile();
                            setIsLoading(false);
                        }}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                    >
                        Sync School Profile
                    </button>
                    <button
                        onClick={handleBack}
                        className="w-full py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all active:scale-95"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                currentCount={currentCount}
                limit={maxLimit}
                isPaidCapacity={isPremium}
                onUpgrade={navigateToSubscription}
            />
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
                <main className="flex-grow p-4 space-y-6 overflow-y-auto">
                    {/* Photo Upload */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center">
                                {selectedImage ? (
                                    <img src={selectedImage} alt="Student" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <UserIcon className="w-12 h-12 text-gray-400" />
                                )}
                            </div>
                            <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-indigo-600 p-2 rounded-full border-2 border-white cursor-pointer hover:bg-indigo-700">
                                <CameraIcon className="text-white h-4 w-4" />
                                <input id="photo-upload" name="photo-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Student Information Section */}
                        <div className="space-y-4">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <h3 className="font-bold text-indigo-800">Student Information</h3>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                                <div>
                                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><UserIcon className="w-5 h-5" /></span>
                                        <input type="text" name="fullName" id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" placeholder="Adebayo Adewale" required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                        <select id="gender" name="gender" value={gender} onChange={e => setGender(e.target.value)} className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                                            <option value="">Select Gender...</option>
                                            <option>Male</option>
                                            <option>Female</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                                        <input type="date" name="birthday" id="birthday" value={birthday} onChange={e => setBirthday(e.target.value)} className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="Date of Birth" />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="branchId" className="block text-sm font-medium text-gray-700 mb-1">Assigned Branch</label>
                                    <select 
                                        id="branchId" 
                                        name="branchId" 
                                        value={selectedBranchId} 
                                        onChange={e => setSelectedBranchId(e.target.value)} 
                                        className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                    >
                                        <option value="">Select Branch...</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-xs text-gray-400 italic">Students are permanently locked to their assigned branch.</p>
                                </div>
                                <div>
                                    <label htmlFor="curriculumType" className="block text-sm font-medium text-gray-700 mb-1">Primary Curriculum</label>
                                    <select id="curriculumType" value={curriculumType} onChange={e => setCurriculumType(e.target.value as any)} className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="Nigerian">Nigerian</option>
                                        <option value="British">British</option>
                                        <option value="Both">Both</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Class Enrollments</label>
                                    <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                                        {availableClasses.length > 0 ? (
                                            availableClasses.map((cls) => (
                                                <label key={cls.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded-md cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                                                    <input
                                                        type="checkbox"
                                                        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                        checked={selectedClassIds.includes(cls.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedClassIds([...selectedClassIds, cls.id]);
                                                            } else {
                                                                setSelectedClassIds(selectedClassIds.filter(id => id !== cls.id));
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {cls.name} {cls.section ? `(${cls.section})` : ''}
                                                        {(!selectedBranchId || cls.branch_id !== selectedBranchId) && cls.branch_id ? ` — ${branchNameMap[cls.branch_id] || 'Other branch'}` : ''}
                                                    </span>
                                                </label>
                                            ))
                                        ) : (
                                            <p className="text-xs text-gray-500 italic py-2 text-center">No classes configured for this school.</p>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-400">The first selected class will be treated as the Primary Class.</p>
                                </div>

                                <div>
                                    <label htmlFor="schoolBus" className="block text-sm font-medium text-gray-700 mb-2">School Bus Assignment <span className="text-gray-400 text-xs">(Optional)</span></label>
                                    <select
                                        id="schoolBus"
                                        value={selectedBusId || ''}
                                        onChange={(e) => setSelectedBusId(e.target.value || null)}
                                        className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        disabled={loadingBuses}
                                    >
                                        <option value="">
                                            {loadingBuses ? 'Loading buses...' : 'Select a bus (optional)'}
                                        </option>
                                        {buses.map((bus: any) => (
                                            <option key={bus.id} value={bus.id}>
                                                {bus.name} {bus.route_name ? `- ${bus.route_name}` : ''} {bus.plate_number ? `(${bus.plate_number})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-xs text-gray-400 italic">Parents will see this bus assignment on their dashboard.</p>
                                </div>

                                <MultiSelect
                                    label="Subjects (Optional Selection)"
                                    selected={subjects}
                                    setSelected={setSubjects}
                                    placeholder="Select subjects for student..."
                                    options={filteredSubjectOptions}
                                />
                                {grade >= 10 && (
                                    <div>
                                        <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                        <select id="department" name="department" value={department} onChange={e => setDepartment(e.target.value as Department | '')} className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                                            <option value="">Select Department...</option>
                                            <option value="Science">Science</option>
                                            <option value="Commercial">Commercial</option>
                                            <option value="Arts">Arts</option>
                                        </select>
                                    </div>
                                )}

                                {/* ⚠️ Added orphaned database fields */}
                                <div>
                                    <label htmlFor="admissionNumber" className="block text-sm font-medium text-gray-700 mb-1">Admission Number</label>
                                    <input
                                        type="text"
                                        name="admissionNumber"
                                        id="admissionNumber"
                                        value={studentToEdit ? (admissionNumber || 'Loading...') : (admissionNumber || 'Generating...')}
                                        onChange={e => !studentToEdit && setAdmissionNumber(e.target.value)}
                                        readOnly={!!studentToEdit}
                                        className={`w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 ${studentToEdit ? 'cursor-not-allowed opacity-75' : ''}`}
                                        placeholder={studentToEdit ? 'Loading...' : 'Generating...'}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="studentAddress" className="block text-sm font-medium text-gray-700 mb-1">Address <span className="text-gray-400 text-xs">(Optional)</span></label>
                                    <textarea
                                        name="studentAddress"
                                        id="studentAddress"
                                        value={studentAddress}
                                        onChange={e => setStudentAddress(e.target.value)}
                                        className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="24 Ademola Street, Ikeja, Lagos"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Guardian Information Section */}
                        <div className="space-y-4">
                            <div className="p-2 bg-green-100 rounded-lg flex items-center justify-between">
                                <h3 className="font-bold text-green-800">Guardian Information</h3>
                                <div className="flex bg-white/50 rounded-lg p-1 text-xs">
                                    <button 
                                        type="button"
                                        onClick={() => setShowNewParentForm(true)}
                                        className={`px-2 py-1 rounded-md transition-colors ${showNewParentForm ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}
                                    >
                                        New
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setShowNewParentForm(false)}
                                        className={`px-2 py-1 rounded-md transition-colors ${!showNewParentForm ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}
                                    >
                                        Existing
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                                {!showNewParentForm ? (
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Existing Parent</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                                <SearchIcon className="w-4 h-4" />
                                            </span>
                                            <input 
                                                type="text" 
                                                placeholder="Search by name, email or ID..."
                                                value={searchParentTerm}
                                                onChange={(e) => setSearchParentTerm(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                        <div className="max-h-48 overflow-y-auto border rounded-lg divide-y bg-gray-50">
                                            {filteredParents.length > 0 ? (
                                                filteredParents.map(parent => (
                                                    <button
                                                        key={parent.id}
                                                        type="button"
                                                        onClick={() => setSelectedParentId(parent.id)}
                                                        className={`w-full text-left p-3 flex items-center gap-3 transition-colors ${selectedParentId === parent.id ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-white'}`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden text-xs font-bold ${selectedParentId === parent.id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                            {parent.avatar_url && !parentImageErrors[parent.id] ? (
                                                                <img 
                                                                    src={parent.avatar_url} 
                                                                    alt={parent.full_name || parent.name} 
                                                                    className="w-full h-full object-cover"
                                                                    onError={() => setParentImageErrors(prev => ({...prev, [parent.id]: true}))}
                                                                />
                                                            ) : (
                                                                (parent.name || parent.full_name || '?').charAt(0)
                                                            )}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-gray-800 truncate">{parent.name || parent.full_name || 'Unnamed Parent'}</p>
                                                            <p className="text-xs text-gray-500 truncate">{parent.email || parent.school_generated_id}</p>
                                                        </div>
                                                        {selectedParentId === parent.id && (
                                                            <CheckCircleIcon className="w-4 h-4 text-indigo-600 ml-auto" />
                                                        )}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center text-xs text-gray-500 italic">
                                                    No parents found. Try a different search.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="guardianName" className="block text-sm font-medium text-gray-700 mb-1">Guardian's Name</label>
                                            <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><UserIcon className="w-5 h-5" /></span><input type="text" name="guardianName" id="guardianName" value={guardianName} onChange={e => setGuardianName(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" placeholder="Mr. Adewale" /></div>
                                        </div>
                                        <div>
                                            <label htmlFor="guardianPhone" className="block text-sm font-medium text-gray-700 mb-1">Guardian's Phone</label>
                                            <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><PhoneIcon className="w-5 h-5" /></span><input type="tel" name="guardianPhone" id="guardianPhone" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" placeholder="+234 801 234 5678" /></div>
                                        </div>
                                        <div>
                                            <label htmlFor="guardianEmail" className="block text-sm font-medium text-gray-700 mb-1">Guardian's Email</label>
                                            <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><MailIcon className="w-5 h-5" /></span><input type="email" name="guardianEmail" id="guardianEmail" value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" placeholder="guardian@example.com" /></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Action Button */}
                <div className="p-4 mt-auto bg-gray-50 pb-32 lg:pb-4 flex gap-3">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="flex-1 py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`flex-1 flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${isLoading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors`}
                    >
                        {isLoading ? 'Saving...' : (studentToEdit ? 'Update Student' : 'Save Student')}
                    </button>
                </div>
            </form>

            {/* Credentials Modal */}
            {credentials && (
                <CredentialsModal
                    isOpen={showCredentialsModal}
                    userName={fullName}
                    username={credentials.username}
                    password={credentials.password}
                    email={credentials.email}
                    userType="Student"
                    studentId={credentials.studentId}
                    secondaryCredentials={credentials.secondary}
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

export default AddStudentScreen;


