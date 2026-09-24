require('dotenv').config();

if (process.env.NODE_ENV !== 'development') {
  throw new Error('Demo data can only be seeded when NODE_ENV=development.');
}

const connectDB = require('../src/config/database');
const User = require('../src/models/User');
const Student = require('../src/models/Student');
const Class = require('../src/models/Class');
const Attendance = require('../src/models/Attendance');

const demoPassword = process.env.DEMO_ACCOUNT_PASSWORD || 'TouchMarkDemo123!';
const adminEmail = (process.env.DEMO_ADMIN_EMAIL || 'admin@touchmark.local').toLowerCase();
if (demoPassword.length < 8) throw new Error('DEMO_ACCOUNT_PASSWORD must have at least 8 characters.');

const teachers = [
  { name: 'Maya Patel', email: 'maya.patel@touchmark.local', role: 'teacher' },
  { name: 'Daniel Kim', email: 'daniel.kim@touchmark.local', role: 'teacher' },
];

const studentRows = [
  ['Aarav Mehta', 'TM24CS001', 'aarav.mehta@student.touchmark.local'],
  ['Diya Sharma', 'TM24CS002', 'diya.sharma@student.touchmark.local'],
  ['Kabir Singh', 'TM24CS003', 'kabir.singh@student.touchmark.local'],
  ['Ananya Iyer', 'TM24CS004', 'ananya.iyer@student.touchmark.local'],
  ['Vivaan Gupta', 'TM24CS005', 'vivaan.gupta@student.touchmark.local'],
  ['Saanvi Rao', 'TM24CS006', 'saanvi.rao@student.touchmark.local'],
  ['Arjun Nair', 'TM24CS007', 'arjun.nair@student.touchmark.local'],
  ['Ishita Das', 'TM24CS008', 'ishita.das@student.touchmark.local'],
  ['Reyansh Verma', 'TM24CS009', 'reyansh.verma@student.touchmark.local'],
  ['Myra Joshi', 'TM24CS010', 'myra.joshi@student.touchmark.local'],
];

const classRows = [
  { name: 'Web Application Engineering', code: 'CS301', subject: 'Full Stack Development', teacher: teachers[0].name, days: ['Monday', 'Wednesday'], startTime: '09:00', endTime: '10:30' },
  { name: 'Database Systems', code: 'CS302', subject: 'Data Modeling & SQL', teacher: teachers[0].name, days: ['Tuesday', 'Thursday'], startTime: '11:00', endTime: '12:30' },
  { name: 'Embedded Systems', code: 'EC204', subject: 'Microcontrollers & IoT', teacher: teachers[1].name, days: ['Monday', 'Friday'], startTime: '13:00', endTime: '14:30' },
  { name: 'Applied Mathematics', code: 'MA210', subject: 'Probability & Statistics', teacher: teachers[1].name, days: ['Wednesday', 'Friday'], startTime: '10:00', endTime: '11:30' },
];

async function ensureUser(data) {
  let user = await User.findOne({ email: data.email });
  if (!user) {
    user = await User.create({ ...data, password: demoPassword });
    console.log(`Created ${data.role}: ${data.email}`);
  }
  return user;
}

async function seed() {
  await connectDB();
  await ensureUser({ name: 'TouchMark Administrator', email: adminEmail, role: 'admin' });
  for (const teacher of teachers) await ensureUser(teacher);

  const students = [];
  for (const [name, rollNumber, email] of studentRows) {
    let student = await Student.findOne({ rollNumber });
    if (!student) {
      student = await Student.create({ name, rollNumber, email, phone: '', isFingerprintRegistered: false, classes: [] });
    }
    await ensureUser({ name, email, role: 'student', rollNumber, studentId: student._id });
    students.push(student);
  }

  const classes = [];
  for (const row of classRows) {
    let classItem = await Class.findOne({ code: row.code });
    if (!classItem) classItem = new Class({ code: row.code });
    classItem.set({
      name: row.name,
      subject: row.subject,
      teacher: row.teacher,
      schedule: { days: row.days, startTime: row.startTime, endTime: row.endTime },
      isActive: true,
    });
    classes.push(await classItem.save());
  }

  for (const [index, student] of students.entries()) {
    const assigned = [classes[index % classes.length], classes[(index + 1) % classes.length]];
    student.classes = assigned.map((classItem) => classItem._id);
    await student.save();
    for (const classItem of assigned) {
      if (!classItem.students.some((id) => id.equals(student._id))) classItem.students.push(student._id);
    }
  }
  await Promise.all(classes.map((classItem) => classItem.save()));

  const sessionDates = [];
  const cursor = new Date();
  cursor.setHours(9, 5, 0, 0);
  while (sessionDates.length < 5) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) sessionDates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }

  let attendanceCreated = 0;
  for (const [studentIndex, student] of students.entries()) {
    for (const classItem of student.classes) {
      for (const [sessionIndex, sessionDate] of sessionDates.entries()) {
        const dayStart = new Date(sessionDate);
        dayStart.setHours(0, 0, 0, 0);
        const nextDay = new Date(dayStart);
        nextDay.setDate(nextDay.getDate() + 1);
        const exists = await Attendance.exists({ student: student._id, class: classItem, date: { $gte: dayStart, $lt: nextDay } });
        if (exists) continue;
        const markedAt = new Date(sessionDate);
        markedAt.setMinutes(markedAt.getMinutes() + ((studentIndex * 7 + sessionIndex * 11) % 45));
        const status = (studentIndex + sessionIndex) % 13 === 0 ? 'late' : (studentIndex + sessionIndex) % 17 === 0 ? 'absent' : 'present';
        await Attendance.create({ student: student._id, class: classItem, date: markedAt, markedAt, status, markedBy: 'teacher' });
        attendanceCreated += 1;
      }
    }
  }

  console.log(`Demo data ready: ${students.length} students, ${classes.length} classes, ${attendanceCreated} new attendance records.`);
  console.log(`Admin sign-in: ${adminEmail}`);
  console.log(`Demo account password: ${demoPassword}`);
  await require('mongoose').disconnect();
}

seed().catch(async (error) => {
  console.error('Could not seed demo data:', error);
  await require('mongoose').disconnect();
  process.exitCode = 1;
});
