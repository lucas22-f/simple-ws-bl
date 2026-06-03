export type PaginationState = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type PaginationInput = {
  page?: number;
  pageSize?: number;
};

export function parsePageParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(rawValue ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function getPaginationRange({ page, pageSize }: Required<PaginationInput>) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}

export function createPaginationState({ page = 1, pageSize = 1, totalItems }: PaginationInput & { totalItems: number }): PaginationState {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  return {
    page: safePage,
    pageSize: safePageSize,
    totalItems,
    totalPages,
  };
}
