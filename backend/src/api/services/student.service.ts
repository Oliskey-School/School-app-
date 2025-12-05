
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const findAllStudents = async () => {
    // In a real app, this would fetch from the database.
    // For now, it returns an empty array as the DB is empty.
    return await prisma.student.findMany({
        include: {
            class: true,
            parents: true,
        },
    });
};

export const findStudentById = async (id: number) => {
    return await prisma.student.findUnique({
        where: { id },
        include: {
            class: true,
            parents: true,
            reportCards: true,
            submissions: true,
        },
    });
};
