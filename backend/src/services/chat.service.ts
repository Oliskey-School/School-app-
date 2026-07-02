import prisma from '../config/database';
import { SocketService } from './socket.service';

export class ChatService {
    async getChatRooms(userId: string) {
        const rooms = await prisma.chatRoom.findMany({
            where: {
                participants: { some: { user_id: userId } }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true, full_name: true, avatar_url: true, role: true,
                                student_profile: { select: { display_name: true } }
                            }
                        }
                    }
                },
                messages: {
                    take: 1,
                    orderBy: { created_at: 'desc' },
                    include: { sender: { select: { id: true, full_name: true } } }
                }
            },
            orderBy: { last_message_at: 'desc' }
        });

        // Attach unread count per room
        return Promise.all(rooms.map(async (room) => {
            const participant = room.participants.find(p => p.user_id === userId);
            const lastReadAt = participant?.last_read_at;

            const unreadCount = await prisma.chatMessage.count({
                where: {
                    room_id: room.id,
                    sender_id: { not: userId },
                    is_deleted: false,
                    ...(lastReadAt ? { created_at: { gt: lastReadAt } } : {})
                }
            });

            return { ...room, unread_count: unreadCount };
        }));
    }

    async getChatMessages(roomId: string) {
        return prisma.chatMessage.findMany({
            where: { room_id: roomId, is_deleted: false },
            include: {
                sender: {
                    select: {
                        id: true, full_name: true, avatar_url: true, role: true,
                        student_profile: { select: { display_name: true } }
                    }
                }
            },
            orderBy: { created_at: 'asc' }
        });
    }

    async sendMessage(roomId: string, senderId: string, content: string, type: string = 'text', mediaUrl?: string) {
        // Fetch school_id from the room so we can satisfy the required FK
        const room = await prisma.chatRoom.findUnique({ where: { id: roomId }, select: { school_id: true } });
        if (!room) throw new Error('Chat room not found');

        const message = await prisma.chatMessage.create({
            data: {
                room_id: roomId,
                sender_id: senderId,
                school_id: room.school_id,
                content,
                type,
                is_deleted: false,
                is_edited: false
            },
            include: {
                sender: {
                    select: {
                        id: true, full_name: true, avatar_url: true, role: true,
                        student_profile: { select: { display_name: true } }
                    }
                }
            }
        });

        // media_url is a new column — set it via raw SQL so the running
        // Prisma client (which predates the column) doesn't reject it
        if (mediaUrl) {
            await prisma.$executeRaw`UPDATE "ChatMessage" SET media_url = ${mediaUrl} WHERE id = ${message.id}`;
            (message as any).media_url = mediaUrl;
        }

        await prisma.chatRoom.update({
            where: { id: roomId },
            data: { last_message_at: new Date() }
        });

        const roomWithParticipants = await prisma.chatRoom.findUnique({
            where: { id: roomId },
            include: { participants: true }
        });

        if (roomWithParticipants) {
            // Emit to the specific chat socket room (users who joined via 'join-chat-room')
            SocketService.emitToRoom(roomId, 'chat:message', {
                ...message,
                room_id: roomId
            });

            // Notify each participant's personal channel for sidebar updates
            roomWithParticipants.participants.forEach(participant => {
                if (participant.user_id !== senderId) {
                    SocketService.emitToUser(participant.user_id, 'user:chat_update', {
                        roomId,
                        lastMessage: message
                    });
                }
            });
        }

        return message;
    }

    async markRoomAsRead(roomId: string, userId: string) {
        await prisma.chatParticipant.updateMany({
            where: { room_id: roomId, user_id: userId },
            data: { last_read_at: new Date() }
        });
    }

    async getUnreadCount(userId: string): Promise<number> {
        const participations = await prisma.chatParticipant.findMany({
            where: { user_id: userId }
        });

        let total = 0;
        for (const p of participations) {
            const count = await prisma.chatMessage.count({
                where: {
                    room_id: p.room_id,
                    sender_id: { not: userId },
                    is_deleted: false,
                    ...(p.last_read_at ? { created_at: { gt: p.last_read_at } } : {})
                }
            });
            total += count;
        }
        return total;
    }

    async getRoleBasedContacts(userId: string, role: string, schoolId: string, branchId?: string) {
        if (!schoolId) return { contacts: [] };

        const userSelect = {
            id: true,
            full_name: true,
            avatar_url: true,
            role: true,
            student_profile: { select: { display_name: true, grade: true, section: true } }
        };

        switch (role.toLowerCase()) {
            case 'student': {
                // All students in same branch
                const allStudents = await prisma.student.findMany({
                    where: {
                        school_id: schoolId,
                        ...(branchId ? { branch_id: branchId } : {}),
                        user_id: { not: userId }
                    },
                    include: { user: { select: userSelect } },
                    take: 400
                });

                // Teachers in same school/branch
                const teachers = await prisma.teacher.findMany({
                    where: {
                        school_id: schoolId,
                        ...(branchId ? { branch_id: branchId } : {})
                    },
                    include: { user: { select: userSelect } },
                    take: 100
                });

                // Admins
                const admins = await prisma.user.findMany({
                    where: {
                        school_id: schoolId,
                        role: { in: ['ADMIN', 'PROPRIETOR'] as any }
                    },
                    select: userSelect,
                    take: 20
                });

                // Only THIS student's own parent
                const parentLinks = await prisma.parentChild.findMany({
                    where: { student: { user_id: userId } },
                    include: {
                        parent: { include: { user: { select: userSelect } } }
                    }
                });

                return {
                    students: allStudents.map(s => this.formatContact(s.user, 'Student')).filter(Boolean),
                    teachers: teachers.map(t => this.formatContact(t.user, 'Teacher')).filter(Boolean),
                    admins: admins.map(a => this.formatContact(a, 'Admin')).filter(Boolean),
                    parents: parentLinks.map(l => this.formatContact(l.parent?.user, 'Parent')).filter(Boolean)
                };
            }

            case 'parent': {
                // Find this parent record
                const parentRecord = await prisma.parent.findFirst({ where: { user_id: userId } });

                // 1. Children only
                const childLinks = await prisma.parentChild.findMany({
                    where: { parent: { user_id: userId } },
                    include: { student: { include: { user: { select: userSelect } } } }
                });

                // 2. Admins in the same school
                const admins = await prisma.user.findMany({
                    where: {
                        school_id: schoolId,
                        role: { in: ['ADMIN', 'PROPRIETOR'] as any }
                    },
                    select: userSelect,
                    take: 20
                });

                // 3. Teachers with a valid (non-expired, active) admin-granted permission
                let teachers: any[] = [];
                if (parentRecord) {
                    const now = new Date();
                    const grants = await (prisma as any).parentTeacherChatPermission.findMany({
                        where: {
                            parent_id: parentRecord.id,
                            school_id: schoolId,
                            is_active: true,
                            OR: [
                                { expires_at: null },
                                { expires_at: { gt: now } }
                            ]
                        },
                        include: { teacher: { include: { user: { select: userSelect } } } }
                    });
                    teachers = grants.map((g: any) => this.formatContact(g.teacher?.user, 'Teacher')).filter(Boolean);
                }

                return {
                    children: childLinks.map(l => this.formatContact(l.student.user, 'Children')).filter(Boolean),
                    admins: admins.map(a => this.formatContact(a, 'Admin')).filter(Boolean),
                    ...(teachers.length > 0 ? { teachers } : {})
                };
            }

            case 'teacher': {
                // Teacher can message: admins, students (same branch), other teachers (same branch)
                const admins = await prisma.user.findMany({
                    where: {
                        school_id: schoolId,
                        role: { in: ['ADMIN', 'PROPRIETOR'] as any }
                    },
                    select: userSelect,
                    take: 20
                });

                const students = await prisma.student.findMany({
                    where: {
                        school_id: schoolId,
                        ...(branchId ? { branch_id: branchId } : {})
                    },
                    include: { user: { select: userSelect } },
                    take: 200
                });

                const otherTeachers = await prisma.teacher.findMany({
                    where: {
                        school_id: schoolId,
                        user_id: { not: userId },
                        ...(branchId ? { branch_id: branchId } : {})
                    },
                    include: { user: { select: userSelect } },
                    take: 100
                });

                return {
                    admins: admins.map(a => this.formatContact(a, 'Admin')),
                    students: students.map(s => this.formatContact(s.user, 'Student')),
                    teachers: otherTeachers.map(t => this.formatContact(t.user, 'Teacher'))
                };
            }

            case 'admin':
            case 'proprietor':
            case 'superadmin': {
                // Admin can message everyone in the school
                const students = await prisma.student.findMany({
                    where: { school_id: schoolId },
                    include: { user: { select: userSelect } },
                    take: 500
                });

                const teachers = await prisma.teacher.findMany({
                    where: { school_id: schoolId },
                    include: { user: { select: userSelect } },
                    take: 200
                });

                const parents = await prisma.parent.findMany({
                    where: { school_id: schoolId },
                    include: { user: { select: userSelect } },
                    take: 200
                });

                const otherAdmins = await prisma.user.findMany({
                    where: {
                        school_id: schoolId,
                        role: { in: ['ADMIN', 'PROPRIETOR'] as any },
                        id: { not: userId }
                    },
                    select: userSelect,
                    take: 20
                });

                return {
                    students: students.map(s => this.formatContact(s.user, 'Student')),
                    teachers: teachers.map(t => this.formatContact(t.user, 'Teacher')),
                    parents: parents.map(p => this.formatContact(p.user, 'Parent')),
                    admins: otherAdmins.map(a => this.formatContact(a, 'Admin'))
                };
            }

            default:
                return { contacts: [] };
        }
    }

    async createGroupChat(creatorId: string, schoolId: string, name: string, memberIds: string[]) {
        const allMemberIds = [...new Set([creatorId, ...memberIds])];

        const room = await prisma.chatRoom.create({
            data: {
                type: 'group',
                name,
                is_group: true,
                school_id: schoolId,
                creator_id: creatorId,
                participants: {
                    create: allMemberIds.map(uid => ({
                        user_id: uid,
                        role: uid === creatorId ? 'admin' : 'member',
                        school_id: schoolId
                    }))
                }
            }
        });

        // Notify all members so their sidebar updates
        allMemberIds.forEach(uid => {
            if (uid !== creatorId) {
                SocketService.emitToUser(uid, 'user:chat_update', {
                    action: 'new_room',
                    roomId: room.id,
                    roomName: name,
                    isGroup: true
                });
            }
        });

        return room;
    }

    private formatContact(user: any, roleLabel: string) {
        if (!user) return null;
        const displayName = user.student_profile?.display_name || user.full_name || 'Unknown';
        return {
            userId: user.id,
            name: displayName,
            fullName: user.full_name,
            avatarUrl: user.avatar_url,
            role: roleLabel,
            grade: user.student_profile?.grade,
            section: user.student_profile?.section
        };
    }

    // Legacy method kept for backward compatibility
    async getChatContacts(schoolId: string, studentId: string) {
        if (!schoolId) return { teachers: [], classmates: [] };

        const teachers = await prisma.teacher.findMany({
            where: { school_id: schoolId },
            select: { id: true, full_name: true, avatar_url: true }
        });

        const student = studentId
            ? await prisma.student.findFirst({
                where: { school_id: schoolId, id: studentId },
                select: { grade: true, section: true }
            })
            : null;

        let classmates: any[] = [];
        if (student) {
            classmates = await prisma.student.findMany({
                where: {
                    school_id: schoolId,
                    grade: student.grade,
                    id: { not: studentId }
                },
                select: { id: true, full_name: true, avatar_url: true, grade: true, section: true }
            });
        }

        return { teachers, classmates };
    }

    async getOrCreateDirectChat(userId: string, targetUserId: string, schoolId: string) {
        const existingRoom = await prisma.chatRoom.findFirst({
            where: {
                type: 'direct',
                AND: [
                    { participants: { some: { user_id: userId } } },
                    { participants: { some: { user_id: targetUserId } } }
                ]
            }
        });

        if (existingRoom) return existingRoom;

        const newRoom = await prisma.chatRoom.create({
            data: {
                type: 'direct',
                is_group: false,
                school_id: schoolId,
                creator_id: userId,
                participants: {
                    create: [
                        { user_id: userId, role: 'member', school_id: schoolId },
                        { user_id: targetUserId, role: 'member', school_id: schoolId }
                    ]
                }
            }
        });

        SocketService.emitToUser(targetUserId, 'user:chat_update', {
            action: 'new_room',
            roomId: newRoom.id
        });

        return newRoom;
    }
}
