import prisma from '../config/database';

export class IDCardService {
    static async getIDCardStats(schoolId: string) {
        const totalStudents = await prisma.student.count({
            where: { school_id: schoolId, status: 'Active' }
        });

        const cardsIssued = await prisma.studentIDCard.count({
            where: { school_id: schoolId, status: 'Active' }
        });

        const cardsPrinted = await prisma.studentIDCard.count({
            where: { school_id: schoolId, is_printed: true }
        });

        const expiringSoon = await prisma.studentIDCard.count({
            where: {
                school_id: schoolId,
                status: 'Active',
                expiry_date: {
                    lte: new Date(new Date().setMonth(new Date().getMonth() + 1)),
                    gte: new Date()
                }
            }
        });

        return {
            totalStudents,
            cardsIssued,
            cardsPrinted,
            expiringSoon
        };
    }

    static async getIDCards(schoolId: string, branchId?: string) {
        return await prisma.studentIDCard.findMany({
            where: { 
                school_id: schoolId,
                student: branchId ? { branch_id: branchId } : undefined
            },
            include: {
                student: {
                    select: {
                        full_name: true,
                        grade: true,
                        section: true,
                        avatar_url: true,
                        school_generated_id: true,
                        id: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    static async issueIDCard(schoolId: string, studentId: string, data: any) {
        const expiryDate = data.expiryDate ? new Date(data.expiryDate) : new Date(new Date().setFullYear(new Date().getFullYear() + 1));
        
        // Find existing card for this student
        const existingCard = await prisma.studentIDCard.findFirst({
            where: { school_id: schoolId, student_id: studentId }
        });

        if (existingCard) {
            return await prisma.studentIDCard.update({
                where: { id: existingCard.id },
                data: {
                    status: data.status || 'Active',
                    expiry_date: expiryDate,
                    is_printed: data.is_printed ?? true,
                    updated_at: new Date()
                }
            });
        }

        const cardNumber = data.cardNumber || `ID-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        return await prisma.studentIDCard.create({
            data: {
                school_id: schoolId,
                student_id: studentId,
                card_number: cardNumber,
                expiry_date: expiryDate,
                status: data.status || 'Active',
                is_printed: data.is_printed ?? true
            }
        });
    }

    static async getIDCardByStudent(schoolId: string, studentId: string) {
        return await prisma.studentIDCard.findFirst({
            where: { school_id: schoolId, student_id: studentId },
            include: {
                student: true,
                school: true
            }
        });
    }
}
