/**
 * MD5 implementation (RFC 1321) used to compute the Subsonic auth token:
 * token = md5(password + salt)
 * Runs entirely in the renderer (no Node crypto dependency).
 */

function safeAdd(x: number, y: number): number {
  const lsw = (x & 0xffff) + (y & 0xffff)
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
  return (msw << 16) | (lsw & 0xffff)
}

function rotl(num: number, cnt: number): number {
  return (num << cnt) | (num >>> (32 - cnt))
}

function cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
  return safeAdd(rotl(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b)
}

function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return cmn((b & c) | (~b & d), a, b, x, s, t)
}
function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return cmn((b & d) | (c & ~d), a, b, x, s, t)
}
function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return cmn(b ^ c ^ d, a, b, x, s, t)
}
function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return cmn(c ^ (b | ~d), a, b, x, s, t)
}

function bytesToWords(bytes: number[]): number[] {
  const words: number[] = []
  for (let i = 0; i < bytes.length; i++) {
    words[i >> 2] = (words[i >> 2] ?? 0) | (bytes[i] << ((i % 4) * 8))
  }
  return words
}

function utf8Encode(str: string): number[] {
  const out: number[] = []
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i)
    if (c < 0x80) {
      out.push(c)
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f))
    } else if (c < 0xd800 || c >= 0xe000) {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
    } else {
      i++
      c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff))
      out.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f),
      )
    }
  }
  return out
}

function md5Cycle(x: number[], k: number[]) {
  let [a, b, c, d] = x

  a = ff(a, b, c, d, k[0]!, 7, -680876936)
  d = ff(d, a, b, c, k[1]!, 12, -389564586)
  c = ff(c, d, a, b, k[2]!, 17, 606105819)
  b = ff(b, c, d, a, k[3]!, 22, -1044525330)
  a = ff(a, b, c, d, k[4]!, 7, -176418897)
  d = ff(d, a, b, c, k[5]!, 12, 1200080426)
  c = ff(c, d, a, b, k[6]!, 17, -1473231341)
  b = ff(b, c, d, a, k[7]!, 22, -45705983)
  a = ff(a, b, c, d, k[8]!, 7, 1770035416)
  d = ff(d, a, b, c, k[9]!, 12, -1958414417)
  c = ff(c, d, a, b, k[10]!, 17, -42063)
  b = ff(b, c, d, a, k[11]!, 22, -1990404162)
  a = ff(a, b, c, d, k[12]!, 7, 1804603682)
  d = ff(d, a, b, c, k[13]!, 12, -40341101)
  c = ff(c, d, a, b, k[14]!, 17, -1502002290)
  b = ff(b, c, d, a, k[15]!, 22, 1236535329)

  a = gg(a, b, c, d, k[1]!, 5, -165796510)
  d = gg(d, a, b, c, k[6]!, 9, -1069501632)
  c = gg(c, d, a, b, k[11]!, 14, 643717713)
  b = gg(b, c, d, a, k[0]!, 20, -373897302)
  a = gg(a, b, c, d, k[5]!, 5, -701558691)
  d = gg(d, a, b, c, k[10]!, 9, 38016083)
  c = gg(c, d, a, b, k[15]!, 14, -660478335)
  b = gg(b, c, d, a, k[4]!, 20, -405537848)
  a = gg(a, b, c, d, k[9]!, 5, 568446438)
  d = gg(d, a, b, c, k[14]!, 9, -1019803690)
  c = gg(c, d, a, b, k[3]!, 14, -187363961)
  b = gg(b, c, d, a, k[8]!, 20, 1163531501)
  a = gg(a, b, c, d, k[13]!, 5, -1444681467)
  d = gg(d, a, b, c, k[2]!, 9, -51403784)
  c = gg(c, d, a, b, k[7]!, 14, 1735328473)
  b = gg(b, c, d, a, k[12]!, 20, -1926607734)

  a = hh(a, b, c, d, k[5]!, 4, -378558)
  d = hh(d, a, b, c, k[8]!, 11, -2022574463)
  c = hh(c, d, a, b, k[11]!, 16, 1839030562)
  b = hh(b, c, d, a, k[14]!, 23, -35309556)
  a = hh(a, b, c, d, k[1]!, 4, -1530992060)
  d = hh(d, a, b, c, k[4]!, 11, 1272893353)
  c = hh(c, d, a, b, k[7]!, 16, -155497632)
  b = hh(b, c, d, a, k[10]!, 23, -1094730640)
  a = hh(a, b, c, d, k[13]!, 4, 681279174)
  d = hh(d, a, b, c, k[0]!, 11, -358537222)
  c = hh(c, d, a, b, k[3]!, 16, -722521979)
  b = hh(b, c, d, a, k[6]!, 23, 76029189)
  a = hh(a, b, c, d, k[9]!, 4, -640364487)
  d = hh(d, a, b, c, k[12]!, 11, -421815835)
  c = hh(c, d, a, b, k[15]!, 16, 530742520)
  b = hh(b, c, d, a, k[2]!, 23, -995338651)

  a = ii(a, b, c, d, k[0]!, 6, -198630844)
  d = ii(d, a, b, c, k[7]!, 10, 1126891415)
  c = ii(c, d, a, b, k[14]!, 15, -1416354905)
  b = ii(b, c, d, a, k[5]!, 21, -57434055)
  a = ii(a, b, c, d, k[12]!, 6, 1700485571)
  d = ii(d, a, b, c, k[3]!, 10, -1894986606)
  c = ii(c, d, a, b, k[10]!, 15, -1051523)
  b = ii(b, c, d, a, k[1]!, 21, -2054922799)
  a = ii(a, b, c, d, k[8]!, 6, 1873313359)
  d = ii(d, a, b, c, k[15]!, 10, -30611744)
  c = ii(c, d, a, b, k[6]!, 15, -1560198380)
  b = ii(b, c, d, a, k[13]!, 21, 1309151649)
  a = ii(a, b, c, d, k[4]!, 6, -145523070)
  d = ii(d, a, b, c, k[11]!, 10, -1120210379)
  c = ii(c, d, a, b, k[2]!, 15, 718787259)
  b = ii(b, c, d, a, k[9]!, 21, -343485551)

  x[0] = safeAdd(a, x[0]!)
  x[1] = safeAdd(b, x[1]!)
  x[2] = safeAdd(c, x[2]!)
  x[3] = safeAdd(d, x[3]!)
}

function md5Blk(bytes: number[]): number[] {
  // `bytes` is always exactly 64 bytes here; only the first 16 words are used.
  return bytesToWords(bytes)
}

/** Returns the lowercase hex MD5 digest of a UTF-8 string. */
export function md5(input: string): string {
  const bytes = utf8Encode(input)
  const x = [1732584193, -271733879, -1732584194, 271733878]
  const bytesLen = bytes.length

  let i = 0
  for (; i + 64 <= bytesLen; i += 64) {
    md5Cycle(x, md5Blk(bytes.slice(i, i + 64)))
  }

  // Tail: byte 0x80, zeros até 56 (mod 64), e o comprimento em bits (8 bytes little-endian).
  const tail = bytes.slice(i)
  tail.push(0x80)
  while (tail.length % 64 !== 56) tail.push(0)
  const bitLen = bytesLen * 8
  tail.push(
    bitLen & 0xff,
    (bitLen >>> 8) & 0xff,
    (bitLen >>> 16) & 0xff,
    (bitLen >>> 24) & 0xff,
    0,
    0,
    0,
    0,
  )
  for (let j = 0; j < tail.length; j += 64) {
    md5Cycle(x, md5Blk(tail.slice(j, j + 64)))
  }

  const hex = [x[0]!, x[1]!, x[2]!, x[3]!]
    .map((n) => {
      let s = ''
      for (let j = 0; j < 4; j++) {
        s += ((n >> (j * 8 + 4)) & 0x0f).toString(16) + ((n >> (j * 8)) & 0x0f).toString(16)
      }
      return s
    })
    .join('')
  return hex
}
