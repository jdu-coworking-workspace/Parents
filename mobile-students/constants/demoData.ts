import type { StudentUser } from '@/types/auth';
import type { Message } from '@/types/message';

export const DEMO_CREDENTIALS = {
  email: 'demo@student.com',
  password: 'Demo123!',
};

export const DEMO_USER: StudentUser = {
  id: 9999,
  email: DEMO_CREDENTIALS.email,
  phone_number: '+998901234567',
  given_name: 'Demo',
  family_name: 'Student',
};

export const DEMO_SCHOOL_NAME = 'Demo Elementary School';

export const DEMO_MESSAGES: Message[] = [
  {
    id: 9001,
    title: 'Science Fair Project Reminder',
    content:
      'Please bring your science fair poster and project notebook tomorrow. Presentations begin after homeroom, and your group will present in the second session.',
    priority: 'high',
    group_name: 'Science Class',
    edited_at: '2026-07-25T08:30:00Z',
    images: null,
    sent_time: '2026-07-25T08:30:00Z',
    viewed_at: null,
  },
  {
    id: 9002,
    title: 'Math Quiz Results',
    content:
      'Your latest algebra quiz has been graded. You improved on equation solving and should review word problems before next week.',
    priority: 'medium',
    group_name: 'Mathematics',
    edited_at: '2026-07-24T12:10:00Z',
    images: null,
    sent_time: '2026-07-24T12:10:00Z',
    viewed_at: null,
  },
  {
    id: 9003,
    title: 'Library Book Return',
    content:
      'Your borrowed library books are due this Friday. Please return them before lunch or renew them at the library desk.',
    priority: 'low',
    group_name: 'Library',
    edited_at: '2026-07-23T09:00:00Z',
    images: null,
    sent_time: '2026-07-23T09:00:00Z',
    viewed_at: '2026-07-23T10:20:00Z',
  },
  {
    id: 9004,
    title: 'Field Trip Schedule',
    content:
      'The museum field trip bus leaves school at 9:15 AM. Please wear comfortable shoes and bring your student ID.',
    priority: 'medium',
    group_name: 'Grade 8',
    edited_at: '2026-07-22T14:45:00Z',
    images: [
      'https://images.unsplash.com/photo-1566127992631-137a642a90f4?w=800&auto=format&fit=crop',
    ],
    sent_time: '2026-07-22T14:45:00Z',
    viewed_at: '2026-07-22T15:30:00Z',
  },
  {
    id: 9005,
    title: 'English Reading Assignment',
    content:
      'Read chapters 6 and 7 before Monday. Write down two questions you would like to discuss in class.',
    priority: 'medium',
    group_name: 'English Literature',
    edited_at: '2026-07-21T11:15:00Z',
    images: null,
    sent_time: '2026-07-21T11:15:00Z',
    viewed_at: '2026-07-21T12:00:00Z',
  },
  {
    id: 9006,
    title: 'Art Workshop Materials',
    content:
      'For tomorrow’s art workshop, please bring colored pencils, scissors, and any photos you want to use in your collage.',
    priority: 'low',
    group_name: 'Art Club',
    edited_at: '2026-07-20T13:25:00Z',
    images: [
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop',
    ],
    sent_time: '2026-07-20T13:25:00Z',
    viewed_at: '2026-07-20T16:10:00Z',
  },
  {
    id: 9007,
    title: 'Basketball Practice Update',
    content:
      'Practice has moved to the indoor gym because of the weather. Please arrive by 4:00 PM and bring indoor shoes.',
    priority: 'medium',
    group_name: 'Basketball Team',
    edited_at: '2026-07-19T07:40:00Z',
    images: null,
    sent_time: '2026-07-19T07:40:00Z',
    viewed_at: '2026-07-19T08:05:00Z',
  },
  {
    id: 9008,
    title: 'School Lunch Menu',
    content:
      'Next week’s lunch menu is available. Vegetarian options are listed for each day, and allergy information is posted in the cafeteria.',
    priority: 'low',
    group_name: 'General Announcements',
    edited_at: '2026-07-18T10:00:00Z',
    images: [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop',
    ],
    sent_time: '2026-07-18T10:00:00Z',
    viewed_at: '2026-07-18T11:45:00Z',
  },
  {
    id: 9009,
    title: 'Computer Lab Reservation',
    content:
      'Your class will use the computer lab during period 3 for presentation practice. Save your files to your school drive before class ends.',
    priority: 'medium',
    group_name: 'Computer Science',
    edited_at: '2026-07-17T15:15:00Z',
    images: null,
    sent_time: '2026-07-17T15:15:00Z',
    viewed_at: '2026-07-17T15:50:00Z',
  },
  {
    id: 9010,
    title: 'Music Recital Rehearsal',
    content:
      'Final rehearsal for the summer recital starts at 3:30 PM in the auditorium. Bring your sheet music and instrument.',
    priority: 'high',
    group_name: 'Music Department',
    edited_at: '2026-07-16T09:30:00Z',
    images: null,
    sent_time: '2026-07-16T09:30:00Z',
    viewed_at: '2026-07-16T10:10:00Z',
  },
  {
    id: 9011,
    title: 'Health Check Reminder',
    content:
      'Please submit your annual health check form by the end of the week. Forms can be turned in at the school office.',
    priority: 'medium',
    group_name: 'School Office',
    edited_at: '2026-07-15T08:20:00Z',
    images: null,
    sent_time: '2026-07-15T08:20:00Z',
    viewed_at: '2026-07-15T09:00:00Z',
  },
  {
    id: 9012,
    title: 'Reading Challenge Progress',
    content:
      'You have completed four books in the summer reading challenge. One more book will unlock the next achievement badge.',
    priority: 'low',
    group_name: 'Reading Club',
    edited_at: '2026-07-14T16:05:00Z',
    images: [
      'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&auto=format&fit=crop',
    ],
    sent_time: '2026-07-14T16:05:00Z',
    viewed_at: '2026-07-14T17:35:00Z',
  },
];
