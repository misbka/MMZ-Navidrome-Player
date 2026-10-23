/**
 * Smoke test do app empacotado/development:
 * abre o Electron com remote debugging, conecta via CDP e verifica que o
 * React renderizou (#root com conteúdo) e que o window.electronAPI existe.
 *
 * Uso: node scripts/verify-rendered.mjs [caminho-do-exe]
 */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 9333
const exe =
  process.argv[2] ?? 'release/win-unpacked/Navidrome Player.exe'

async function getTargets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
  return res.json()
}

async function main() {
  const child = spawn(exe, [`--remote-debugging-port=${PORT}`, '--no-first-run'], {
    stdio: 'ignore',
    detached: false,
  })

  let targets = []
  for (let i = 0; i < 40; i++) {
    await sleep(500)
    try {
      targets = await getTargets()
      if (targets.some((t) => t.type === 'page')) break
    } catch {
      /* ainda subindo */
    }
  }

  const page = targets.find((t) => t.type === 'page')
  if (!page) {
    console.error('FAIL: nenhuma página encontrada no CDP')
    child.kill()
    process.exit(1)
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  const results = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout no CDP')), 10000)
    ws.addEventListener('open', () => {
      ws.send(
        JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: {
            expression: `JSON.stringify({
              rootLen: document.querySelector('#root')?.innerHTML.length ?? 0,
              hasElectronAPI: !!window.electronAPI,
              hasGetVersion: typeof window.electronAPI?.getVersion === 'function',
              title: document.title,
              bg: getComputedStyle(document.body).backgroundColor,
              text: (document.body.innerText || '').slice(0, 160)
            })`,
            returnByValue: true,
          },
        }),
      )
    })
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id === 1) {
        clearTimeout(timeout)
        resolve(JSON.parse(msg.result.result.value))
      }
    })
    ws.addEventListener('error', (e) => reject(e))
  })
    .finally(() => ws.close())

  console.log(JSON.stringify(results, null, 2))

  const ok =
    results.rootLen > 200 &&
    results.hasElectronAPI &&
    results.hasGetVersion &&
    // Tailwind v4 usa oklch; aceita também o fallback rgb
    (results.bg === 'oklch(0.141 0.005 285.823)' ||
      results.bg === 'rgb(9, 9, 11)' ||
      results.bg.includes('9, 9, 11')) &&
    results.text.length > 0

  child.kill()
  console.log(ok ? 'PASS: renderer renderizou e a ponte Electron existe' : 'FAIL')
  process.exit(ok ? 0 : 1)
}

main().catch((err) => {
  console.error('FAIL:', err.message)
  process.exit(1)
})
