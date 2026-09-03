import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.profile.update': { paramsTuple?: []; params?: {} }
    'profile.profile.update_password': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'dashboard.show': { paramsTuple?: []; params?: {} }
    'dashboard.export_month': { paramsTuple?: []; params?: {} }
    'catalog.packages': { paramsTuple?: []; params?: {} }
    'lessons.index_for_student': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'lessons.store_for_student': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'students.index': { paramsTuple?: []; params?: {} }
    'students.store': { paramsTuple?: []; params?: {} }
    'students.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'students.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'students.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'plans.generate_lessons': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'plans.index': { paramsTuple?: []; params?: {} }
    'plans.store': { paramsTuple?: []; params?: {} }
    'plans.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'plans.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'plans.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'lessons.index': { paramsTuple?: []; params?: {} }
    'lessons.store': { paramsTuple?: []; params?: {} }
    'lessons.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'lessons.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'lessons.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'dashboard.show': { paramsTuple?: []; params?: {} }
    'dashboard.export_month': { paramsTuple?: []; params?: {} }
    'catalog.packages': { paramsTuple?: []; params?: {} }
    'lessons.index_for_student': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'students.index': { paramsTuple?: []; params?: {} }
    'students.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'plans.index': { paramsTuple?: []; params?: {} }
    'plans.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'lessons.index': { paramsTuple?: []; params?: {} }
    'lessons.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'dashboard.show': { paramsTuple?: []; params?: {} }
    'dashboard.export_month': { paramsTuple?: []; params?: {} }
    'catalog.packages': { paramsTuple?: []; params?: {} }
    'lessons.index_for_student': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'students.index': { paramsTuple?: []; params?: {} }
    'students.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'plans.index': { paramsTuple?: []; params?: {} }
    'plans.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'lessons.index': { paramsTuple?: []; params?: {} }
    'lessons.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'lessons.store_for_student': { paramsTuple: [ParamValue]; params: {'studentId': ParamValue} }
    'students.store': { paramsTuple?: []; params?: {} }
    'plans.generate_lessons': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'plans.store': { paramsTuple?: []; params?: {} }
    'lessons.store': { paramsTuple?: []; params?: {} }
  }
  PATCH: {
    'profile.profile.update': { paramsTuple?: []; params?: {} }
    'students.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'plans.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'lessons.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'profile.profile.update_password': { paramsTuple?: []; params?: {} }
    'students.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'plans.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'lessons.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'students.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'plans.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'lessons.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}