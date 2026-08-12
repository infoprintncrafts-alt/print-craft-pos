export type Customer = {
  id: string;
  customer_code: string | null;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  address?: string | null;
  is_active?: boolean;
};

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  product_code: string | null;
  category: string | null;
  item_type: string;
  unit: string | null;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  minimum_stock: number;
  track_stock: boolean;
  is_active: boolean;
};

export type CartItem = {
  product: Product;
  quantity: number;
  discount: number;
  isManual?: boolean;
};

export type SaleItemSnapshot = {
  product_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
};

export type SavedSaleSnapshot = {
  saleId: string;
  invoiceNumber: string;
  customer: Customer | null;
  cart: CartItem[];
  grossSubtotal: number;
  itemDiscount: number;
  subtotal: number;
  invoiceDiscount: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  change: number;
  paymentMethod: string;
};

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "card"
  | "online"
  | "other";

export type StockMovement = {
  product_id: string;
  movement_type: "purchase" | "sale" | "return" | "adjustment";
  quantity_change: number;
  resulting_quantity: number;
  reference_type: string;
  reference_id: string;
  notes: string | null;
  created_by: string | null;
};
