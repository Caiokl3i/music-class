/*
|--------------------------------------------------------------------------
| Serverless HTTP entrypoint for Vercel / AWS Lambda
|--------------------------------------------------------------------------
|
| This file exposes the AdonisJS HTTP server as a standard Node.js request
| listener (req: IncomingMessage, res: ServerResponse).
|
| In a serverless environment, the application is booted once per warm
| container, and subsequent invocations reuse the cached handler.
|
*/

import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'
import type { IncomingMessage, ServerResponse } from 'node:http'

const APP_ROOT = new URL('../', import.meta.url)

const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

type RequestHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>

let cachedHandler: RequestHandler | null = null
let initPromise: Promise<RequestHandler> | null = null

/**
 * Boots the AdonisJS application and resolves the HTTP server handler.
 * Thread-safe: concurrent initial requests await the same promise.
 */
export async function getServerlessHandler(): Promise<RequestHandler> {
  if (cachedHandler) {
    return cachedHandler
  }

  if (!initPromise) {
    initPromise = (async () => {
      const ignitor = new Ignitor(APP_ROOT, { importer: IMPORTER })

      ignitor.tap((app) => {
        app.booting(async () => {
          await import('#start/env')
        })
      })

      const app = ignitor.createApp('web')
      await app.init()
      await app.boot()

      return new Promise<RequestHandler>((resolve) => {
        app.start(async () => {
          const server = await app.container.make('server')
          await server.boot()
          cachedHandler = server.handle.bind(server)
          resolve(cachedHandler)
        })
      })
    })().catch((error) => {
      initPromise = null
      prettyPrintError(error)
      throw error
    })
  }

  return initPromise
}

/**
 * Default serverless handler compatible with Vercel Serverless Functions.
 */
export default async function handle(req: IncomingMessage, res: ServerResponse) {
  const handler = await getServerlessHandler()
  return handler(req, res)
}
