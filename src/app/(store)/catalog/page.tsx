import { CatalogView } from "@/components/store/catalog-view";
import { getProductListState } from "@/server/products/queries";

export const dynamic = "force-dynamic";

type CatalogPageProps = {
  searchParams?: Promise<{ q?: string; category?: string }>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const catalog = await getProductListState({ search: params?.q, category: params?.category });

  return <CatalogView catalog={catalog} searchQuery={params?.q ?? ""} />;
}
