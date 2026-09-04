/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    newAccount: {
      store: typeof routes['auth.new_account.store']
    }
    accessTokens: {
      store: typeof routes['auth.access_tokens.store']
    }
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
      update: typeof routes['profile.profile.update']
      updatePassword: typeof routes['profile.profile.update_password']
    }
    accessTokens: {
      destroy: typeof routes['profile.access_tokens.destroy']
    }
  }
  dashboard: {
    show: typeof routes['dashboard.show']
    exportMonth: typeof routes['dashboard.export_month']
  }
  catalog: {
    packages: typeof routes['catalog.packages']
  }
  lessons: {
    indexForStudent: typeof routes['lessons.index_for_student']
    storeForStudent: typeof routes['lessons.store_for_student']
    reposition: typeof routes['lessons.reposition']
    index: typeof routes['lessons.index']
    store: typeof routes['lessons.store']
    show: typeof routes['lessons.show']
    update: typeof routes['lessons.update']
    destroy: typeof routes['lessons.destroy']
  }
  students: {
    index: typeof routes['students.index']
    store: typeof routes['students.store']
    show: typeof routes['students.show']
    update: typeof routes['students.update']
    destroy: typeof routes['students.destroy']
  }
  planTypes: {
    index: typeof routes['plan_types.index']
    store: typeof routes['plan_types.store']
    show: typeof routes['plan_types.show']
    update: typeof routes['plan_types.update']
    destroy: typeof routes['plan_types.destroy']
  }
  plans: {
    generateLessons: typeof routes['plans.generate_lessons']
    billing: typeof routes['plans.billing']
    billingPdf: typeof routes['plans.billing_pdf']
    index: typeof routes['plans.index']
    store: typeof routes['plans.store']
    show: typeof routes['plans.show']
    update: typeof routes['plans.update']
    destroy: typeof routes['plans.destroy']
  }
  planDiscounts: {
    store: typeof routes['plan_discounts.store']
    update: typeof routes['plan_discounts.update']
    destroy: typeof routes['plan_discounts.destroy']
  }
}
