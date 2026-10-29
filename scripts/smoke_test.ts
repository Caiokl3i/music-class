/*
|--------------------------------------------------------------------------
| Deployment & Cutover Smoke Test
|--------------------------------------------------------------------------
|
| Validates essential HTTP endpoints against a running target instance
| (local dev, staging preview, or production). Supports optional bearer
| token persistence check (APP_KEY / auth_access_tokens) and authenticated
| E2E checks (login, dashboard, students, CSV & PDF exports).
|
| Usage:
|   TARGET_URL=https://music-class.vercel.app npm run smoke:test
|   SMOKE_TEST_TOKEN="oat_..." SMOKE_TEST_EMAIL="..." SMOKE_TEST_PASSWORD="..." \
|     TARGET_URL=http://localhost:3333 npm run smoke:test
|
*/

const targetUrl = (
  process.env.TARGET_URL ||
  process.env.TEST_API_URL ||
  process.env.APP_URL ||
  'http://localhost:3333'
).replace(/\/$/, '')

const existingToken = process.env.SMOKE_TEST_TOKEN
const smokeEmail = process.env.SMOKE_TEST_EMAIL
const smokePassword = process.env.SMOKE_TEST_PASSWORD
const currentMonth = new Date().toISOString().slice(0, 7)

console.log(`\n🔍 Iniciando Smoke Test contra: ${targetUrl}\n`)

type CheckResult = {
  name: string
  status: 'PASS' | 'FAIL'
  durationMs: number
  detail?: string
}

const results: CheckResult[] = []

async function runCheck(name: string, checkFn: () => Promise<void>) {
  const start = performance.now()
  try {
    await checkFn()
    const durationMs = Math.round(performance.now() - start)
    results.push({ name, status: 'PASS', durationMs })
    console.log(`  ✅ [PASS] ${name} (${durationMs}ms)`)
  } catch (err) {
    const durationMs = Math.round(performance.now() - start)
    const detail = err instanceof Error ? err.message : String(err)
    results.push({ name, status: 'FAIL', durationMs, detail })
    console.error(`  ❌ [FAIL] ${name} (${durationMs}ms): ${detail}`)
  }
}

async function main() {
  await runCheck('GET / (Health Probe)', async () => {
    const res = await fetch(`${targetUrl}/`)
    if (res.status !== 200) {
      throw new Error(`Esperado status 200, recebido ${res.status}`)
    }
    const body = (await res.json()) as { ok?: boolean }
    if (!body?.ok) {
      throw new Error(`Corpo inválido: ${JSON.stringify(body)}`)
    }
  })

  await runCheck('GET /health (Database Ping)', async () => {
    const res = await fetch(`${targetUrl}/health`)
    if (res.status !== 200) {
      throw new Error(`Esperado status 200, recebido ${res.status}`)
    }
    const body = (await res.json()) as { healthy?: boolean; database?: string }
    if (!body?.healthy || body.database !== 'connected') {
      throw new Error(`Health check falhou: ${JSON.stringify(body)}`)
    }
  })

  await runCheck('GET /api/v1/packages (Auth Protection)', async () => {
    const res = await fetch(`${targetUrl}/api/v1/packages`)
    if (res.status !== 401) {
      throw new Error(`Esperado status 401 (Não autorizado), recebido ${res.status}`)
    }
  })

  await runCheck('GET /api/v1/students (Auth Protection)', async () => {
    const res = await fetch(`${targetUrl}/api/v1/students`)
    if (res.status !== 401) {
      throw new Error(`Esperado status 401 (Não autorizado), recebido ${res.status}`)
    }
  })

  let activeToken = existingToken || ''

  if (existingToken) {
    await runCheck('GET /api/v1/account/profile (Pre-cutover Bearer Token Validity)', async () => {
      const res = await fetch(`${targetUrl}/api/v1/account/profile`, {
        headers: { Authorization: `Bearer ${existingToken}` },
      })
      if (res.status !== 200) {
        throw new Error(`Token pré-existente falhou: esperado 200, recebido ${res.status}`)
      }
    })
  }

  if (smokeEmail && smokePassword) {
    await runCheck('POST /api/v1/auth/login (Test Account Login)', async () => {
      const res = await fetch(`${targetUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: smokeEmail, password: smokePassword }),
      })
      if (res.status !== 200) {
        throw new Error(`Login falhou: esperado 200, recebido ${res.status}`)
      }
      const body = (await res.json()) as { data?: { token?: string } }
      const token = body?.data?.token
      if (!token) {
        throw new Error('Resposta de login não retornou data.token')
      }
      if (!activeToken) {
        activeToken = token
      }
    })
  }

  if (activeToken) {
    const authHeaders = { Authorization: `Bearer ${activeToken}` }

    await runCheck('GET /api/v1/dashboard (Authenticated Dashboard)', async () => {
      const res = await fetch(`${targetUrl}/api/v1/dashboard`, { headers: authHeaders })
      if (res.status !== 200) {
        throw new Error(`Esperado 200, recebido ${res.status}`)
      }
    })

    await runCheck('GET /api/v1/students (Authenticated Students List)', async () => {
      const res = await fetch(`${targetUrl}/api/v1/students`, { headers: authHeaders })
      if (res.status !== 200) {
        throw new Error(`Esperado 200, recebido ${res.status}`)
      }
    })

    await runCheck(`GET /api/v1/export?month=${currentMonth} (CSV Export)`, async () => {
      const res = await fetch(`${targetUrl}/api/v1/export?month=${currentMonth}`, {
        headers: authHeaders,
      })
      if (res.status !== 200) {
        throw new Error(`Esperado 200, recebido ${res.status}`)
      }
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('text/csv')) {
        throw new Error(`Content-Type inesperado para CSV: ${contentType}`)
      }
    })

    await runCheck(`GET /api/v1/export.pdf?month=${currentMonth} (PDFKit Export)`, async () => {
      const res = await fetch(`${targetUrl}/api/v1/export.pdf?month=${currentMonth}`, {
        headers: authHeaders,
      })
      if (res.status !== 200) {
        throw new Error(`Esperado 200, recebido ${res.status}`)
      }
      const buffer = Buffer.from(await res.arrayBuffer())
      if (!buffer.subarray(0, 5).toString('ascii').startsWith('%PDF-')) {
        throw new Error('Arquivo retornado não possui assinatura PDF válida (%PDF-)')
      }
    })
  }

  console.log('\n--- Resumo do Smoke Test ---')
  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length
  console.log(`Total: ${results.length} | Aprovados: ${passed} | Falhas: ${failed}\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Erro fatal no smoke test:', err)
  process.exit(1)
})
