"use client";

import { DocumentPage } from "@/lib/documents";

export default function PurchasesPage() {
  return (
    <DocumentPage
      config={{
        title: "Purchases",
        itemTitle: "Purchase",
        apiPath: "/purchases",
        partyLabel: "Seller",
        partyField: "supplierId",
        partyPath: "/suppliers",
        partyName: "supplier",
        priceField: "costPrice",
        priceLabel: "Cost",
        confirmAction: "purchases.confirm",
        cancelAction: "purchases.cancel",
        listQueryParams: [],
      }}
    />
  );
}
