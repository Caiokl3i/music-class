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
  level: 'beginner' | 'intermediate' | null
  color: StudentColor
  tags: string | null
  preferredWeekday: number | null
  preferredTime: string | null
  createdAt: string
  updatedAt: string | null
  creditsRemaining: number
  activePlansCount: number
}

export type StudentColor = 'accent' | 'success' | 'warning' | 'danger'

export type PlanPackage = string
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
  discounts: PlanDiscount[]
  discountTotal: number
  netPrice: number
}

export type PlanDiscount = {
  id: number
  userId: number
  planId: number
  name: string
  amount: number
  serviceAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string | null
}

export type BillingLessonLine = {
  id: number
  scheduledAt: string
  dateLabel: string
}

export type BillingDiscountLine = {
  id: number
  name: string
  amount: number
  serviceAt: string | null
  dateLabel: string | null
}

export type BillingSummary = {
  planId: number
  studentName: string | null
  month: string | null
  monthLabel: string | null
  unitPrice: number
  lessons: BillingLessonLine[]
  lessonsSubtotal: number
  discounts: BillingDiscountLine[]
  discountTotal: number
  total: number
  text: string
}

export type LessonStatus = 'scheduled' | 'done' | 'cancelled' | 'no_show'

export type Lesson = {
  id: number
  userId: number
  studentId: number
  planId: number
  scheduledAt: string
  endsAt: string | null
  status: LessonStatus
  description: string | null
  createdAt: string
  updatedAt: string | null
  studentName: string | null
  studentInstrument: string | null
  studentLevel: 'beginner' | 'intermediate' | null
  studentColor: StudentColor | null
  planPackage: PlanPackage | null
}

export type PackageOption = {
  id?: number
  value: PlanPackage
  lessons: number
  price: number
  label: string
}

export type PlanType = {
  id: number
  userId: number
  slug: string
  label: string
  lessons: number
  price: number
  sortOrder: number
  createdAt: string
  updatedAt: string | null
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
  studentLevel: 'beginner' | 'intermediate' | null
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
  birthdays: Array<{
    studentId: number
    studentName: string
    studentInstrument: string | null
    studentLevel: 'beginner' | 'intermediate' | null
    studentColor: StudentColor | null
    birthdate: string | null
  }>
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
  level?: 'beginner' | 'intermediate' | null
  color?: StudentColor
  tags?: string | null
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

export type CreatePlanDiscountInput = {
  name: string
  amount: number
  serviceAt?: string | null
  notes?: string | null
}

export type UpdatePlanDiscountInput = Partial<CreatePlanDiscountInput>

export type CreatePlanTypeInput = {
  label: string
  lessons: number
  price: number
}

export type UpdatePlanTypeInput = Partial<CreatePlanTypeInput>

export type CreateLessonInput = {
  studentId: number
  planId: number
  scheduledAt: string
  endsAt?: string | null
  status?: LessonStatus
  description?: string | null
}

export type CreateLessonForStudentInput = Omit<CreateLessonInput, 'studentId'>

export type UpdateLessonInput = Partial<CreateLessonInput>

export type RepositionLessonInput = {
  scheduledAt: string
  endsAt?: string | null
  description?: string | null
}

export type AuthResponse = {
  user: User
  token: string
}
