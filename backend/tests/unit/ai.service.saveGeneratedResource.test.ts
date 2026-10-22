/**
 * AiService.saveGeneratedResource — ownership and scope come from the session.
 * A body-supplied teacher_id / school_id / branch_id / id must never reach the
 * row, and an update may only change the editable fields.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const prismaMock = {
    teacher: { findUnique: vi.fn() },
    generatedResource: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
};
vi.mock('../../src/config/database', () => ({ default: prismaMock }));
vi.mock('../../src/services/socket.service', () => ({ SocketService: { emitToSchool: vi.fn() } }));

const { AiService } = await import('../../src/services/ai.service');

const hostileBody = {
    teacher_id: 'someone-elses-teacher-id',
    school_id: 'other-school',
    branch_id: 'other-branch',
    id: 'forced-id',
    created_at: '2000-01-01',
    subject: 'Mathematics',
    class_name: 'SSS 1 A',
    content_type: 'generated_resources',
    content: '{"terms":[]}',
};

beforeEach(() => {
    Object.values(prismaMock).forEach(m => Object.values(m).forEach((fn: any) => fn.mockReset()));
    prismaMock.teacher.findUnique.mockResolvedValue({ id: 'my-teacher-id' });
    prismaMock.generatedResource.create.mockImplementation(async ({ data }: any) => ({ id: 'new', ...data }));
    prismaMock.generatedResource.update.mockImplementation(async ({ data }: any) => ({ id: 'row-1', ...data }));
});

describe('AiService.saveGeneratedResource', () => {
    it('creates the row for the caller\'s own teacher record, in the token\'s school and branch', async () => {
        prismaMock.generatedResource.findFirst.mockResolvedValue(null);
        await AiService.saveGeneratedResource('my-school', 'my-branch', hostileBody, 'user-1');

        expect(prismaMock.teacher.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { user_id: 'user-1' } }));
        expect(prismaMock.generatedResource.findFirst.mock.calls[0][0].where).toMatchObject({ teacher_id: 'my-teacher-id', school_id: 'my-school', branch_id: 'my-branch' });
        const data = prismaMock.generatedResource.create.mock.calls[0][0].data;
        expect(data).toMatchObject({ teacher_id: 'my-teacher-id', school_id: 'my-school', branch_id: 'my-branch', subject: 'Mathematics', content: '{"terms":[]}' });
        expect(data.id).toBeUndefined();
        expect(data.created_at).toBeUndefined();
    });

    it('an update only changes the editable fields', async () => {
        prismaMock.generatedResource.findFirst.mockResolvedValue({ id: 'row-1' });
        await AiService.saveGeneratedResource('my-school', 'my-branch', hostileBody, 'user-1');
        const { where, data } = prismaMock.generatedResource.update.mock.calls[0][0];
        expect(where).toEqual({ id: 'row-1' });
        expect(Object.keys(data).sort()).toEqual(['content', 'updated_at', 'updated_by']);
    });

    it('rejects a caller with no teacher record (403) and writes nothing', async () => {
        prismaMock.teacher.findUnique.mockResolvedValue(null);
        await expect(AiService.saveGeneratedResource('my-school', 'my-branch', hostileBody, 'admin-user')).rejects.toMatchObject({ status: 403 });
        expect(prismaMock.generatedResource.create).not.toHaveBeenCalled();
        expect(prismaMock.generatedResource.update).not.toHaveBeenCalled();
    });

    it('rejects a body without subject/class/content type (400)', async () => {
        await expect(AiService.saveGeneratedResource('my-school', 'my-branch', { content: 'x' }, 'user-1')).rejects.toMatchObject({ status: 400 });
    });
});
