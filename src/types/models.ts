// Shared TypeScript interfaces — mirrored from web app
// Keep in sync with backend model classes

// ── Dashboard ──────────────────────────────────────────────────────────────
export interface DashboardData {
  todayHabits:     { total: number; completed: number }
  focusTask:       { id: string; title: string; completed: boolean } | null
  journalToday:    { morning: boolean; evening: boolean }
  activeGoals:     number
  weekFocusMinutes:number
  topStreaks:       { habitId: string; name: string; streak: number }[]
  netWorth:        number
  booksReading:    number
  socialOverdue:   number
  reflectionMood:  number | null
}

// ── Habits ─────────────────────────────────────────────────────────────────
export interface Habit {
  id:          string
  name:        string
  icon:        string | null
  color:       string | null
  description: string | null
  frequency:   string
  active:      boolean
}

export interface HabitLog {
  id:        string
  habitId:   string
  date:      string
  completed: boolean
}

// ── Tasks ──────────────────────────────────────────────────────────────────
export interface Task {
  id:          string
  title:       string
  description: string | null
  quadrant:    'DO' | 'SCHEDULE' | 'DELEGATE' | 'ELIMINATE'
  completed:   boolean
  dueDate:     string | null
  isFocus:     boolean
  notes:       string | null
  urgent?:     boolean   // derived: quadrant === 'DO' || quadrant === 'DELEGATE'
  important?:  boolean   // derived: quadrant === 'DO' || quadrant === 'SCHEDULE'
}

// ── Journal ────────────────────────────────────────────────────────────────
export interface JournalEntry {
  id:         string
  entryDate:  string
  period:     'morning' | 'evening'
  mood:       number
  content:    string
  highlights: string | null
  gratitude:  string | null
}

// ── Goals ──────────────────────────────────────────────────────────────────
export interface Goal {
  id:          string
  title:       string
  description: string | null
  category:    string
  timeframe:   string
  status:      string
  milestones:  GoalMilestone[]
}

export interface GoalMilestone {
  id:        string
  label:     string
  done:      boolean
  sortOrder: number
}

// ── Notes ──────────────────────────────────────────────────────────────────
export interface Note {
  id:       string
  title:    string
  content:  string
  parentId: string | null
  children: Note[]
  path:     string
}

// ── Health ─────────────────────────────────────────────────────────────────
export interface HealthLog {
  id:        string
  logDate:   string
  weight:    number
  sleep:     number
  heartRate: number
  steps:     number
  workout:   string
  notes:     string
}

// ── Reading ────────────────────────────────────────────────────────────────
export interface Book {
  id:           string
  status:       'reading' | 'want' | 'finished'
  title:        string
  author:       string
  pages:        number
  progress:     number
  rating:       number
  genre:        string
  notes:        string
  dateStarted?:  string
  dateFinished?: string
  dateAdded?:    string
}

// ── Social ─────────────────────────────────────────────────────────────────
export interface SocialConnection {
  id:          string
  name:        string
  relationship:string
  notes:       string | null
  lastContact: string | null
  birthday:    string | null
  colorVar:    string
}

// ── Trips ──────────────────────────────────────────────────────────────────
export interface Trip {
  id:         string
  city:       string
  country:    string
  flag:       string | null
  startDate:  string
  endDate:    string
  days:       number | null
  rating:     number
  highlights: string | null
  notes:      string | null
  photoUrl:   string | null
}

// ── Experiences ────────────────────────────────────────────────────────────
export interface Experience {
  id:          string
  title:       string
  category:    string
  subCategory: string | null
  expDate:     string
  rating:      number
  location:    string | null
  note:        string | null
}

// ── Reflections ────────────────────────────────────────────────────────────
export interface Reflection {
  id:         string
  refDate:    string
  mood:       number
  wentWell:   string | null
  improve:    string | null
  gratitude:  string | null
  tomorrow:   string | null
}

// ── Career ─────────────────────────────────────────────────────────────────
export interface CareerRole {
  id:        string
  title:     string
  company:   string
  startDate: string
  endDate:   string
  isCurrent: boolean
  highlights:string
  techTags:  string
  sortOrder: number
}

export interface CareerSkill {
  id:       string
  name:     string
  level:    number
  category: string
}

export interface CareerAchievement {
  id:       string
  title:    string
  achDate:  string
  impact:   string
  category: string
}

export interface CareerSalary {
  id:        string
  role:      string
  company:   string
  years:     string
  salary:    number
  sortOrder: number
}

// ── Finance ────────────────────────────────────────────────────────────────
export interface Asset {
  id:       string
  category: string
  name:     string
  value:    number
  acquired: string
  notes:    string
}

export interface Liability {
  id:       string
  category: string
  name:     string
  balance:  number
  rate:     number
  monthly:  number
  notes:    string
}

export interface NetWorthData {
  totalAssets:      number
  totalLiabilities: number
  netWorth:         number
}

export interface FinGoal {
  id:       string
  emoji:    string
  name:     string
  target:   number
  saved:    number
  monthly:  number
  deadline: string
  category: string
  priority: 'high' | 'medium' | 'low'
  notes:    string
}

// ── Timer ──────────────────────────────────────────────────────────────────
export interface TimerSession {
  id:       string
  sessionDate: string
  mode:     string
  duration: number
  taskId:   string | null
}
