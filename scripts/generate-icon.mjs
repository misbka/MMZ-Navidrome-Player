/**
 * Gera os ícones do app:
 *   build/icon.png (512x512) — disco de vinil verde com rótulo roxo (Linux/macOS)
 *   build/icon.ico (256x256) — ícone do Windows (PNG embutido no container ICO)
 *
 * Sem dependências externas: escreve PNG e ICO manualmente usando zlib.
 *
 * Uso: npm run icon
 */
import { deflateSync, crc32 } from 'node:zlib'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PNG = join(__dirname, '..', 'build', 'icon.png')
const OUT_ICO = join(__dirname, '..', 'build', 'icon.ico')

const SS = 4 // supersampling (antialiasing)

/** Cores RGBA */
const BG = [9, 9, 11, 255] // zinc-950
const GREEN = [16, 185, 129, 255] // emerald-500
const GREEN_DARK = [5, 146, 100, 255] // sulco do disco
const PURPLE = [168, 85, 247, 255] // purple-500 (rótulo)
const WHITE = [255, 255, 255, 255]

/**
 * Desenha o disco em um canvas SIZE x SIZE (geometria proporcional ao original 512).
 * Retorna um Buffer RGBA pronto para o encoder PNG.
 */
function render(size) {
  const s = size / 512 // fator de escala
  const cx = size / 2
  const cy = size / 2
  const round = 128 * s // cantos arredondados
  const rDisc = 172 * s
  const rLabel = 66 * s
  const rHole = 14 * s
  const groove1 = 153 * s
  const groove2 = 121 * s
  const grooveW = 6 * s
  // triângulo de "play" (apontando para a direita, centralizado no rótulo)
  const triLeft = 4 * s
  const triRight = 44 * s
  const triSlope = 0.7

  const insideRoundRect = (x, y) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return false
    const nx = Math.min(Math.max(x, round), size - round)
    const ny = Math.min(Math.max(y, round), size - round)
    if (x > round && x < size - round) return true
    if (y > round && y < size - round) return true
    return Math.hypot(x - nx, y - ny) <= round
  }

  const sample = (x, y) => {
    if (!insideRoundRect(x, y)) return [0, 0, 0, 0]
    const d = Math.hypot(x - cx, y - cy)
    if (d <= rHole) return [0, 0, 0, 0] // furo central
    if (d <= rDisc) {
      // triângulo de "play" branco sobre o rótulo roxo
      const px = x - cx
      const py = y - cy
      if (d <= rLabel && px > triLeft && px < triRight && Math.abs(py) < (triRight - px) * triSlope)
        return WHITE
      if (d <= rLabel) return PURPLE
      // sulcos do disco (anéis finos)
      if (Math.abs(d - groove1) < grooveW / 2) return GREEN_DARK
      if (Math.abs(d - groove2) < grooveW / 2) return GREEN_DARK
      return GREEN
    }
    return BG
  }

  const data = Buffer.alloc(size * size * 4)
  const inv = 1 / (SS * SS)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS)
          // premultiplica pelo alpha para misturar corretamente com o transparente
          const alpha = c[3] / 255
          r += c[0] * alpha
          g += c[1] * alpha
          b += c[2] * alpha
          a += c[3]
        }
      }
      const outA = Math.round(a * inv)
      const o = (y * size + x) * 4
      data[o] = outA === 0 ? 0 : Math.round(r * inv * (255 / outA))
      data[o + 1] = outA === 0 ? 0 : Math.round(g * inv * (255 / outA))
      data[o + 2] = outA === 0 ? 0 : Math.round(b * inv * (255 / outA))
      data[o + 3] = outA
    }
  }
  return data
}

function pngChunk(type, payload) {
  const typeBuf = Buffer.from(type, 'latin1')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(payload.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, payload])) >>> 0, 0)
  return Buffer.concat([len, typeBuf, payload, crc])
}

function encodePNG(size, pixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  // scanlines com filtro 0 (None) no início de cada linha
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const idat = deflateSync(raw, { level: 9 })

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

/** Container ICO com um PNG de 256x256 embutido (formato aceito desde o Windows Vista). */
function encodeICO(png) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(1, 4) // count

  const entry = Buffer.alloc(16)
  entry[0] = 0 // width (0 = 256)
  entry[1] = 0 // height (0 = 256)
  entry[2] = 0 // palette colors
  entry[3] = 0 // reserved
  entry.writeUInt16LE(1, 4) // color planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(6 + 16, 12) // offset

  return Buffer.concat([header, entry, png])
}

mkdirSync(dirname(OUT_PNG), { recursive: true })

const png512 = encodePNG(512, render(512))
writeFileSync(OUT_PNG, png512)

const png256 = encodePNG(256, render(256))
writeFileSync(OUT_ICO, encodeICO(png256))

console.log(
  `Ícones gerados: ${existsSync(OUT_PNG) ? 'ok' : 'erro'} (icon.png, 512x512) | ` +
    `${existsSync(OUT_ICO) ? 'ok' : 'erro'} (icon.ico, 256x256)`,
)
