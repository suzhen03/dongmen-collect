// Cloudflare Worker: 采集页 + Google瓦片代理
// /tiles/{z}/{x}/{y}.jpg → 代理 Google
// 其他请求 → 返回采集页

import indexHTML from './index.html'

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const path = url.pathname

    // 瓦片代理
    const m = path.match(/^\/tiles\/(\d+)\/(\d+)\/(\d+)\.jpg$/)
    if (m) {
      const [, z, x, y] = m
      const tileUrl = `https://mt${(parseInt(x) + parseInt(y)) % 4}.google.com/vt/lyrs=s&x=${x}&y=${y}&z=${z}`
      try {
        const r = await fetch(tileUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        if (r.ok) {
          return new Response(r.body, {
            headers: {
              'Content-Type': 'image/jpeg',
              'Cache-Control': 'public, max-age=2592000',
              'Access-Control-Allow-Origin': '*'
            }
          })
        }
      } catch {}
      return new Response(null, { status: 404 })
    }

    // 返回采集页
    return new Response(indexHTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }
}
