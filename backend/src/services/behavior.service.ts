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
                ...data,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null,
                teacher_id: teacherId,
                date: data.date ? new Date(data.date) : new Date()
            }
        });

        SocketService.emitToSchool(schoolId, 'behavior:updated', { action: 'create', noteId: note.id });
        return note;
    }

    static async deleteNote(id: string) {
        const note = await prisma.behaviorNote.findUnique({ where: { id } });
        const result = await prisma.behaviorNote.delete({
            where: { id }
        });

        if (note) {
            SocketService.emitToSchool(note.school_id, 'behavior:updated', { action: 'delete', noteId: id });
        }
        return result;
    }
}
