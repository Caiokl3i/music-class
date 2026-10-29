/*
|--------------------------------------------------------------------------
| Deployment & Cutover Smoke Test
|--------------------------------------------------------------------------
|
| Validates essential HTTP endpoints against a running target instance
| (local dev, staging preview, or production). Supports optional bearer
| token persistence check (APP_KEY / auth_access_tokens), authenticated
| read/export checks, and --cutover-full mode (creates & deletes a temporary
| student, plan, and lesson + validates plan billing PDF).
|
| Usage:
|   TARGET_URL=https://music-class-api.vercel.app npm run smoke:test
|   SMOKE_TEST_EMAIL="..." SMOKE_TEST_PASSWORD="..." \
|     TARGET_URL=https://music-class-api.vercel.app npm run smoke:test -- --cutover-full
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
const cutoverFull =
  process.argv.includes('--cutover-full') ||
  process.env.SMOKE_CUTOVER_FULL === 'true' ||
  process.env.SMOKE_CUTOVER_FULL === '1'
const currentMonth = new Date().toISOString().slice(0, 7)

console.log(
  `\n🔍 Iniciando Smoke Test contra: ${targetUrl} ${cutoverFull ? '(Modo Completo Pós-Cutover)' : ''}\n`
)

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

  if (cutoverFull && !activeToken) {
    results.push({
      name: 'Cutover Full CRUD Prerequisites',
      status: 'FAIL',
      durationMs: 0,
      detail:
        'Modo --cutover-full requer SMOKE_TEST_TOKEN ou SMOKE_TEST_EMAIL + SMOKE_TEST_PASSWORD.',
    })
    console.error(
      '  ❌ [FAIL] Cutover Full CRUD Prerequisites: informe credenciais ou token para validar criação de aula e PDFs.'
    )
  }

  if (activeToken) {
    const authHeaders = {
      'Authorization': `Bearer ${activeToken}`,
      'Content-Type': 'application/json',
    }

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

    if (cutoverFull) {
      let createdStudentId: number | null = null
      let createdPlanId: number | null = null
      let createdLessonId: number | null = null
      let packageSlug = 'single'

      try {
        await runCheck('GET /api/v1/packages (Resolve Catalog Package)', async () => {
          const res = await fetch(`${targetUrl}/api/v1/packages`, { headers: authHeaders })
          if (res.status !== 200) {
            throw new Error(`Esperado 200, recebido ${res.status}`)
          }
          const body = (await res.json()) as {
            data?: { packages?: Array<{ value: string }> }
          }
          const first = body?.data?.packages?.[0]?.value
          if (!first) {
            throw new Error('Nenhum pacote disponível no catálogo do professor')
          }
          packageSlug = first
        })

        await runCheck('POST /api/v1/students (Create Diagnostic Student)', async () => {
          const res = await fetch(`${targetUrl}/api/v1/students`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              name: '[SMOKE-CUTOVER] Aluno Verificação',
              instrument: 'Piano',
            }),
          })
          if (res.status !== 201) {
            throw new Error(`Esperado 201, recebido ${res.status}`)
          }
          const body = (await res.json()) as { data?: { id?: number } }
          if (!body?.data?.id) {
            throw new Error('Resposta de criação de aluno sem data.id')
          }
          createdStudentId = body.data.id
        })

        if (createdStudentId) {
          await runCheck('POST /api/v1/plans (Create Diagnostic Plan)', async () => {
            const res = await fetch(`${targetUrl}/api/v1/plans`, {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                studentId: createdStudentId,
                package: packageSlug,
                status: 'pending',
                notes: 'Verificação automática de cutover',
              }),
            })
            if (res.status !== 201) {
              throw new Error(`Esperado 201, recebido ${res.status}`)
            }
            const body = (await res.json()) as { data?: { id?: number } }
            if (!body?.data?.id) {
              throw new Error('Resposta de criação de pacote sem data.id')
            }
            createdPlanId = body.data.id
          })
        }

        if (createdStudentId && createdPlanId) {
          await runCheck('POST /api/v1/lessons (Create Diagnostic Lesson)', async () => {
            const res = await fetch(`${targetUrl}/api/v1/lessons`, {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                studentId: createdStudentId,
                planId: createdPlanId,
                scheduledAt: '2099-01-15T14:00:00.000Z',
                status: 'scheduled',
                description: 'Smoke test pós-cutover',
              }),
            })
            if (res.status !== 201) {
              throw new Error(`Esperado 201, recebido ${res.status}`)
            }
            const body = (await res.json()) as { data?: { id?: number } }
            if (!body?.data?.id) {
              throw new Error('Resposta de criação de aula sem data.id')
            }
            createdLessonId = body.data.id
          })

          await runCheck(
            `GET /api/v1/plans/${createdPlanId}/billing.pdf (Plan Billing PDF)`,
            async () => {
              const res = await fetch(
                `${targetUrl}/api/v1/plans/${createdPlanId}/billing.pdf?month=2099-01`,
                { headers: authHeaders }
              )
              if (res.status !== 200) {
                throw new Error(`Esperado 200, recebido ${res.status}`)
              }
              const buffer = Buffer.from(await res.arrayBuffer())
              if (!buffer.subarray(0, 5).toString('ascii').startsWith('%PDF-')) {
                throw new Error('Recibo PDF não possui assinatura %PDF- válida')
              }
            }
          )
        }
      } finally {
        await runCheck('Cleanup Diagnostic Entities (Lesson -> Plan -> Student)', async () => {
          if (createdLessonId) {
            const res = await fetch(`${targetUrl}/api/v1/lessons/${createdLessonId}`, {
              method: 'DELETE',
              headers: authHeaders,
            })
            if (res.status !== 204) {
              throw new Error(`Falha ao remover aula temporária (${res.status})`)
            }
          }
          if (createdPlanId) {
            const res = await fetch(`${targetUrl}/api/v1/plans/${createdPlanId}`, {
              method: 'DELETE',
              headers: authHeaders,
            })
            if (res.status !== 204) {
              throw new Error(`Falha ao remover plano temporário (${res.status})`)
            }
          }
          if (createdStudentId) {
            const res = await fetch(`${targetUrl}/api/v1/students/${createdStudentId}`, {
              method: 'DELETE',
              headers: authHeaders,
            })
            if (res.status !== 204) {
              throw new Error(`Falha ao remover aluno temporário (${res.status})`)
            }
          }
        })
      }
    }
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
