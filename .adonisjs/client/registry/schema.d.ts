/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'auth.new_account.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.access_tokens.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'profile.profile.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/account/profile'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').updateProfileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').updateProfileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.profile.update_password': {
    methods: ["PUT"]
    pattern: '/api/v1/account/password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').updatePasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').updatePasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['updatePassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['updatePassword']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.access_tokens.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/account/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
    }
  }
  'dashboard.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/dashboard').dashboardQueryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['show']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'dashboard.export_month': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/export'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/export').exportQueryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['exportMonth']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['exportMonth']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'catalog.packages': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/packages'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/catalog_controller').default['packages']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/catalog_controller').default['packages']>>>
    }
  }
  'lessons.index_for_student': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/students/:studentId/lessons'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { studentId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/lessons_controller').default['indexForStudent']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/lessons_controller').default['indexForStudent']>>>
    }
  }
  'lessons.store_for_student': {
    methods: ["POST"]
    pattern: '/api/v1/students/:studentId/lessons'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/lesson').createLessonForStudentValidator)>>
      paramsTuple: [ParamValue]
      params: { studentId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/lesson').createLessonForStudentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/lessons_controller').default['storeForStudent']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/lessons_controller').default['storeForStudent']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'students.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/students'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/students_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/students_controller').default['index']>>>
    }
  }
  'students.store': {
    methods: ["POST"]
    pattern: '/api/v1/students'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/student').createStudentValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/student').createStudentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/students_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/students_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'students.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/students/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/students_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/students_controller').default['show']>>>
    }
  }
  'students.update': {
    methods: ["PUT","PATCH"]
    pattern: '/api/v1/students/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/student').updateStudentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/student').updateStudentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/students_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/students_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'students.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/students/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/students_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/students_controller').default['destroy']>>>
    }
  }
  'plans.generate_lessons': {
    methods: ["POST"]
    pattern: '/api/v1/plans/:id/lessons/generate'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/plan').generatePlanLessonsValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/plan').generatePlanLessonsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/plans_controller').default['generateLessons']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/plans_controller').default['generateLessons']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'plans.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/plans'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/plans_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/plans_controller').default['index']>>>
    }
  }
  'plans.store': {
    methods: ["POST"]
    pattern: '/api/v1/plans'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/plan').createPlanValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/plan').createPlanValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/plans_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/plans_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'plans.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/plans/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/plans_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/plans_controller').default['show']>>>
    }
  }
  'plans.update': {
    methods: ["PUT","PATCH"]
    pattern: '/api/v1/plans/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/plan').updatePlanValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/plan').updatePlanValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/plans_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/plans_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'plans.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/plans/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/plans_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/plans_controller').default['destroy']>>>
    }
  }
  'lessons.reposition': {
    methods: ["POST"]
    pattern: '/api/v1/lessons/:id/reposition'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/lesson').repositionLessonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/lesson').repositionLessonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/lessons_controller').default['reposition']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/lessons_controller').default['reposition']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'lessons.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/lessons'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/lessons_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/lessons_controller').default['index']>>>
    }
  }
  'lessons.store': {
    methods: ["POST"]
    pattern: '/api/v1/lessons'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/lesson').createLessonValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/lesson').createLessonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/lessons_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/lessons_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'lessons.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/lessons/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/lessons_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/lessons_controller').default['show']>>>
    }
  }
  'lessons.update': {
    methods: ["PUT","PATCH"]
    pattern: '/api/v1/lessons/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/lesson').updateLessonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/lesson').updateLessonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/lessons_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/lessons_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'lessons.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/lessons/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/lessons_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/lessons_controller').default['destroy']>>>
    }
  }
}
