export const paginationMeta = <T extends { page: number; itemsPerPage: number }>(options: T, total: number) => {
  if (options.itemsPerPage === -1)
    return `Mostrando todos (${total} registros)`

  const start = (options.page - 1) * options.itemsPerPage + 1
  const end = Math.min(options.page * options.itemsPerPage, total)

  return `Mostrando ${total === 0 ? 0 : start} a ${end} de ${total} registros`
}
