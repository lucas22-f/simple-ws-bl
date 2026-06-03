import { CatalogView } from "@/components/store/catalog-view";
import { parsePageParam } from "@/lib/pagination";
import { getProductListState } from "@/server/products/queries";

export const dynamic = "force-dynamic";
const CATALOG_PAGE_SIZE = 5;

type CatalogPageProps = {
  searchParams?: Promise<{ q?: string; category?: string; page?: string }>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const page = parsePageParam(params?.page);
  const catalog = await getProductListState({ search: params?.q, category: params?.category, page, pageSize: CATALOG_PAGE_SIZE });

  return <CatalogView catalog={catalog} searchQuery={params?.q ?? ""} categorySlug={params?.category} />;
}
