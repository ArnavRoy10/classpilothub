// Everything shown on the About page and next to your photo in the founder console.
// Edit the text below to make it yours.

export const FOUNDER = {
  name: 'Arnav Roy',
  role: 'Founder, ClassPilot',
  // Put your photo in the "public" folder with this exact file name (see the notes below the code).
  photo: '/founder.jpg',
  email: 'hello@classpilot.app',

  headline: 'I build tools that give teachers their time back.',
  intro:
    'I’m the founder of ClassPilot, a workspace for tutors, teachers and coaching centers to run attendance, fees, tests and results without the paperwork.',

  story: [
    'ClassPilot exists because running a class should not mean running after registers, reminders and spreadsheets. Teaching is the work. Everything around it should stay out of the way.',
    'So I’m building one clear place where a tutor or a coaching center can keep students, batches, attendance, fees and results together, and where every teacher and student gets exactly the access they need.',
    'It is still growing, and I read every message. If something in ClassPilot confuses you or is missing, tell me.',
  ],

  principles: [
    { title: 'Clear over clever', text: 'Every screen should be understandable on the first visit, without a manual.' },
    { title: 'Your data stays yours', text: 'Each organization only ever sees its own students, fees and records.' },
    { title: 'Built for real classes', text: 'Attendance, fees, tests and results live together, because that is how a day at a center actually works.' },
  ],
} as const

export function initialsOf(name: string) {
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}
