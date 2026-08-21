"use client";

import { DocumentPage } from "@/lib/documents";

export default function SalesPage() {
  return (
    <DocumentPage
      config={{
        title: "Sales",
        itemTitle: "Sale",
        apiPath: "/sales",
        partyLabel: "Buyer",
        partyField: "customerId",
        partyPath: "/customers",
        partyName: "customer",
        priceField: "sellingPrice",
        priceLabel: "Price",
        confirmAction: "sales.confirm",
        cancelAction: "sales.cancel",
        listQueryParams: [],
      }}
    />
  );
}
