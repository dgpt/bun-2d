const build = async () => {
  console.log('Building index.ts...')
  const prebuild = await Bun.build({
    entrypoints: ['src/index.ts'],
    outdir: 'dist',
    splitting: false
  })

  if (!prebuild.success) {
    prebuild.logs.forEach(log => {
      console.error(log)
    })
    return
  }

  console.log('Building index.html...')
  const build = await Bun.build({
    entrypoints: ['index.html'],
    outdir: 'dist',
    html: true,
    experimentalCss: true,
    splitting: false,
  })

  if (!build.success) {
    build.logs.forEach(log => {
      console.error(log)
    })
    return
  }
  console.log('\\o/')
}

build()
