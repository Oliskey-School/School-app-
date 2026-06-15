import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { TimetableService } from '../../src/services/timetable.service';

const S = 'ttc-school', B = 'ttc-main';
async function cleanup(){ await (prisma as any).timetable.deleteMany({where:{school_id:S}}).catch(()=>{}); await prisma.branch.deleteMany({where:{school_id:S}}).catch(()=>{}); await prisma.school.delete({where:{id:S}}).catch(()=>{}); }
describe('Timetable create sanitizes UI-only fields', () => {
  beforeAll(async()=>{ await cleanup(); await prisma.school.create({data:{id:S,name:'TTC',code:'TTC',slug:S,plan_type:'enterprise',subscription_status:'active'}}); await prisma.branch.create({data:{id:B,school_id:S,name:'Main',code:'MAIN',is_main:true}}); },120000);
  afterAll(cleanup,120000);
  it('accepts the Editor payload (day/period_index/status) and maps day->day_of_week', async () => {
    const row = await TimetableService.createTimetable(S, {
      day: 'Monday', period_index: 0, status: 'Published',
      start_time: '08:00', end_time: '08:45', subject: 'Financial Accounting',
      class_name: 'SSS 3', teacher_id: null, branch_id: B,
    });
    expect(row).toBeTruthy();
    expect(row.day_of_week).toBe(1);
    expect(row.subject).toBe('Financial Accounting');
    expect(row.class_name).toBe('SSS 3');
    expect(row.branch_id).toBe(B);
  });
});
