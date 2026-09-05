export function liveSlug(model, benches) {
  for (const candidate of [model.slug, model.id]) {
    if (candidate && benches.some((bench) => bench.slug === candidate)) return candidate
  }
}
