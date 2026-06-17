import { CatalogView } from "@/components/store/catalog-view";
import { parsePageParam } from "@/lib/pagination";
import { listActiveCategories } from "@/server/categories/queries";
import { getProductListState } from "@/server/products/queries";

export const dynamic = "force-dynamic";
const CATALOG_PAGE_SIZE = 5;

type CatalogPageProps = {
  searchParams?: Promise<{ q?: string; category?: string; page?: string }>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const page = parsePageParam(params?.page);
  const [catalog, categories] = await Promise.all([
    getProductListState({ search: params?.q, category: params?.category, page, pageSize: CATALOG_PAGE_SIZE }),
    listActiveCategories(),
  ]);

  return <CatalogView catalog={catalog} categories={categories} searchQuery={params?.q ?? ""} categorySlug={params?.category} />;
}
