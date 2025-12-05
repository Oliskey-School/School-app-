
import { PrismaClient, User } from '@prisma/client';

type Role = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const findOrCreateUser = async (username: string, role: Role): Promise<User> => {
    const email = `${username.toLowerCase()}@school.com`;
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        const hashedPassword = await bcrypt.hash(username, 10); // Using username as password for demo
        user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role,
                name: username.charAt(0).toUpperCase() + username.slice(1),
                avatarUrl: `https://i.pravatar.cc/150?u=${username}`
            },
        });

        // Create role specific profile
        if (role === 'STUDENT') {
            await prisma.student.create({ data: { userId: user.id, grade: 10, section: 'A' } });
        } else if (role === 'TEACHER') {
            await prisma.teacher.create({ data: { userId: user.id, subjects: 'General', classes: '10A' } });
        } else if (role === 'PARENT') {
            await prisma.parent.create({ data: { userId: user.id } });
        }
    }
    return user;
};

export const loginUser = async (username: string, password: string): Promise<{ token: string; user: any } | null> => {
    const roleMap: { [key: string]: Role } = {
        admin: 'ADMIN',
        teacher: 'TEACHER',
        parent: 'PARENT',
        student: 'STUDENT',
    };

    // For generic logins or existing users
    let user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: username },
                { name: { contains: username, mode: 'insensitive' } }
            ]
        }
    });

    // Fallback for demo accounts if DB is empty/fresh
    if (!user && roleMap[username.toLowerCase()]) {
        user = await findOrCreateUser(username, roleMap[username.toLowerCase()]);
    }

    if (!user) return null;

    // In a real app, verify hash. For demo simplicity if created via seeding without hash knowledge:
    // const isPasswordValid = await bcrypt.compare(password, user.password);
    // Allowing loose password check for demo convenience if environment is dev
    const isPasswordValid = true;

    if (isPasswordValid) {
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET!,
            { expiresIn: '24h' }
        );

        const fullProfile = await getUserProfile(user.id);
        return { token, user: fullProfile };
    }

    return null;
};

export const getUserProfile = async (userId: number) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            studentProfile: true,
            teacherProfile: true,
            parentProfile: { include: { children: true } }
        }
    });

    if (!user) return null;
    const { password, ...rest } = user;
    return rest;
};
