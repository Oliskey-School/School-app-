import prisma from '../config/database';
import { SocketService } from './socket.service';

export class BehaviorService {
    static async getNotesBySchool(schoolId: string, branchId?: string) {
        return prisma.behaviorNote.findMany({
            where: {
                school_id: schoolId,
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {})
            },
            include: {
                student: {
                    select: {
                        full_name: true,
                        grade: true,
                        section: true
                    }
                },
                teacher: {
                    select: {
                        full_name: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    static async createNote(schoolId: string, branchId: string | undefined, teacherId: string, data: any) {
        const note = await prisma.behaviorNote.create({
            data: {
                student_id: data.student_id || data.studentId,
                teacher_id: teacherId,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null,
                note: data.note,
                category: data.category || 'General',
                type: (data.type || 'neutral').toLowerCase() as any,
                date: data.date ? new Date(data.date) : new Date(),
                parent_visible: data.parent_visible !== undefined ? data.parent_visible : true
            }
        });

        SocketService.emitToSchool(schoolId, 'behavior:updated', { action: 'create', noteId: note.id });
        return note;
    }

    static async deleteNote(schoolId: string, id: string) {
        // Tenant-scoped lookup prevents cross-school deletion via known note id.
        const note = await prisma.behaviorNote.findFirst({ where: { id, school_id: schoolId } });
        if (!note) {
            const err: any = new Error('Behavior note not found');
            err.statusCode = 404;
            throw err;
        }
        const result = await prisma.behaviorNote.delete({ where: { id: note.id } });
        SocketService.emitToSchool(note.school_id, 'behavior:updated', { action: 'delete', noteId: id });
        return result;
    }
}
