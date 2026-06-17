export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CategoryInput = {
  name: string;
  slug: string;
  description?: string;
  active?: boolean;
  sortOrder?: number;
};

export type CategoryUpdateInput = Partial<CategoryInput>;

export type AdminCategoryRow = CategoryRow;

export type AdminCategory = Category;

export type CategoryQueryClient = {
  listActive: () => Promise<{ data: CategoryRow[] | null; error: unknown }>;
  listAdmin: (pagination?: { page?: number; pageSize?: number; search?: string }) => Promise<{ data: CategoryRow[] | null; error: unknown; count?: number | null }>;
  getBySlug: (slug: string) => Promise<{ data: CategoryRow | null; error: unknown }>;
};

export type CategoryRepository = {
  create: (input: CategoryInput) => Promise<CategoryRow>;
  update: (id: string, input: CategoryUpdateInput) => Promise<unknown>;
  delete: (id: string) => Promise<unknown>;
  getBySlug: (slug: string) => Promise<{ data: CategoryRow | null; error: unknown }>;
};
