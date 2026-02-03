/**
 * Tauri Invoke Wrappers
 * Type-safe wrappers for Tauri commands
 */

import { invoke } from "@tauri-apps/api/core";

// ============================================
// AUTH TYPES
// ============================================

export interface User {
  id: string;
  org_id: string;
  tenant_id?: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface RegisterUserDto {
  name: string;
  email: string;
  password: string;
  role?: string;
}

// ============================================
// AUTH API
// ============================================

export const auth = {
  login: (email: string, password: string) =>
    invoke<User>("login", { credentials: { email, password } }),

  logout: () => invoke<void>("logout"),

  getCurrentUser: () => invoke<User | null>("get_current_user"),

  registerUser: (data: RegisterUserDto) =>
    invoke<User>("register_user", { data }),

  changePassword: (currentPassword: string, newPassword: string) =>
    invoke<void>("change_password", { currentPassword, newPassword }),

  setupInitialAdmin: (
    orgName: string,
    adminName: string,
    adminEmail: string,
    adminPassword: string,
  ) =>
    invoke<User>("setup_initial_admin", {
      orgName,
      adminName,
      adminEmail,
      adminPassword,
    }),

  checkSetupRequired: () => invoke<boolean>("check_setup_required"),
};

// ============================================
// SYSTEM API
// ============================================

export const system = {
  getAppInfo: () =>
    invoke<{ version: string; tenant_id: string }>("get_app_info"),

  checkLicense: () =>
    invoke<{ status: string; expires_at?: string }>("check_license"),
};

// ============================================
// CLIENT TYPES
// ============================================

export interface Client {
  id: string;
  tenant_id: string;
  code?: string;
  name: string;
  tax_id?: string;
  tax_type?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateClientDto {
  name: string;
  tax_id?: string;
  tax_type?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  notes?: string;
}

export interface UpdateClientDto {
  code?: string;
  name?: string;
  tax_id?: string;
  tax_type?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  notes?: string;
}

export interface ClientFilters {
  search?: string;
  isActive?: boolean;
}

// ============================================
// CLIENTS API
// ============================================

export const clients = {
  create: (data: CreateClientDto) => invoke<Client>("create_client", { data }),

  get: (id: string) => invoke<Client>("get_client", { id }),

  list: (filters?: ClientFilters) =>
    invoke<Client[]>("list_clients", { filters }),

  update: (id: string, data: UpdateClientDto) =>
    invoke<Client>("update_client", { id, data }),

  delete: (id: string) => invoke<void>("delete_client", { id }),

  restore: (id: string) => invoke<void>("restore_client", { id }),

  search: (query: string) => invoke<Client[]>("search_clients", { query }),
};

// ============================================
// INVENTORY TYPES
// ============================================

export interface Category {
  id: string;
  tenant_id: string;
  parent_id?: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  tenant_id: string;
  name: string;
  abbreviation: string;
  unit_type: string;
  base_unit_id?: string;
  conversion_factor: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductType {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description?: string;
  affects_stock: boolean;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  sku?: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id?: string;
  category_name?: string; // Derived
  unit_id?: string;
  product_type_id?: string;
  cost_price: number;
  sale_price: number;
  margin_percent: number;
  margin_amount: number;
  tax_rate: number;
  stock_quantity: number;
  min_stock: number;
  max_stock: number;
  supplier_reference?: string;
  image_url?: string;
  has_variants: boolean;
  track_expiration: boolean;
  cost_method: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductDto {
  sku?: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id?: string;
  unit_id?: string;
  product_type_id?: string;
  cost_price?: number;
  sale_price?: number;
  tax_rate?: number;
  min_stock?: number;
  max_stock?: number;
  supplier_reference?: string;
  image_url?: string;
  has_variants?: boolean;
  track_expiration?: boolean;
}

export interface UpdateProductDto {
  sku?: string;
  barcode?: string;
  name?: string;
  description?: string;
  category_id?: string;
  unit_id?: string;
  product_type_id?: string;
  cost_price?: number;
  sale_price?: number;
  tax_rate?: number;
  min_stock?: number;
  max_stock?: number;
  supplier_reference?: string;
  image_url?: string;
  has_variants?: boolean;
  track_expiration?: boolean;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  productTypeId?: string;
  isActive?: boolean;
  lowStock?: boolean;
}

export interface CreateCategoryDto {
  parent_id?: string;
  name: string;
  description?: string;
  sort_order?: number;
}

export interface CategoryFilters {
  search?: string;
  parentId?: string;
  isActive?: boolean;
}

// ============================================
// INVENTORY API
// ============================================

export const categories = {
  list: (filters?: CategoryFilters) =>
    invoke<Category[]>("list_categories", { filters }),

  get: (id: string) => invoke<Category>("get_category", { id }),

  create: (data: CreateCategoryDto) =>
    invoke<Category>("create_category", { data }),

  update: (id: string, data: Partial<CreateCategoryDto>) =>
    invoke<Category>("update_category", { id, data }),

  delete: (id: string) => invoke<void>("delete_category", { id }),

  restore: (id: string) => invoke<void>("restore_category", { id }),
};

export const units = {
  list: () => invoke<Unit[]>("list_units"),

  get: (id: string) => invoke<Unit>("get_unit", { id }),

  create: (data: { name: string; abbreviation: string; unit_type?: string }) =>
    invoke<Unit>("create_unit", { data }),

  update: (
    id: string,
    data: Partial<{ name: string; abbreviation: string; unit_type: string }>,
  ) => invoke<Unit>("update_unit", { id, data }),

  delete: (id: string) => invoke<void>("delete_unit", { id }),
};

export const productTypes = {
  list: () => invoke<ProductType[]>("list_product_types"),
};

export const products = {
  list: (filters?: ProductFilters) =>
    invoke<Product[]>("list_products", { filters }),

  get: (id: string) => invoke<Product>("get_product", { id }),

  create: (data: CreateProductDto) =>
    invoke<Product>("create_product", { data }),

  update: (id: string, data: UpdateProductDto) =>
    invoke<Product>("update_product", { id, data }),

  delete: (id: string) => invoke<void>("delete_product", { id }),

  restore: (id: string) => invoke<void>("restore_product", { id }),

  adjustStock: (productId: string, quantity: number, reason?: string) =>
    invoke<Product>("adjust_stock", { productId, quantity, reason }),

  getLowStock: () => invoke<Product[]>("get_low_stock_products"),
};

export const inventory = {
  seedData: () => invoke<string>("seed_inventory_data"),
};

// ============================================
// VARIANT TYPES
// ============================================

export interface ProductVariant {
  id: string;
  tenant_id: string;
  product_id: string;
  sku?: string;
  name: string;
  attributes?: string;
  cost_price: number;
  sale_price: number;
  barcode?: string;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateVariantDto {
  product_id: string;
  name: string;
  sku?: string;
  attributes?: string;
  cost_price?: number;
  sale_price?: number;
  barcode?: string;
}

export interface UpdateVariantDto {
  name?: string;
  sku?: string;
  attributes?: string;
  cost_price?: number;
  sale_price?: number;
  barcode?: string;
}

// ============================================
// VARIANT API
// ============================================

export const variants = {
  list: (productId: string) =>
    invoke<ProductVariant[]>("list_variants", { productId }),

  get: (id: string) => invoke<ProductVariant>("get_variant", { id }),

  create: (data: CreateVariantDto) =>
    invoke<ProductVariant>("create_variant", { data }),

  update: (id: string, data: UpdateVariantDto) =>
    invoke<ProductVariant>("update_variant", { id, data }),

  delete: (id: string) => invoke<void>("delete_variant", { id }),

  adjustStock: (variantId: string, quantity: number, reason?: string) =>
    invoke<ProductVariant>("adjust_variant_stock", {
      variantId,
      quantity,
      reason,
    }),
};

// ============================================
// LOT TYPES
// ============================================

export interface InventoryLot {
  id: string;
  tenant_id: string;
  product_id: string;
  variant_id?: string;
  lot_number: string;
  quantity: number;
  cost_price?: number;
  expiration_date?: string;
  received_date: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateLotDto {
  product_id: string;
  variant_id?: string;
  lot_number: string;
  quantity: number;
  cost_price?: number;
  expiration_date?: string;
  received_date?: string;
}

export interface AdjustLotDto {
  quantity: number;
  reason?: string;
}

export interface LotFilters {
  product_id?: string;
  variant_id?: string;
  expiring_before?: string;
  expired_only?: boolean;
  is_active?: boolean;
}

// ============================================
// LOT API
// ============================================

export const lots = {
  list: (filters?: LotFilters) =>
    invoke<InventoryLot[]>("list_lots", { filters }),

  get: (id: string) => invoke<InventoryLot>("get_lot", { id }),

  create: (data: CreateLotDto) => invoke<InventoryLot>("create_lot", { data }),

  adjust: (id: string, data: AdjustLotDto) =>
    invoke<InventoryLot>("adjust_lot", { id, data }),

  delete: (id: string) => invoke<void>("delete_lot", { id }),

  getExpiring: (days?: number) =>
    invoke<InventoryLot[]>("get_expiring_lots", { days }),
};

// ============================================
// PRICE HISTORY TYPES
// ============================================

export interface PriceHistory {
  id: string;
  tenant_id: string;
  product_id: string;
  variant_id?: string;
  price_type: "cost" | "sale";
  old_price?: number;
  new_price: number;
  changed_by?: string;
  reason?: string;
  created_at: string;
}

export interface PriceHistoryFilters {
  product_id?: string;
  variant_id?: string;
  price_type?: string;
  from_date?: string;
  to_date?: string;
}

// ============================================
// PRICE HISTORY API
// ============================================

export const priceHistory = {
  list: (filters?: PriceHistoryFilters) =>
    invoke<PriceHistory[]>("list_price_history", { filters }),
};

// ============================================
// SETTINGS TYPES
// ============================================

export interface CompanySettings {
  id: string;
  tenant_id: string;
  name: string;
  legal_id: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_path?: string;
  invoice_prefix: string;
  invoice_counter: number;
  default_currency: string;
  legal_note?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateCompanySettingsDto {
  name?: string;
  legal_id?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_path?: string;
  invoice_prefix?: string;
  default_currency?: string;
  legal_note?: string;
}

export interface BankAccount {
  id: string;
  tenant_id: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  currency: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBankAccountDto {
  bank_name: string;
  account_number: string;
  account_type: string;
  currency: string;
  is_default: boolean;
}

export interface UpdateBankAccountDto {
  bank_name?: string;
  account_number?: string;
  account_type?: string;
  currency?: string;
  is_default?: boolean;
}

export interface TaxSetting {
  id: string;
  tenant_id: string;
  name: string;
  rate: number;
  applies_to: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTaxSettingDto {
  name: string;
  rate: number;
  applies_to: string;
  is_active: boolean;
}

export interface UpdateTaxSettingDto {
  name?: string;
  rate?: number;
  applies_to?: string;
  is_active?: boolean;
}

export interface InvoiceSequence {
  prefix: string;
  next_number: number;
  pattern: string;
}

export interface UpdateInvoiceSequenceDto {
  prefix: string;
  next_number: number;
  pattern: string;
}

export interface Warehouse {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
}

export interface CreateWarehouseDto {
  code: string;
  name: string;
  is_default: boolean;
}

export interface UpdateWarehouseDto {
  code?: string;
  name?: string;
  is_default?: boolean;
}

// ============================================
// SETTINGS API
// ============================================

export const settings = {
  // Company Settings
  getCompanySettings: () => invoke<CompanySettings>("get_company_settings"),

  updateCompanySettings: (data: UpdateCompanySettingsDto) =>
    invoke<CompanySettings>("update_company_settings", { data }),

  // Bank Accounts
  listBankAccounts: () => invoke<BankAccount[]>("list_bank_accounts"),

  createBankAccount: (data: CreateBankAccountDto) =>
    invoke<BankAccount>("create_bank_account", { data }),

  updateBankAccount: (id: string, data: UpdateBankAccountDto) =>
    invoke<BankAccount>("update_bank_account", { id, data }),

  deleteBankAccount: (id: string) =>
    invoke<void>("delete_bank_account", { id }),

  // Tax Settings
  listTaxSettings: () => invoke<TaxSetting[]>("list_tax_settings"),

  createTaxSetting: (data: CreateTaxSettingDto) =>
    invoke<TaxSetting>("create_tax_setting", { data }),

  updateTaxSetting: (id: string, data: UpdateTaxSettingDto) =>
    invoke<TaxSetting>("update_tax_setting", { id, data }),

  deleteTaxSetting: (id: string) => invoke<void>("delete_tax_setting", { id }),

  // Invoice Sequence
  getInvoiceSequence: () => invoke<InvoiceSequence>("get_invoice_sequence"),

  updateInvoiceSequence: (data: UpdateInvoiceSequenceDto) =>
    invoke<InvoiceSequence>("update_invoice_sequence", { data }),

  // Warehouses
  listWarehouses: () => invoke<Warehouse[]>("list_warehouses"),

  createWarehouse: (data: CreateWarehouseDto) =>
    invoke<Warehouse>("create_warehouse", { data }),

  updateWarehouse: (id: string, data: UpdateWarehouseDto) =>
    invoke<Warehouse>("update_warehouse", { id, data }),

  deleteWarehouse: (id: string) => invoke<void>("delete_warehouse", { id }),
};

// ============================================
// PRICE LISTS TYPES
// ============================================

export interface PriceList {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  currency: string;
  discount_percent: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePriceListDto {
  name: string;
  description?: string;
  currency: string;
  discount_percent: number;
  is_default: boolean;
}

export interface UpdatePriceListDto {
  name?: string;
  description?: string;
  currency?: string;
  discount_percent?: number;
  is_default?: boolean;
  is_active?: boolean;
}

export interface ProductPrice {
  id: string;
  price_list_id: string;
  product_id: string;
  variant_id?: string;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface SetProductPriceDto {
  price_list_id: string;
  product_id: string;
  variant_id?: string;
  price: number;
}

// ============================================
// PRICE LISTS API
// ============================================

export const priceLists = {
  list: () => invoke<PriceList[]>("list_price_lists"),

  get: (id: string) => invoke<PriceList>("get_price_list", { id }),

  create: (data: CreatePriceListDto) =>
    invoke<PriceList>("create_price_list", { data }),

  update: (id: string, data: UpdatePriceListDto) =>
    invoke<PriceList>("update_price_list", { id, data }),

  delete: (id: string) => invoke<void>("delete_price_list", { id }),

  listProductPrices: (priceListId: string) =>
    invoke<ProductPrice[]>("list_product_prices", { priceListId }),

  setProductPrice: (data: SetProductPriceDto) =>
    invoke<ProductPrice>("set_product_price", { data }),

  deleteProductPrice: (id: string) =>
    invoke<void>("delete_product_price", { id }),
};

// ============================================
// DISCOUNTS TYPES
// ============================================

export interface Discount {
  id: string;
  tenant_id: string;
  name: string;
  discount_type: string;
  value: number;
  applies_to: string;
  target_id?: string;
  min_quantity?: number;
  max_uses?: number;
  times_used: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDiscountDto {
  name: string;
  discount_type: string;
  value: number;
  applies_to: string;
  target_id?: string;
  min_quantity?: number;
  max_uses?: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
}

export interface UpdateDiscountDto {
  name?: string;
  discount_type?: string;
  value?: number;
  applies_to?: string;
  target_id?: string;
  min_quantity?: number;
  max_uses?: number;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

// ============================================
// DISCOUNTS API
// ============================================

export const discounts = {
  list: () => invoke<Discount[]>("list_discounts"),
  
  get: (id: string) => invoke<Discount>("get_discount", { id }),
  
  create: (data: CreateDiscountDto) => 
    invoke<Discount>("create_discount", { data }),
    
  update: (id: string, data: UpdateDiscountDto) => 
    invoke<Discount>("update_discount", { id, data }),
    
  delete: (id: string) => invoke<void>("delete_discount", { id }),
  
  use: (id: string) => invoke<void>("use_discount", { id }),
};

// ============================================
// CASH REGISTER TYPES
// ============================================

export interface CashRegister {
  id: string;
  tenant_id: string;
  name: string;
  status: 'closed' | 'open';
  current_session_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CashRegisterSession {
  id: string;
  tenant_id: string;
  register_id: string;
  user_id: string;
  status: 'active' | 'closed';
  start_time: string;
  end_time?: string;
  
  opening_amount_usd: number;
  opening_amount_ves: number;
  opening_amount_eur: number;
  opening_exchange_rate_ves: number;
  opening_exchange_rate_eur: number;
  opening_notes?: string;

  closing_amount_usd?: number;
  closing_amount_ves?: number;
  closing_amount_eur?: number;
  closing_notes?: string;

  expected_amount_usd?: number;
  expected_amount_ves?: number;
  expected_amount_eur?: number;

  created_at: string;
  updated_at: string;
}

export interface CashMovement {
  id: string;
  tenant_id: string;
  session_id: string;
  user_id: string;
  movement_type: 'deposit' | 'withdrawal';
  amount: number;
  currency: 'USD' | 'VES' | 'EUR';
  exchange_rate: number;
  reason?: string;
  reference?: string;
  created_at: string;
}

export interface OpenSessionDto {
  register_id: string;
  opening_amount_usd: number;
  opening_amount_ves: number;
  opening_amount_eur: number;
  exchange_rate_ves: number;
  exchange_rate_eur: number;
  notes?: string;
}

export interface CloseSessionDto {
  session_id: string;
  closing_amount_usd: number;
  closing_amount_ves: number;
  closing_amount_eur: number;
  notes?: string;
}

export interface AddMovementDto {
  session_id: string;
  movement_type: 'deposit' | 'withdrawal';
  amount: number;
  currency: 'USD' | 'VES' | 'EUR';
  reason: string;
  reference: string;
}

// ============================================
// CASH REGISTER API
// ============================================

export const cashRegisters = {
  create: (name: string) => invoke<CashRegister>("create_register", { name }),
  
  openSession: (data: OpenSessionDto) => invoke<CashRegisterSession>("open_session", { data }),
  
  closeSession: (data: CloseSessionDto) => invoke<CashRegisterSession>("close_session", { data }),
  
  addMovement: (data: AddMovementDto) => invoke<CashMovement>("add_movement", { data }),
  
  getActiveSession: () => invoke<CashRegisterSession | null>("get_active_session"),

  list: () => invoke<CashRegister[]>("list_registers"),
};



// ============================================
// INVOICES TYPES
// ============================================

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  invoice_type: string;
  status: string;
  client_id: string;
  client_name: string;
  client_tax_id?: string;
  client_address?: string;
  price_list_id?: string;
  currency: string;
  exchange_rate: number;
  issue_date: string;
  due_date?: string;
  payment_terms?: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  paid_amount: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  variant_id?: string;
  lot_id?: string;
  code: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
}

export interface CreateInvoiceItemDto {
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
}

export interface CreateInvoiceDto {
  invoice_type: string;
  client_id: string;
  price_list_id?: string;
  currency: string;
  exchange_rate: number;
  issue_date: string;
  due_date?: string;
  payment_terms?: string;
  notes?: string;
  items: CreateInvoiceItemDto[];
}

export interface InvoiceFilters {
  invoice_type?: string;
  status?: string;
  client_id?: string;
  from_date?: string;
  to_date?: string;
}

// ============================================
// PAYMENTS TYPES
// ============================================

export interface AccountBalance {
  id: string;
  bank_name: string;
  currency: string;
  balance: number;
}

export interface TreasuryMovement {
    id: string;
    date: string;
    amount: number;
    currency: string;
    type_: "IN" | "OUT";
    description: string;
    reference?: string;
    bank_name: string;
}

export interface Payment {
  id: string;
  tenant_id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  received_amount?: number;
  exchange_rate: number;
  payment_method: string;
  reference?: string;
  bank_account_id?: string;
  payment_date: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface CreatePaymentDto {
  invoice_id: string;
  amount: number;
  currency: string;
  received_amount?: number;
  exchange_rate: number;
  payment_method: string;
  reference?: string;
  bank_account_id?: string;
  payment_date: string;
  notes?: string;
}

// ============================================
// INVOICES API
// ============================================

export const invoices = {
  list: (filters?: InvoiceFilters) =>
    invoke<Invoice[]>("list_invoices", { filters }),

  get: (id: string) => invoke<[Invoice, InvoiceItem[]]>("get_invoice", { id }),

  create: (data: CreateInvoiceDto) =>
    invoke<Invoice>("create_invoice", { data }),

  issue: (id: string) => invoke<Invoice>("issue_invoice", { id }),

  cancel: (id: string) => invoke<Invoice>("cancel_invoice", { id }),

  delete: (id: string) => invoke<void>("delete_invoice", { id }),
};

// ============================================
// PAYMENTS API
// ============================================

export const payments = {
  list: (invoiceId: string) =>
    invoke<Payment[]>("list_payments", { invoiceId }),

  register: (data: CreatePaymentDto) =>
    invoke<Payment>("register_payment", { data }),

  delete: (id: string) => invoke<void>("delete_payment", { id }),

  getAccountBalances: () => invoke<AccountBalance[]>("get_account_balances"),

  getRecentMovements: (limit: number = 50, bankAccountId?: string) => 
    invoke<TreasuryMovement[]>("get_recent_movements", { limit, bankAccountId }),
};
