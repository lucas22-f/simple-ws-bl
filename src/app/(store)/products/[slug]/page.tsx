import { notFound } from "next/navigation";
import { ProductDetailView } from "@/components/store/product-detail-view";
import { getActiveProductBySlug, isProductCatalogReadError } from "@/server/products/queries";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug).catch((error: unknown) => {
    if (!isProductCatalogReadError(error)) {
      throw error;
    }

    return "catalog-error" as const;
  });

  if (product === "catalog-error") {
    return <ProductDetailView state={{ status: "error" }} />;
  }

  if (!product) {
    notFound();
  }

  return <ProductDetailView state={{ status: "ready", product }} />;
}
