import prisma from '../config/database';
import { TimetableService } from '../services/timetable.service';

const DEMO = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

async function main() {
    const base = { class_name: '__STATUS_TEST__', subject: 'X', start_time: '08:00', end_time: '08:45', day_of_week: 1 };
    const pub = await TimetableService.createTimetable(DEMO, { ...base, status: 'Published' });
    const draft = await TimetableService.createTimetable(DEMO, { ...base, start_time: '08:45' }); // no status
    const fetchedPub = await prisma.timetable.findUnique({ where: { id: pub.id }, select: { status: true } });
    const fetchedDraft = await prisma.timetable.findUnique({ where: { id: draft.id }, select: { status: true } });
    console.log('published row status:', fetchedPub?.status);
    console.log('default row status:  ', fetchedDraft?.status);
    await prisma.timetable.deleteMany({ where: { class_name: '__STATUS_TEST__' } });
    console.log('cleanup done');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
