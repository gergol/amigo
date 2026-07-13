import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

// Dependency-free PWA icons: a terracotta square with a centered cream disc.
// Calm, typography-adjacent mark — no raster font needed. Node zlib only.

const ACCENT = [182, 130, 53]   // #b68235
const CREAM = [243, 242, 242]   // #f3f2f2

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}

function png(size, discFrac) {
  const cx = size / 2, cy = size / 2, r = size * discFrac
  const raw = Buffer.alloc(size * (size * 4 + 1))
  let o = 0
  for (let y = 0; y < size; y++) {
    raw[o++] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const inside = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r
      const [rr, gg, bb] = inside ? CREAM : ACCENT
      raw[o++] = rr; raw[o++] = gg; raw[o++] = bb; raw[o++] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6 // 8-bit RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

const dir = new URL('../public/icons/', import.meta.url)
writeFileSync(new URL('icon-192.png', dir), png(192, 0.3))
writeFileSync(new URL('icon-512.png', dir), png(512, 0.3))
writeFileSync(new URL('maskable-512.png', dir), png(512, 0.26)) // smaller disc → safe zone
console.log('icons written: icon-192, icon-512, maskable-512')
