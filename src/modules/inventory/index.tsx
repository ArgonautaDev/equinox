/**
 * Inventory Module - Entry Point
 */

import { Routes, Route } from "react-router-dom";
import { ProductList } from "./ProductList";
import { ProductForm } from "./ProductForm";
import { CategoryList } from "./CategoryList";
import { StockView } from "./StockView";
import { LotManager } from "./LotManager";

export function InventoryModule() {
  return (
    <Routes>
      <Route index element={<ProductList />} />
      <Route path="products" element={<ProductList />} />
      <Route path="products/new" element={<ProductForm />} />
      <Route path="products/:id" element={<ProductForm />} />
      <Route path="categories" element={<CategoryList />} />
      <Route path="stock" element={<StockView />} />
      <Route path="lots" element={<LotManager />} />
    </Routes>
  );
}
