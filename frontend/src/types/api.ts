export type User = {
  id: number
  fullName: string | null
  email: string
  createdAt: string
  updatedAt: string | null
  initials: string
}

export type Student = {
  id: number
  userId: number
  name: string
  birthdate: string | null
  instrument: string
  phone: string | null
  description: string | null
  preferredWeekday: number | null
  preferredTime: string | null
  createdAt: string
  updatedAt: string | null
  creditsRemaining: number
  activePlansCount: number
}

export type PlanPackage = 'single' | 'pack_4' | 'pack_8'
export type PlanStatus = 'pending' | 'paid' | 'cancelled'

export type Plan = {
  id: number
  userId: number
  studentId: number
  package: PlanPackage
  lessonsTotal: number
  price: number
  status: PlanStatus
  paidAt: string | null
  expiresAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string | null
  lessonsDone: number
  lessonsRemaining: number
  lessonsSchedulable: number
}

export type LessonStatus = 'scheduled' | 'done' | 'cancelled' | 'no_show'

export type Lesson = {
  id: number
  userId: number
  studentId: number
  planId: number
  scheduledAt: string
  status: LessonStatus
  description: string | null
  createdAt: string
  updatedAt: string | null
  studentName: string | null
  studentInstrument: string | null
  planPackage: PlanPackage | null
}

export type PackageOption = {
  value: PlanPackage
  lessons: number
  price: number
  label: string
}

export type Catalog = {
  packages: PackageOption[]
  lessonDurationMinutes: number
  creditValidityDays: number
  lowCreditThreshold: number
}

export type PlanAlert = {
  planId: number
  studentId: number
  studentName: string | null
  package: PlanPackage
  price: number
  status: PlanStatus
  lessonsRemaining: number
  lessonsTotal: number
  expiresAt: string | null
}

export type Dashboard = {
  studentCount: number
  activePlans: number
  scheduledCount: number
  doneCount: number
  revenue: number
  revenueThisMonth: number
  pendingPlans: number
  pendingAmount: number
  unpaidPlans: PlanAlert[]
  lowCredits: PlanAlert[]
  expiringSoon: PlanAlert[]
  expiredPlans: PlanAlert[]
  overdue: Lesson[]
  today: Lesson[]
  upcoming: Lesson[]
  recent: Lesson[]
}

export type ApiData<T> = { data: T }

export type VineError = {
  message: string
  field?: string
  rule?: string
}

export type ApiErrorBody = {
  message?: string
  code?: string
  errors?: VineError[]
}

export type CreateStudentInput = {
  name: string
  instrument: string
  birthdate?: string | null
  phone?: string | null
  description?: string | null
  preferredWeekday?: number | null
  preferredTime?: string | null
}

export type UpdateStudentInput = Partial<CreateStudentInput>

export type CreatePlanInput = {
  studentId: number
  package: PlanPackage
  status?: PlanStatus
  paidAt?: string | null
  notes?: string | null
}

export type UpdatePlanInput = Partial<CreatePlanInput>

export type CreateLessonInput = {
  studentId: number
  planId: number
  scheduledAt: string
  status?: LessonStatus
  description?: string | null
}

export type CreateLessonForStudentInput = Omit<CreateLessonInput, 'studentId'>

export type UpdateLessonInput = Partial<CreateLessonInput>

export type AuthResponse = {
  user: User
  token: string
}
