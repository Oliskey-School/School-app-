import prisma from '../config/database';
import { SocketService } from './socket.service';

export class ChatService {
    async getChatRooms(userId: string) {
        return prisma.chatRoom.findMany({
            where: {
                participants: {
                    some: {
                        user_id: userId
                    }
                }
            },
            include: {
                participants: {
                    include: {
                        user: true
                    }
                },
                messages: {
                    take: 1,
                    orderBy: {
                        created_at: 'desc'
                    },
                    include: {
                        sender: true
                    }
                }
            },
            orderBy: {
                last_message_at: 'desc'
            }
        });
    }

    async getChatMessages(roomId: string) {
        return prisma.chatMessage.findMany({
            where: {
                room_id: roomId
            },
            include: {
                sender: true
            },
            orderBy: {
                created_at: 'asc'
            }
        });
    }

    async sendMessage(roomId: string, senderId: string, content: string, type: string = 'text', mediaUrl?: string) {
        const message = await prisma.chatMessage.create({
            data: {
                room_id: roomId,
                sender_id: senderId,
                content,
                type: type,
                ...(mediaUrl && { media_url: mediaUrl } as any),
                is_deleted: false,
                is_edited: false
            } as any,
            include: {
                sender: true
            }
        });

        await prisma.chatRoom.update({
            where: { id: roomId },
            data: { last_message_at: new Date() }
        });

        // Get participants to notify them via their personal rooms or the specific chat room
        const room = await prisma.chatRoom.findUnique({
            where: { id: roomId },
            include: { participants: true }
        });

        if (room) {
            // Emit to the specific chat room
            SocketService.emit(`chat:${roomId}:message`, message);
            
            // Also notify each participant (for sidebar/notifications)
            room.participants.forEach(participant => {
                if (participant.user_id !== senderId) {
                    SocketService.emit(`user:${participant.user_id}:chat_update`, {
                        roomId,
                        lastMessage: message
                    });
                }
            });
        }

        return message;
    }

    async getChatContacts(schoolId: string, studentId: string) {
        // Get teachers in the school
        const teachers = await prisma.teacher.findMany({
            where: { school_id: schoolId },
            select: {
                id: true,
                full_name: true,
                avatar_url: true
            }
        });

        // Get student's grade and section
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { grade: true, section: true }
        });

        let classmates: any[] = [];
        if (student) {
            classmates = await prisma.student.findMany({
                where: {
                    school_id: schoolId,
                    grade: student.grade,
                    id: { not: studentId }
                },
                select: {
                    id: true,
                    full_name: true,
                    avatar_url: true,
                    grade: true,
                    section: true
                }
            });
        }

        return { teachers, classmates };
    }

    async getOrCreateDirectChat(userId: string, targetUserId: string, schoolId: string) {
        // Find existing direct chat between these two users
        const existingRoom = await prisma.chatRoom.findFirst({
            where: {
                type: 'direct',
                AND: [
                    {
                        participants: {
                            some: { user_id: userId }
                        }
                    },
                    {
                        participants: {
                            some: { user_id: targetUserId }
                        }
                    }
                ]
            }
        });

        if (existingRoom) {
            return existingRoom;
        }

        // Create new direct chat
        const newRoom = await prisma.chatRoom.create({
            data: {
                type: 'direct',
                is_group: false,
                school_id: schoolId,
                creator_id: userId,
                participants: {
                    create: [
                        { user_id: userId, role: 'member' },
                        { user_id: targetUserId, role: 'member' }
                    ]
                }
            }
        });

        SocketService.emit(`user:${targetUserId}:chat_update`, { action: 'new_room', roomId: newRoom.id });
        return newRoom;
    }
}
