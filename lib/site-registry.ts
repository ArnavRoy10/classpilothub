import { FOUNDER } from '@/lib/founder-profile'

export type FieldKind = 'text' | 'rich' | 'email'

export type FieldDef = {
  key: string
  page: 'Home' | 'About' | 'Footer & contact'
  group: string
  label: string
  kind: FieldKind
  default: string
  hint?: string
}

export const SITE_PAGES = ['Home', 'About', 'Footer & contact'] as const

export const SITE_FIELDS: FieldDef[] = [
  // ---------------- Home: hero ----------------
  { page: 'Home', group: 'Top section (hero)', key: 'home.hero.badge', label: 'Small badge above the headline', kind: 'text', default: 'Built for tutors, teachers & coaching centers' },
  { page: 'Home', group: 'Top section (hero)', key: 'home.hero.line1', label: 'Headline, first line', kind: 'text', default: 'Run the class.' },
  { page: 'Home', group: 'Top section (hero)', key: 'home.hero.line2', label: 'Headline, second line (coloured)', kind: 'text', default: 'Not the chaos.' },
  { page: 'Home', group: 'Top section (hero)', key: 'home.hero.body', label: 'Paragraph under the headline', kind: 'rich', default: 'ClassPilot gives tutors and coaching centers one clear workspace for students, batches, attendance, fees, and results — so every day starts with less chasing and more teaching.' },
  { page: 'Home', group: 'Top section (hero)', key: 'home.hero.cta1', label: 'Main button', kind: 'text', default: 'Start free trial' },
  { page: 'Home', group: 'Top section (hero)', key: 'home.hero.cta2', label: 'Second button (opens an email)', kind: 'text', default: 'Book a demo' },
  { page: 'Home', group: 'Top section (hero)', key: 'home.hero.h1', label: 'Tick line 1', kind: 'text', default: 'No setup fees' },
  { page: 'Home', group: 'Top section (hero)', key: 'home.hero.h2', label: 'Tick line 2', kind: 'text', default: '14-day free trial' },
  { page: 'Home', group: 'Top section (hero)', key: 'home.hero.h3', label: 'Tick line 3', kind: 'text', default: 'Cancel anytime' },

  // ---------------- Home: audiences ----------------
  { page: 'Home', group: 'Three audiences', key: 'home.audiences.eyebrow', label: 'Small label', kind: 'text', default: 'Who it is for' },
  { page: 'Home', group: 'Three audiences', key: 'home.audiences.title', label: 'Heading', kind: 'text', default: 'One platform, three ways to teach' },
  { page: 'Home', group: 'Three audiences', key: 'home.audiences.body', label: 'Paragraph', kind: 'rich', default: "Whether you teach at a student's home or run a full center, ClassPilot fits the way you work." },

  // ---------------- Home: closing call to action ----------------
  { page: 'Home', group: 'Closing call to action', key: 'cta.title1', label: 'Heading, first part', kind: 'text', default: 'Make your next class' },
  { page: 'Home', group: 'Closing call to action', key: 'cta.title2', label: 'Heading, coloured part', kind: 'text', default: 'easier to run' },
  { page: 'Home', group: 'Closing call to action', key: 'cta.body', label: 'Paragraph', kind: 'rich', default: 'Bring your people, classes, and daily follow-through into one dependable workspace. Start your free trial today, or let us walk you through it first.' },
  { page: 'Home', group: 'Closing call to action', key: 'cta.button1', label: 'Main button', kind: 'text', default: 'Start free trial' },
  { page: 'Home', group: 'Closing call to action', key: 'cta.button2', label: 'Second button', kind: 'text', default: 'View pricing' },

  // ---------------- About ----------------
  { page: 'About', group: 'Introduction', key: 'about.name', label: 'Your name', kind: 'text', default: FOUNDER.name },
  { page: 'About', group: 'Introduction', key: 'about.role', label: 'Your title', kind: 'text', default: FOUNDER.role },
  { page: 'About', group: 'Introduction', key: 'about.headline', label: 'Big headline', kind: 'text', default: FOUNDER.headline },
  { page: 'About', group: 'Introduction', key: 'about.intro', label: 'Introduction paragraph', kind: 'rich', default: FOUNDER.intro },
  { page: 'About', group: 'Story', key: 'about.story1', label: 'Story paragraph 1', kind: 'rich', default: FOUNDER.story[0] },
  { page: 'About', group: 'Story', key: 'about.story2', label: 'Story paragraph 2', kind: 'rich', default: FOUNDER.story[1] },
  { page: 'About', group: 'Story', key: 'about.story3', label: 'Story paragraph 3', kind: 'rich', default: FOUNDER.story[2] },
  { page: 'About', group: 'What I care about', key: 'about.p1.title', label: 'Point 1 title', kind: 'text', default: FOUNDER.principles[0].title },
  { page: 'About', group: 'What I care about', key: 'about.p1.text', label: 'Point 1 text', kind: 'rich', default: FOUNDER.principles[0].text },
  { page: 'About', group: 'What I care about', key: 'about.p2.title', label: 'Point 2 title', kind: 'text', default: FOUNDER.principles[1].title },
  { page: 'About', group: 'What I care about', key: 'about.p2.text', label: 'Point 2 text', kind: 'rich', default: FOUNDER.principles[1].text },
  { page: 'About', group: 'What I care about', key: 'about.p3.title', label: 'Point 3 title', kind: 'text', default: FOUNDER.principles[2].title },
  { page: 'About', group: 'What I care about', key: 'about.p3.text', label: 'Point 3 text', kind: 'rich', default: FOUNDER.principles[2].text },

  // ---------------- Footer and contact ----------------
  { page: 'Footer & contact', group: 'Contact', key: 'site.contactEmail', label: 'Contact email', kind: 'email', default: 'hello@classpilot.app', hint: 'Used by "Book a demo", the footer Contact link and the About page.' },
  { page: 'Footer & contact', group: 'Footer', key: 'footer.about', label: 'Text under the logo', kind: 'text', default: 'A focused workspace for coaching centers to manage people, classes, attendance, fees, and results in one place.' },
  { page: 'Footer & contact', group: 'Footer', key: 'footer.copyright', label: 'Copyright line', kind: 'text', default: '© {year} ClassPilot. All rights reserved.', hint: '{year} becomes the current year automatically.' },
  { page: 'Footer & contact', group: 'Footer', key: 'footer.tagline', label: 'Bottom-right line', kind: 'text', default: 'Built for coaching centers everywhere.' },
]
