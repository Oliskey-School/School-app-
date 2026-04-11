import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export const getTemplateByType = async (req: Request, res: Response) => {
    try {
        const { type } = req.params;
        const template = await prisma.inspectionTemplate.findUnique({
            where: { inspection_type: type },
        });

        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        res.json(template);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const submitInspection = async (req: AuthRequest, res: Response) => {
    try {
        const { 
            school_id, 
            template_id, 
            inspector_id, 
            responses, 
            photos, 
            scores, 
            escalations,
            signature_inspector,
            signature_school,
            overall_score,
            overall_grade
        } = req.body;

        // Execute as a transaction to ensure data integrity
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the main inspection record
            const inspection = await tx.inspection.create({
                data: {
                    school_id,
                    template_id,
                    inspector_id,
                    status: escalations?.length > 0 ? 'escalated' : 'completed',
                    overall_score,
                    overall_grade,
                    signature_inspector,
                    signature_school,
                    end_time: new Date(),
                }
            });

            // 2. Create responses
            if (responses && responses.length > 0) {
                await tx.inspectionResponse.createMany({
                    data: responses.map((r: any) => ({
                        inspection_id: inspection.id,
                        field_id: r.field_id,
                        value: r.value,
                        score: r.score,
                        is_violation: r.is_violation,
                        comment: r.comment
                    }))
                });
            }

            // 3. Create photos with optional annotations
            if (photos && photos.length > 0) {
                await tx.inspectionPhoto.createMany({
                    data: photos.map((p: any) => ({
                        inspection_id: inspection.id,
                        field_id: p.field_id,
                        url: p.url,
                        annotation: p.annotation,
                        caption: p.caption
                    }))
                });
            }

            // 4. Create escalations if any
            if (escalations && escalations.length > 0) {
                await tx.inspectionEscalation.createMany({
                    data: escalations.map((e: any) => ({
                        inspection_id: inspection.id,
                        level: e.level,
                        reason: e.reason,
                        status: 'open'
                    }))
                });
            }

            return inspection;
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error('[Inspection Submission Error]:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getSchoolInspectionHistory = async (req: Request, res: Response) => {
    try {
        const { schoolId } = req.params;
        const history = await prisma.inspection.findMany({
            where: { school_id: schoolId },
            include: {
                template: true,
                escalations: true
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(history);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
