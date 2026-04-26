import prisma from '../config/database';

export class DashboardService {
    static async getStats(schoolId: string, teacherId?: string, branchId?: string) {
        console.log(`📊 [DashboardService] Fetching stats for schoolId: ${schoolId}, teacherId: ${teacherId}, branchId: ${branchId}`);

        try {
            const isAllBranches = branchId === 'all' || !branchId;
            const effectiveBranchId = isAllBranches ? undefined : branchId;

            // Define base filters
            const baseWhere: any = { school_id: schoolId };
            if (effectiveBranchId) baseWhere.branch_id = effectiveBranchId;

            const now = new Date();
            const today = new Date(now.setHours(0, 0, 0, 0));
            const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const prev30Days = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

            // Specialized queries for teachers
            if (teacherId) {
                const [
                    totalClasses,
                    totalStudents,
                    latestBehaviorNote,
                    attendanceTodayData,
                    avgScoreData,
                    totalTeachers,
                    totalParents,
                    overdueFeesData,
                    unpublishedReports,
                    timetablePreview,
                    recentActivity
                ] = await Promise.all([
                    // 1. Count classes assigned to this teacher
                    prisma.classTeacher.count({
                        where: { teacher_id: teacherId }
                    }),
                    // 2. Count unique students in classes assigned to this teacher (Active only)
                    prisma.student.count({
                        where: {
                            school_id: schoolId,
                            status: 'Active',
                            enrollments: {
                                some: {
                                    class: {
                                        teachers: {
                                            some: { teacher_id: teacherId }
                                        }
                                    }
                                }
                            }
                        }
                    }),
                    // 3. Latest behavior note for students of this teacher
                    prisma.behaviorNote.findFirst({
                        where: {
                            school_id: schoolId,
                            student: {
                                enrollments: {
                                    some: {
                                        class: {
                                            teachers: {
                                                some: { teacher_id: teacherId }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        orderBy: { created_at: 'desc' },
                        include: { student: true }
                    }),
                    // 4. Attendance Data for teacher's students today
                    prisma.attendance.aggregate({
                        where: {
                            date: today,
                            student: {
                                ...baseWhere,
                                enrollments: {
                                    some: {
                                        class: {
                                            teachers: {
                                                some: { teacher_id: teacherId }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        _count: { _all: true },
                    }),
                    // 5. Avg Score for teacher's students
                    prisma.academicPerformance.aggregate({
                        where: {
                            ...baseWhere,
                            student: {
                                enrollments: {
                                    some: {
                                        class: {
                                            teachers: {
                                                some: { teacher_id: teacherId }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        _avg: { score: true }
                    }),
                    // 6. Real teacher count in school/branch
                    prisma.teacher.count({ where: baseWhere }),
                    // 7. Real parent count for students in teacher's classes
                    prisma.parent.count({
                        where: {
                            school_id: schoolId,
                            children: {
                                some: {
                                    student: {
                                        enrollments: {
                                            some: {
                                                class: {
                                                    teachers: {
                                                        some: { teacher_id: teacherId }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }),
                    // 8. Overdue Fees for teacher's students
                    prisma.studentFee.aggregate({
                        where: {
                            ...baseWhere,
                            status: { in: ['Overdue', 'Pending'] },
                            student: {
                                enrollments: {
                                    some: {
                                        class: {
                                            teachers: {
                                                some: { teacher_id: teacherId }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        _sum: { amount: true, paid_amount: true }
                    }),
                    // 9. Unpublished Reports for teacher's students
                    prisma.reportCard.count({
                        where: {
                            is_published: false,
                            student: {
                                ...baseWhere,
                                enrollments: {
                                    some: {
                                        class: {
                                            teachers: {
                                                some: { teacher_id: teacherId }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }),
                    // 10. Real timetable preview for today
                    prisma.timetable.findMany({
                        where: {
                            ...baseWhere,
                            teacher_id: teacherId,
                            day_of_week: now.getDay() || 7 // 1-7 (Mon-Sun)
                        },
                        include: { class: true },
                        take: 3,
                        orderBy: { start_time: 'asc' }
                    }),
                    // 11. Recent activity (audit logs) for this teacher
                    prisma.auditLog.findMany({
                        where: { ...baseWhere, user_id: teacherId }, // Assuming user_id is the same as teacherId for audit logs
                        orderBy: { created_at: 'desc' },
                        take: 5
                    })
                ]);

                // Calculate present count for attendance rate
                const presentCount = await prisma.attendance.count({
                    where: {
                        date: today,
                        status: 'Present',
                        student: {
                            ...baseWhere,
                            enrollments: {
                                some: {
                                    class: {
                                        teachers: {
                                            some: { teacher_id: teacherId }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                const attendanceRate = attendanceTodayData._count._all > 0 
                    ? Math.round((presentCount / attendanceTodayData._count._all) * 100) 
                    : 0;

                const overdueFees = (overdueFeesData._sum.amount || 0) - (overdueFeesData._sum.paid_amount || 0);

                return {
                    totalStudents,
                    totalTeachers,
                    totalParents,
                    totalClasses,
                    overdueFees: Math.max(0, overdueFees),
                    unpublishedReports,
                    attendanceRate,
                    avgStudentScore: Math.round(avgScoreData._avg.score || 0),
                    studentTrend: 0, // Trends require more complex comparison logic across periods
                    teacherTrend: 0,
                    parentTrend: 0,
                    classTrend: 0,
                    pendingApprovals: 0,
                    latestHealthLog: latestBehaviorNote ? {
                        studentName: (latestBehaviorNote as any).student?.full_name || 'Unknown',
                        description: (latestBehaviorNote as any).note || 'No description',
                        time: latestBehaviorNote.created_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    } : null,
                    timetablePreview: timetablePreview.map((t: any) => ({
                        start_time: t.start_time,
                        subject: t.subject,
                        class_name: (t as any).class?.name || (t as any).class_name || 'Unknown'
                    })),
                    recentActivity: recentActivity.map((log: any) => ({
                        id: log.id,
                        action: log.action,
                        user_name: 'You',
                        created_at: log.created_at.toISOString()
                    }))
                };
            }

            // Standard School-wide queries
            const [
                totalStudents,
                totalTeachers,
                totalParents,
                totalClasses,
                pendingApprovals,
                latestBehaviorNote,
                attendanceTodayTotal,
                attendanceTodayPresent,
                avgScoreData,
                unpublishedReports,
                overdueFeesData,
                timetablePreview,
                recentActivity,
                academicLevelsData, // Unique grades
                // Trend counters
                studentsLast30,
                studentsPrev30,
                teachersLast30,
                teachersPrev30,
                parentsLast30,
                parentsPrev30,
                classesLast30,
                classesPrev30,
                enrollmentData,
                performanceData,
                feeData,
                workloadData
            ] = await Promise.all([
                prisma.student.count({ where: { ...baseWhere, status: 'Active' } }),
                prisma.teacher.count({ where: baseWhere }),
                prisma.parent.count({ where: baseWhere }),
                prisma.class.count({ where: baseWhere }),
                prisma.student.count({ where: { ...baseWhere, status: 'Pending' } }),
                prisma.behaviorNote.findFirst({ 
                    where: baseWhere, 
                    orderBy: { created_at: 'desc' },
                    include: { student: true }
                }),
                prisma.attendance.count({ where: { date: today, student: baseWhere } }),
                prisma.attendance.count({ where: { date: today, status: 'Present', student: baseWhere } }),
                prisma.academicPerformance.aggregate({ where: baseWhere, _avg: { score: true } }),
                prisma.reportCard.count({ where: { is_published: false, student: baseWhere } }),
                prisma.studentFee.aggregate({ 
                    where: { ...baseWhere, status: { in: ['Overdue', 'Pending'] } }, 
                    _sum: { amount: true, paid_amount: true } 
                }),
                prisma.timetable.findMany({
                    where: { ...baseWhere, day_of_week: now.getDay() || 7 }, // 1-7 (Mon-Sun)
                    include: { class: true },
                    take: 3,
                    orderBy: { start_time: 'asc' }
                } as any),
                prisma.auditLog.findMany({
                    where: baseWhere,
                    orderBy: { created_at: 'desc' },
                    include: { user: true },
                    take: 5
                }),
                // Count unique grades (Academic Levels)
                prisma.class.findMany({
                    where: baseWhere,
                    distinct: ['grade'],
                    select: { grade: true }
                }),
                // Trend counters
                prisma.student.count({ where: { ...baseWhere, created_at: { gte: last30Days } } }),
                prisma.student.count({ where: { ...baseWhere, created_at: { gte: prev30Days, lt: last30Days } } }),
                prisma.teacher.count({ where: { ...baseWhere, created_at: { gte: last30Days } } }),
                prisma.teacher.count({ where: { ...baseWhere, created_at: { gte: prev30Days, lt: last30Days } } }),
                prisma.parent.count({ where: { ...baseWhere, created_at: { gte: last30Days } } }),
                prisma.parent.count({ where: { ...baseWhere, created_at: { gte: prev30Days, lt: last30Days } } }),
                prisma.class.count({ where: { ...baseWhere, created_at: { gte: last30Days } } }),
                prisma.class.count({ where: { ...baseWhere, created_at: { gte: prev30Days, lt: last30Days } } }),
                // Enrollment data for chart
                prisma.student.groupBy({
                    by: ['created_at'],
                    where: baseWhere,
                    _count: { id: true },
                    orderBy: { created_at: 'asc' }
                }) as any,
                // Performance by subject
                prisma.academicPerformance.groupBy({
                    by: ['subject'],
                    where: baseWhere,
                    _avg: { score: true },
                }),
                // Fees breakdown
                prisma.studentFee.groupBy({
                    by: ['status'],
                    where: baseWhere,
                    _count: { id: true },
                }),
                // Teacher workload
                prisma.teacher.findMany({
                    where: baseWhere,
                    select: {
                        full_name: true,
                        timetables: {
                            select: { start_time: true, end_time: true }
                        }
                    },
                    take: 5
                })
            ]);

            // Process enrollment data into year-based format for the chart
            const timeCounts: Record<string, number> = {};
            (enrollmentData || []).forEach((item: any) => {
                const date = new Date(item.created_at);
                // Group by Year and Month for better granularity than just year, but still chart-friendly
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                timeCounts[key] = (timeCounts[key] || 0) + (item._count?.id || 1);
            });
            
            const processedEnrollmentData = Object.keys(timeCounts).map(key => ({
                year: parseInt(key.split('-')[0]),
                label: key, // Keep as label for potentially more detailed tooltips
                count: timeCounts[key]
            })).sort((a, b) => a.label.localeCompare(b.label));

            if (processedEnrollmentData.length === 0) {
                processedEnrollmentData.push({ year: new Date().getFullYear(), label: String(new Date().getFullYear()), count: totalStudents });
            }

            // Process Performance
            const performance = performanceData.map((p: any) => ({
                label: p.subject,
                value: Math.round(p._avg.score || 0),
                a11yLabel: `${p.subject}: ${Math.round(p._avg.score || 0)}% average`
            }));

            // Process Fees
            const feeStatusCounts: Record<string, number> = {};
            let feeTotal = 0;
            feeData.forEach((f: any) => {
                feeStatusCounts[f.status] = (feeStatusCounts[f.status] || 0) + f._count.id;
                feeTotal += f._count.id;
            });
            const fees = {
                paid: feeTotal > 0 ? Math.round(((feeStatusCounts['Paid'] || 0) / feeTotal) * 100) : 0,
                overdue: feeTotal > 0 ? Math.round(((feeStatusCounts['Overdue'] || 0) / feeTotal) * 100) : 0,
                unpaid: feeTotal > 0 ? Math.round(((feeStatusCounts['Pending'] || 0) / feeTotal) * 100) : 0,
                total: feeTotal
            };

            // Process Workload
            const workload = workloadData.map((t: any) => {
                let weeklyMinutes = 0;
                // Sum up duration of all lessons in the timetable for this teacher
                if (t.timetables && Array.isArray(t.timetables)) {
                    t.timetables.forEach((session: any) => {
                        try {
                            if (session.start_time && session.end_time) {
                                const [startH, startM] = session.start_time.split(':').map(Number);
                                const [endH, endM] = session.end_time.split(':').map(Number);
                                const duration = (endH * 60 + endM) - (startH * 60 + startM);
                                if (duration > 0) weeklyMinutes += duration;
                            }
                        } catch (e) {
                            // Skip invalid time formats
                        }
                    });
                }
                
                return {
                    label: t.full_name.split(' ')[0],
                    value: Math.round((weeklyMinutes / 60) * 10) / 10 // Hours per week
                };
            });
            
            // If no real timetable data, fallback to a sensible estimation
            if (workload.every(w => w.value === 0)) {
                workloadData.forEach((t: any, index: number) => {
                    if (workload[index]) {
                        workload[index].value = (t._count?.classes || 0) * 5; // Fallback estimate
                    }
                });
            }

            // Process Attendance Trend
            // For real attendance trend, we need counts of 'Present' per day
            const attendanceTrend = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                d.setHours(0, 0, 0, 0);
                
                const dayCount = await prisma.attendance.count({
                    where: { date: d, student: baseWhere }
                });
                const presentCount = await prisma.attendance.count({
                    where: { date: d, status: 'Present', student: baseWhere }
                });
                
                attendanceTrend.push(dayCount > 0 ? Math.round((presentCount / dayCount) * 100) : 0);
            }

            const attendanceRate = attendanceTodayTotal > 0 
                ? Math.round((attendanceTodayPresent / attendanceTodayTotal) * 100) 
                : 0;

            const overdueFees = (overdueFeesData._sum.amount || 0) - (overdueFeesData._sum.paid_amount || 0);

            return {
                totalStudents,
                totalTeachers,
                totalParents,
                totalClasses,
                totalAcademicLevels: (academicLevelsData || []).length || 16, // Fallback to 16 standard levels if none created
                overdueFees: Math.max(0, overdueFees),
                unpublishedReports,
                attendanceRate,
                avgStudentScore: Math.round(avgScoreData._avg.score || 0),
                studentTrend: studentsLast30 - studentsPrev30,
                teacherTrend: teachersLast30 - teachersPrev30,
                parentTrend: parentsLast30 - parentsPrev30,
                classTrend: classesLast30 - classesPrev30,
                pendingApprovals,
                latestHealthLog: latestBehaviorNote ? {
                    studentName: (latestBehaviorNote as any).student?.full_name || 'Unknown',
                    description: (latestBehaviorNote as any).note || 'No description',
                    time: latestBehaviorNote.created_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                } : null,
                timetablePreview: timetablePreview.map((t: any) => ({
                    start_time: t.start_time,
                    subject: t.subject,
                    class_name: t.class?.name || t.class_name || 'Unknown'
                })),
                recentActivity: recentActivity.map((log: any) => {
                    // Normalize actions for frontend icon mapping
                    let actionType = 'create';
                    const act = log.action.toLowerCase();
                    if (act.includes('login')) actionType = 'login';
                    else if (act.includes('logout')) actionType = 'logout';
                    else if (act.includes('update') || act.includes('edit')) actionType = 'update';
                    else if (act.includes('delete') || act.includes('remove')) actionType = 'delete';
                    else if (act.includes('publish')) actionType = 'publish';
                    else if (act.includes('pay')) actionType = 'payment';

                    return {
                        id: log.id,
                        action: log.action,
                        user_name: log.user?.full_name || 'System',
                        created_at: log.created_at.toISOString(),
                        action_type: actionType // Explicitly passing normalized type
                    };
                }),
                enrollmentData: processedEnrollmentData,
                performance,
                fees,
                workload,
                attendance: attendanceTrend
            };
        } catch (error) {
            console.error('❌ [DashboardService] Error fetching Prisma stats:', error);
            throw error;
        }
    }

    static async getAuditLogs(schoolId: string, limit: number = 50, branchId?: string) {
        try {
            const baseWhere: any = { school_id: schoolId };
            if (branchId && branchId !== 'all') baseWhere.branch_id = branchId;

            const logs = await prisma.auditLog.findMany({
                where: baseWhere,
                orderBy: { created_at: 'desc' },
                include: { user: true },
                take: limit
            });

            return logs.map((log: any) => ({
                id: log.id,
                action: log.action,
                user_name: log.user?.full_name || 'System',
                details: log.entity_type ? `${log.action} on ${log.entity_type}` : log.action,
                created_at: log.created_at.toISOString()
            }));
        } catch (error) {
            console.error('❌ [DashboardService] Error fetching audit logs:', error);
            return [];
        }
    }

    static async getParentTodayUpdate(parentId: string, schoolId: string) {
        const todayStr = new Date().toISOString().split('T')[0];
        const today = new Date(todayStr);

        // 1. Get children
        const children = await prisma.student.findMany({
            where: {
                school_id: schoolId,
                parents: { some: { parent_id: parentId } }
            },
            include: {
                attendance: { 
                    where: { 
                        date: {
                            gte: today,
                            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                        }
                    } 
                },
                fees: { where: { status: { not: 'Paid' } } },
                enrollments: { include: { class: true } }
            }
        });

        // 2. Map children to summary
        const childSummaries = await Promise.all(children.map(async child => {
            const attendance = child.attendance[0];
            const feesDue = child.fees.reduce((sum, f) => sum + (f.amount - f.paid_amount), 0);
            const className = child.enrollments[0]?.class?.name || 'Unknown';
            const classId = child.enrollments[0]?.class_id;

            let homework_pending = 0;
            if (classId) {
                const submissions = await prisma.assignmentSubmission.findMany({
                    where: { student_id: child.id },
                    select: { assignment_id: true }
                });
                const submittedIds = submissions.map(s => s.assignment_id);

                homework_pending = await prisma.assignment.count({
                    where: {
                        class_id: classId,
                        due_date: { gte: today },
                        ...(submittedIds.length > 0 ? { id: { notIn: submittedIds } } : {})
                    }
                });
            }

            // Get total behavior points
            const behaviorNotes = await prisma.behaviorNote.aggregate({
                where: { student_id: child.id },
                _sum: { points: true }
            });

            return {
                id: child.id,
                name: child.full_name,
                class_name: className,
                avatar_url: child.avatar_url || '',
                attendance_status: (attendance?.status?.toLowerCase() || 'not_marked') as any,
                homework_pending,
                fee_due: feesDue,
                bus_status: 'On Route', // Mock for now until Bus feature is fully implemented
                behavior_points: behaviorNotes._sum.points || 0,
                upcoming_events: 3 // Kept as mock for simplicity
            };
        }));

        // 3. Get feed items (recent notifications)
        const notifications = await prisma.notification.findMany({
            where: {
                school_id: schoolId,
                OR: [
                    { user_id: parentId },
                    { audience: { has: 'PARENT' } }
                ]
            },
            take: 10,
            orderBy: { created_at: 'desc' }
        });

        return {
            children: childSummaries,
            feedItems: notifications.map(item => ({
                id: item.id,
                type: item.category.toLowerCase().includes('attendance') ? 'attendance' : 
                      item.category.toLowerCase().includes('fee') ? 'fee' : 
                      item.category.toLowerCase().includes('event') ? 'event' : 'message',
                child_name: 'Update',
                description: item.message,
                time: item.created_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                icon_color: 'text-indigo-500'
            }))
        };
    }

    static async globalSearch(schoolId: string, term: string, branchId?: string) {
        const isAllBranches = branchId === 'all' || !branchId;
        const effectiveBranchId = isAllBranches ? undefined : branchId;

        const baseWhere: any = { school_id: schoolId };
        if (effectiveBranchId) baseWhere.branch_id = effectiveBranchId;

        const [
            students,
            teachers,
            classes,
            assignments,
            quizzes,
            notices,
            parents
        ] = await Promise.all([
            prisma.student.findMany({
                where: {
                    ...baseWhere,
                    OR: [
                        { full_name: { contains: term, mode: 'insensitive' } },
                        { school_generated_id: { contains: term, mode: 'insensitive' } }
                    ]
                },
                take: 10
            }),
            prisma.teacher.findMany({
                where: {
                    ...baseWhere,
                    OR: [
                        { full_name: { contains: term, mode: 'insensitive' } },
                        { email: { contains: term, mode: 'insensitive' } }
                    ]
                },
                take: 5
            }),
            prisma.class.findMany({
                where: {
                    ...baseWhere,
                    name: { contains: term, mode: 'insensitive' }
                },
                take: 5
            }),
            prisma.assignment.findMany({
                where: {
                    class: { school_id: schoolId, branch_id: effectiveBranchId },
                    title: { contains: term, mode: 'insensitive' }
                },
                take: 5
            }),
            prisma.quiz.findMany({
                where: {
                    school_id: schoolId,
                    title: { contains: term, mode: 'insensitive' }
                },
                take: 5
            }),
            prisma.announcement.findMany({
                where: {
                    ...baseWhere,
                    OR: [
                        { title: { contains: term, mode: 'insensitive' } },
                        { content: { contains: term, mode: 'insensitive' } }
                    ]
                },
                take: 5
            }),
            prisma.parent.findMany({
                where: {
                    ...baseWhere,
                    OR: [
                        { full_name: { contains: term, mode: 'insensitive' } },
                        { email: { contains: term, mode: 'insensitive' } }
                    ]
                },
                take: 5
            })
        ]);

        return {
            students,
            teachers,
            classes,
            assignments,
            quizzes,
            notices,
            parents
        };
    }
}
