const build = async () => {
  console.log('Building index.ts...')
  const prebuild = await Bun.build({
    entrypoints: ['src/index.ts'],
    outdir: 'dist',
    splitting: false
  })

  if (!prebuild.success) {
    console.error(prebuild.logs.join('\n\n'))
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
    console.error(build.logs.join('\n\n'))
    return
  }
  console.log('\\o/')
}

build()
