declare module 'pg' {
  export interface ClientConfig {
    connectionString?: string
    ssl?: boolean | { rejectUnauthorized?: boolean }
  }

  export interface QueryResult<TRow = Record<string, unknown>> {
    rows: TRow[]
    rowCount: number | null
  }

  export class Client {
    constructor(config?: ClientConfig | string)
    connect(): Promise<void>
    end(): Promise<void>
    query<TRow = Record<string, unknown>>(
      text: string,
      values?: unknown[]
    ): Promise<QueryResult<TRow>>
  }

  const pg: {
    Client: typeof Client
  }

  export default pg
}
