import { StoreHomeView } from "@/components/store/store-home-view";
import { getProductListState } from "@/server/products/queries";

export const dynamic = "force-dynamic";

export default async function StoreHomePage() {
  const catalog = await getProductListState();

  return <StoreHomeView catalog={catalog} />;
}
