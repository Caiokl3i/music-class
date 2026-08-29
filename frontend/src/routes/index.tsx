import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { CatalogProvider } from '@/contexts/CatalogContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { GuestRoute, ProtectedRoute } from '@/routes/ProtectedRoute'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { PageLoader } from '@/components/PageLoader'

const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const SignupPage = lazy(() =>
  import('@/pages/SignupPage').then((m) => ({ default: m.SignupPage })),
)
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const StudentsPage = lazy(() =>
  import('@/pages/StudentsPage').then((m) => ({ default: m.StudentsPage })),
)
const StudentDetailPage = lazy(() =>
  import('@/pages/StudentDetailPage').then((m) => ({ default: m.StudentDetailPage })),
)
const PlansPage = lazy(() =>
  import('@/pages/PlansPage').then((m) => ({ default: m.PlansPage })),
)
const LessonsPage = lazy(() =>
  import('@/pages/LessonsPage').then((m) => ({ default: m.LessonsPage })),
)
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)

export function AppRouter() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CatalogProvider>
            <ToastProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={<GuestRoute />}>
                  <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                  </Route>
                </Route>

                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="students" element={<StudentsPage />} />
                    <Route path="students/:id" element={<StudentDetailPage />} />
                    <Route path="plans" element={<PlansPage />} />
                    <Route path="lessons" element={<LessonsPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                  </Route>
                </Route>

                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </Suspense>
            </ToastProvider>
          </CatalogProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
