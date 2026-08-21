-- Add unique constraints on name columns for master data tables

CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");
CREATE UNIQUE INDEX "Customer_name_key" ON "Customer"("name");
CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "ExpenseCategory"("name");
