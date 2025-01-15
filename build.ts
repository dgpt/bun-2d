const build = async () => {
  await Bun.build({
    entrypoints: ['src/index.ts'],
    outdir: 'dist',
    splitting: false
  })

  await Bun.build({
    entrypoints: ['index.html'],
    outdir: 'dist',
    html: true,
    experimentalCss: true,
    splitting: false,
  })
}

build()
