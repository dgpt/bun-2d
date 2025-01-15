const server = Bun.serve({
  port: 8800,
  async fetch(req) {
    const url = new URL(req.url)

    // Serve all files from root
    if (url.pathname !== '/') {
      const file = Bun.file(`./dist${url.pathname}`)
      return new Response(file)
    }

    // Serve index.html for root
    return new Response(
      Bun.file('./dist/index.html'),
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
})

console.log(`Server running at http://localhost:${server.port}`)