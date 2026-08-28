/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'auth.new_account.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/signup',
    tokens: [{"old":"/api/v1/auth/signup","type":0,"val":"api","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['auth.new_account.store']['types'],
  },
  'auth.access_tokens.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [{"old":"/api/v1/auth/login","type":0,"val":"api","end":""},{"old":"/api/v1/auth/login","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/login","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['auth.access_tokens.store']['types'],
  },
  'profile.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [{"old":"/api/v1/account/profile","type":0,"val":"api","end":""},{"old":"/api/v1/account/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/account/profile","type":0,"val":"account","end":""},{"old":"/api/v1/account/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['profile.profile.show']['types'],
  },
  'profile.profile.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/account/profile',
    tokens: [{"old":"/api/v1/account/profile","type":0,"val":"api","end":""},{"old":"/api/v1/account/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/account/profile","type":0,"val":"account","end":""},{"old":"/api/v1/account/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['profile.profile.update']['types'],
  },
  'profile.profile.update_password': {
    methods: ["PUT"],
    pattern: '/api/v1/account/password',
    tokens: [{"old":"/api/v1/account/password","type":0,"val":"api","end":""},{"old":"/api/v1/account/password","type":0,"val":"v1","end":""},{"old":"/api/v1/account/password","type":0,"val":"account","end":""},{"old":"/api/v1/account/password","type":0,"val":"password","end":""}],
    types: placeholder as Registry['profile.profile.update_password']['types'],
  },
  'profile.access_tokens.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/account/logout',
    tokens: [{"old":"/api/v1/account/logout","type":0,"val":"api","end":""},{"old":"/api/v1/account/logout","type":0,"val":"v1","end":""},{"old":"/api/v1/account/logout","type":0,"val":"account","end":""},{"old":"/api/v1/account/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['profile.access_tokens.destroy']['types'],
  },
  'dashboard.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/dashboard',
    tokens: [{"old":"/api/v1/dashboard","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard","type":0,"val":"dashboard","end":""}],
    types: placeholder as Registry['dashboard.show']['types'],
  },
  'catalog.packages': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/packages',
    tokens: [{"old":"/api/v1/packages","type":0,"val":"api","end":""},{"old":"/api/v1/packages","type":0,"val":"v1","end":""},{"old":"/api/v1/packages","type":0,"val":"packages","end":""}],
    types: placeholder as Registry['catalog.packages']['types'],
  },
  'lessons.index_for_student': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/students/:studentId/lessons',
    tokens: [{"old":"/api/v1/students/:studentId/lessons","type":0,"val":"api","end":""},{"old":"/api/v1/students/:studentId/lessons","type":0,"val":"v1","end":""},{"old":"/api/v1/students/:studentId/lessons","type":0,"val":"students","end":""},{"old":"/api/v1/students/:studentId/lessons","type":1,"val":"studentId","end":""},{"old":"/api/v1/students/:studentId/lessons","type":0,"val":"lessons","end":""}],
    types: placeholder as Registry['lessons.index_for_student']['types'],
  },
  'lessons.store_for_student': {
    methods: ["POST"],
    pattern: '/api/v1/students/:studentId/lessons',
    tokens: [{"old":"/api/v1/students/:studentId/lessons","type":0,"val":"api","end":""},{"old":"/api/v1/students/:studentId/lessons","type":0,"val":"v1","end":""},{"old":"/api/v1/students/:studentId/lessons","type":0,"val":"students","end":""},{"old":"/api/v1/students/:studentId/lessons","type":1,"val":"studentId","end":""},{"old":"/api/v1/students/:studentId/lessons","type":0,"val":"lessons","end":""}],
    types: placeholder as Registry['lessons.store_for_student']['types'],
  },
  'students.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/students',
    tokens: [{"old":"/api/v1/students","type":0,"val":"api","end":""},{"old":"/api/v1/students","type":0,"val":"v1","end":""},{"old":"/api/v1/students","type":0,"val":"students","end":""}],
    types: placeholder as Registry['students.index']['types'],
  },
  'students.store': {
    methods: ["POST"],
    pattern: '/api/v1/students',
    tokens: [{"old":"/api/v1/students","type":0,"val":"api","end":""},{"old":"/api/v1/students","type":0,"val":"v1","end":""},{"old":"/api/v1/students","type":0,"val":"students","end":""}],
    types: placeholder as Registry['students.store']['types'],
  },
  'students.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/students/:id',
    tokens: [{"old":"/api/v1/students/:id","type":0,"val":"api","end":""},{"old":"/api/v1/students/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/students/:id","type":0,"val":"students","end":""},{"old":"/api/v1/students/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['students.show']['types'],
  },
  'students.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/students/:id',
    tokens: [{"old":"/api/v1/students/:id","type":0,"val":"api","end":""},{"old":"/api/v1/students/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/students/:id","type":0,"val":"students","end":""},{"old":"/api/v1/students/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['students.update']['types'],
  },
  'students.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/students/:id',
    tokens: [{"old":"/api/v1/students/:id","type":0,"val":"api","end":""},{"old":"/api/v1/students/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/students/:id","type":0,"val":"students","end":""},{"old":"/api/v1/students/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['students.destroy']['types'],
  },
  'plans.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/plans',
    tokens: [{"old":"/api/v1/plans","type":0,"val":"api","end":""},{"old":"/api/v1/plans","type":0,"val":"v1","end":""},{"old":"/api/v1/plans","type":0,"val":"plans","end":""}],
    types: placeholder as Registry['plans.index']['types'],
  },
  'plans.store': {
    methods: ["POST"],
    pattern: '/api/v1/plans',
    tokens: [{"old":"/api/v1/plans","type":0,"val":"api","end":""},{"old":"/api/v1/plans","type":0,"val":"v1","end":""},{"old":"/api/v1/plans","type":0,"val":"plans","end":""}],
    types: placeholder as Registry['plans.store']['types'],
  },
  'plans.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/plans/:id',
    tokens: [{"old":"/api/v1/plans/:id","type":0,"val":"api","end":""},{"old":"/api/v1/plans/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/plans/:id","type":0,"val":"plans","end":""},{"old":"/api/v1/plans/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['plans.show']['types'],
  },
  'plans.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/plans/:id',
    tokens: [{"old":"/api/v1/plans/:id","type":0,"val":"api","end":""},{"old":"/api/v1/plans/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/plans/:id","type":0,"val":"plans","end":""},{"old":"/api/v1/plans/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['plans.update']['types'],
  },
  'plans.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/plans/:id',
    tokens: [{"old":"/api/v1/plans/:id","type":0,"val":"api","end":""},{"old":"/api/v1/plans/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/plans/:id","type":0,"val":"plans","end":""},{"old":"/api/v1/plans/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['plans.destroy']['types'],
  },
  'lessons.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/lessons',
    tokens: [{"old":"/api/v1/lessons","type":0,"val":"api","end":""},{"old":"/api/v1/lessons","type":0,"val":"v1","end":""},{"old":"/api/v1/lessons","type":0,"val":"lessons","end":""}],
    types: placeholder as Registry['lessons.index']['types'],
  },
  'lessons.store': {
    methods: ["POST"],
    pattern: '/api/v1/lessons',
    tokens: [{"old":"/api/v1/lessons","type":0,"val":"api","end":""},{"old":"/api/v1/lessons","type":0,"val":"v1","end":""},{"old":"/api/v1/lessons","type":0,"val":"lessons","end":""}],
    types: placeholder as Registry['lessons.store']['types'],
  },
  'lessons.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/lessons/:id',
    tokens: [{"old":"/api/v1/lessons/:id","type":0,"val":"api","end":""},{"old":"/api/v1/lessons/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/lessons/:id","type":0,"val":"lessons","end":""},{"old":"/api/v1/lessons/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['lessons.show']['types'],
  },
  'lessons.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/lessons/:id',
    tokens: [{"old":"/api/v1/lessons/:id","type":0,"val":"api","end":""},{"old":"/api/v1/lessons/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/lessons/:id","type":0,"val":"lessons","end":""},{"old":"/api/v1/lessons/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['lessons.update']['types'],
  },
  'lessons.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/lessons/:id',
    tokens: [{"old":"/api/v1/lessons/:id","type":0,"val":"api","end":""},{"old":"/api/v1/lessons/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/lessons/:id","type":0,"val":"lessons","end":""},{"old":"/api/v1/lessons/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['lessons.destroy']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
