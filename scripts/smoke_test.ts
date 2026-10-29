/*
|--------------------------------------------------------------------------
| Deployment Smoke Test
|--------------------------------------------------------------------------
|
| Validates essential HTTP endpoints against a running target instance
| (e.g. local dev, staging preview, or production).
|
| Usage:
|   TARGET_URL=https://music-class-staging.vercel.app npm run smoke:test
|
*/

const targetUrl = (
  process.env.TARGET_URL ||
  process.env.APP_URL ||
  'http://localhost:3333'
).replace(/\/$/, '')

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

  await runCheck('GET /api/v1/catalog (Public Catalog)', async () => {
    const res = await fetch(`${targetUrl}/api/v1/catalog`)
    if (res.status !== 200) {
      throw new Error(`Esperado status 200, recebido ${res.status}`)
    }
    const body = (await res.json()) as { packages?: unknown[] }
    if (!body?.packages || !Array.isArray(body.packages)) {
      throw new Error('Catálogo não retornou lista de pacotes válida')
    }
  })

  await runCheck('GET /api/v1/students (Auth Protection)', async () => {
    const res = await fetch(`${targetUrl}/api/v1/students`)
    if (res.status !== 401) {
      throw new Error(`Esperado status 401 (Não autorizado), recebido ${res.status}`)
    }
  })

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
