import { isDemoMode } from '../lib/config';

export const IS_DEMO = isDemoMode;

export interface DemoCapture {
  id: string;
  audioUrl: string;
  transcript: string;
  summary: string;
  actionItems: string[];
  tags: string[];
  priority: 'high' | 'medium' | 'low';
  createdAt: number;
  completedActions: string[];
}

export const DEMO_CAPTURES: DemoCapture[] = [
  {
    // Work planning capture
    id: 'capture1',
    audioUrl: '',
    transcript:
      "Okay, for this week I need to prioritize three things. First, finish the onboarding redesign — that's blocking the growth team. Second, set up the analytics pipeline so we can actually measure what's converting. Third, do a quick sync with design before Thursday's deadline. Everything else can wait until next sprint.",
    summary: 'This week: ship onboarding redesign, analytics pipeline, and design sync before Thursday.',
    actionItems: [
      'Finish onboarding redesign — unblocks growth team',
      'Set up analytics pipeline for conversion tracking',
      'Schedule design sync before Thursday',
    ],
    tags: ['task'],
    priority: 'high',
    createdAt: Date.now() - 3_600_000,
    completedActions: [],
  },
  {
    // Creative idea capture
    id: 'capture2',
    audioUrl: '',
    transcript:
      "I had this idea for a subscription model where users pay per insight rather than a flat fee. Like, you get 10 free insights a month and then pay a tiny amount for each one after that. The friction of paying per use would make people value each insight more. Worth prototyping with a toggle in the current paywall flow.",
    summary: 'Micro-payment idea: pay-per-insight with 10 free/month — could improve perceived value.',
    actionItems: [
      'Prototype pay-per-insight toggle in paywall flow',
      'Research user willingness-to-pay per insight',
    ],
    tags: ['idea'],
    priority: 'medium',
    createdAt: Date.now() - 86_400_000,
    completedActions: [],
  },
  {
    // Feeling / reflection capture
    id: 'capture3',
    audioUrl: '',
    transcript:
      "I've been feeling really scattered this week. Too many context switches, too many Slack pings. I'm not doing deep work anymore — everything is shallow and reactive. I think I need to block out two hours every morning where I'm completely offline, no notifications, just focused work. That used to be how I did my best thinking.",
    summary: 'Feeling scattered from context-switching — need to protect deep work blocks each morning.',
    actionItems: [
      'Block 2-hour deep work window on calendar (mornings)',
      'Turn off Slack notifications during focus blocks',
    ],
    tags: ['feeling'],
    priority: 'medium',
    createdAt: Date.now() - 2 * 86_400_000,
    completedActions: [],
  },
  {
    // Question capture
    id: 'capture4',
    audioUrl: '',
    transcript:
      "What if the journal tab auto-summarized your last 7 days of captures into a weekly insight? AI picks the recurring themes, surfaces what you keep coming back to. That would show people patterns they don't see themselves. But I'm wondering — would users actually read a weekly summary, or would it just become noise like every other notification?",
    summary: 'Weekly AI insight digest — surfaces recurring themes from 7 days of captures.',
    actionItems: [
      'Design weekly digest feature spec',
      'Explore GPT prompt for theme extraction across captures',
      'A/B test digest notification open rate',
    ],
    tags: ['idea', 'question'],
    priority: 'low',
    createdAt: Date.now() - 3 * 86_400_000,
    completedActions: [],
  },
];

export const DEMO_ACTIVE_TRANSCRIPT =
  "I keep thinking about the onboarding flow — we're losing people on slide two. " +
  'The problem is the value prop isn\'t clear enough. We should lead with the outcome, not the feature. ' +
  'Show them a before and after: cluttered mind versus clean, organized thoughts. ' +
  "That emotional hook will convert way better than explaining how Whisper transcription works.";

export interface DemoSession {
  id: string;
  type: 'meditation' | 'breathwork';
  durationSeconds: number;
  completedAt: number;
}

export const DEMO_SESSIONS: DemoSession[] = [
  { id: 'ds1', type: 'meditation', durationSeconds: 300, completedAt: Date.now() - 2 * 3600_000 },
  { id: 'ds2', type: 'breathwork', durationSeconds: 240, completedAt: Date.now() - 26 * 3600_000 },
  { id: 'ds3', type: 'meditation', durationSeconds: 600, completedAt: Date.now() - 3 * 86_400_000 },
];
