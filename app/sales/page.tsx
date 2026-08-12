"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  customer_code: string | null;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  is_active: boolean;
};

type Product = {
  id: string;
  name: string;
  sku: string | null;
  product_code: string | null;
  category: string | null;
  item_type: string | null;
  unit: string | null;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  minimum_stock: number;
  track_stock: boolean;
  is_active: boolean;
};

type CartItem = {
  product: Product;
  quantity: number;
  discount: number;
  isManual?: boolean;
};

type SavedSaleSnapshot = {
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

export default function SalesPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // CUSTOMER
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerList, setShowCustomerList] = useState(false);

  // PRODUCT SEARCH
  const [productSearch, setProductSearch] = useState("");

  // CUSTOM ITEM
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const [manualItemName, setManualItemName] = useState("");
  const [manualItemPrice, setManualItemPrice] = useState("");
  const [manualItemQuantity, setManualItemQuantity] = useState("1");
  const [manualItemDiscount, setManualItemDiscount] = useState("0");

  // ADD PRODUCT
  const [newProductName, setNewProductName] = useState("");
  const [newProductCode, setNewProductCode] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCost, setNewProductCost] = useState("0");
  const [newProductStock, setNewProductStock] = useState("0");
  const [newProductUnit, setNewProductUnit] = useState("pcs");
  const [addingProduct, setAddingProduct] = useState(false);

  // CART
  const [cart, setCart] = useState<CartItem[]>([]);

  // TOTALS
  const [invoiceDiscount, setInvoiceDiscount] = useState("");
  const [tax, setTax] = useState("");

  // PAYMENT
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");

  // NOTES
  const [notes, setNotes] = useState("");

  // SUCCESS
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedSale, setSavedSale] =
    useState<SavedSaleSnapshot | null>(null);

  // =========================================================
  // LOAD DATA
  // =========================================================

  async function loadData() {
    try {
      setLoading(true);

      const [customersResult, productsResult] =
        await Promise.all([
          supabase
            .from("customers")
            .select(`
              id,
              customer_code,
              name,
              phone,
              whatsapp,
              is_active
            `)
            .eq("is_active", true)
            .order("name"),

          supabase
            .from("products")
            .select(`
              id,
              name,
              sku,
              product_code,
              category,
              item_type,
              unit,
              cost_price,
              selling_price,
              stock_quantity,
              minimum_stock,
              track_stock,
              is_active
            `)
            .eq("is_active", true)
            .order("name"),
        ]);

      if (customersResult.error) {
        throw new Error(
          `Customers: ${customersResult.error.message}`
        );
      }

      if (productsResult.error) {
        throw new Error(
          `Products: ${productsResult.error.message}`
        );
      }

      setCustomers(
        (customersResult.data ?? []) as Customer[]
      );

      setProducts(
        (productsResult.data ?? []) as Product[]
      );
    } catch (error) {
      console.error("Load POS data error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to load POS data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get("orderId");
    if (!orderId) return;
    async function loadOrderIntoSale() {
      const { data: order } = await supabase.from("orders").select("id,customer_id,title,quantity,total,order_items(item_name,quantity,unit_price,product_id)").eq("id", orderId).maybeSingle();
      if (!order) return;
      if (order.customer_id) setCustomerId(order.customer_id);
      const items = Array.isArray(order.order_items) ? order.order_items : [];
      const first = items[0] ?? { item_name: order.title, quantity: order.quantity, unit_price: Number(order.total || 0) / Math.max(Number(order.quantity || 1), 1), product_id: null };
      const existing = products.find((product) => product.id === first.product_id);
      const product = existing ?? { id: `order-${order.id}`, name: first.item_name, sku: null, product_code: null, category: "Printing job", item_type: "manual", unit: "pcs", cost_price: 0, selling_price: Number(first.unit_price || 0), stock_quantity: 0, minimum_stock: 0, track_stock: false, is_active: true };
      setCart([{ product, quantity: Number(first.quantity || 1), discount: 0, isManual: !existing }]);
    }
    if (products.length > 0) void loadOrderIntoSale();
  }, [products]);

  // =========================================================
  // MONEY
  // =========================================================

  function money(value: number) {
    return (
      "LKR " +
      Number(value || 0).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  // =========================================================
  // CUSTOMER SEARCH
  // =========================================================

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(query) ||
        (customer.customer_code ?? "")
          .toLowerCase()
          .includes(query) ||
        (customer.phone ?? "")
          .toLowerCase()
          .includes(query) ||
        (customer.whatsapp ?? "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [customers, customerSearch]);

  const selectedCustomer =
    customers.find(
      (customer) => customer.id === customerId
    ) ?? null;

  function selectCustomer(customer: Customer) {
    setCustomerId(customer.id);
    setCustomerSearch(customer.name);
    setShowCustomerList(false);
  }

  function clearCustomer() {
    setCustomerId("");
    setCustomerSearch("");
    setShowCustomerList(false);
  }

  // =========================================================
  // PRODUCT SEARCH
  // =========================================================

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        (product.sku ?? "")
          .toLowerCase()
          .includes(query) ||
        (product.product_code ?? "")
          .toLowerCase()
          .includes(query) ||
        (product.category ?? "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [products, productSearch]);

  const itemNotFound =
    productSearch.trim().length > 0 &&
    filteredProducts.length === 0;

  // =========================================================
  // ADD PRODUCT
  // =========================================================

  function addProduct(product: Product) {
    if (
      product.track_stock &&
      Number(product.stock_quantity) <= 0
    ) {
      alert(`${product.name} is out of stock.`);
      return;
    }

    const existing = cart.find(
      (item) => item.product.id === product.id
    );

    if (existing) {
      const newQuantity =
        existing.quantity + 1;

      if (
        product.track_stock &&
        newQuantity >
          Number(product.stock_quantity)
      ) {
        alert(
          `Only ${product.stock_quantity} ${
            product.unit || "units"
          } available for ${product.name}.`
        );
        return;
      }

      setCart((current) =>
        current.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: newQuantity,
              }
            : item
        )
      );
    } else {
      setCart((current) => [
        ...current,
        {
          product,
          quantity: 1,
          discount: 0,
        },
      ]);
    }

    setProductSearch("");
  }

  // =========================================================
  // ADD CUSTOM ITEM
  // =========================================================

  function openCustomItem() {
    setManualItemName(productSearch.trim());
    setManualItemPrice("");
    setManualItemQuantity("1");
    setManualItemDiscount("0");

    setShowCustomItem(true);
    setShowAddProduct(false);
  }

  function addManualItem() {
    const name = manualItemName.trim();
    const price = Number(manualItemPrice);
    const quantity = Number(manualItemQuantity);
    const unitDiscount =
      Number(manualItemDiscount) || 0;

    if (!name) {
      alert("Please enter an item name.");
      return;
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      alert("Please enter a valid unit price.");
      return;
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      alert("Please enter a valid quantity.");
      return;
    }

    if (
      !Number.isFinite(unitDiscount) ||
      unitDiscount < 0
    ) {
      alert("Please enter a valid unit discount.");
      return;
    }

    if (unitDiscount > price) {
      alert(
        "Unit discount cannot be greater than unit price."
      );
      return;
    }

    const manualProduct: Product = {
      id: `manual-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`,
      name,
      sku: null,
      product_code: null,
      category: "Manual Item",
      item_type: "manual",
      unit: "pcs",
      cost_price: 0,
      selling_price: price,
      stock_quantity: 0,
      minimum_stock: 0,
      track_stock: false,
      is_active: true,
    };

    setCart((current) => [
      ...current,
      {
        product: manualProduct,
        quantity: Math.floor(quantity),
        discount: unitDiscount,
        isManual: true,
      },
    ]);

    setManualItemName("");
    setManualItemPrice("");
    setManualItemQuantity("1");
    setManualItemDiscount("0");

    setShowCustomItem(false);
    setProductSearch("");
  }

  // =========================================================
  // ADD TO PRODUCT LIST
  // =========================================================

  function openAddProduct() {
    setNewProductName(productSearch.trim());
    setNewProductCode("");
    setNewProductPrice("");
    setNewProductCost("0");
    setNewProductStock("0");
    setNewProductUnit("pcs");

    setShowAddProduct(true);
    setShowCustomItem(false);
  }

  async function addProductToList() {
    const name = newProductName.trim();
    const sellingPrice = Number(newProductPrice);
    const costPrice =
      Number(newProductCost) || 0;
    const stockQuantity =
      Number(newProductStock) || 0;

    if (!name) {
      alert("Please enter the product name.");
      return;
    }

    if (
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0
    ) {
      alert("Please enter a valid selling price.");
      return;
    }

    if (
      !Number.isFinite(costPrice) ||
      costPrice < 0
    ) {
      alert("Please enter a valid cost price.");
      return;
    }

    if (
      !Number.isFinite(stockQuantity) ||
      stockQuantity < 0
    ) {
      alert("Please enter a valid stock quantity.");
      return;
    }

    try {
      setAddingProduct(true);

      const { data, error } = await supabase
        .from("products")
        .insert({
          name,
          product_code:
            newProductCode.trim() || null,
          sku:
            newProductCode.trim() || null,
          category: null,
          item_type: "product",
          unit:
            newProductUnit.trim() || "pcs",
          cost_price: costPrice,
          selling_price: sellingPrice,
          stock_quantity: stockQuantity,
          minimum_stock: 0,
          track_stock: true,
          is_active: true,
        })
        .select(`
          id,
          name,
          sku,
          product_code,
          category,
          item_type,
          unit,
          cost_price,
          selling_price,
          stock_quantity,
          minimum_stock,
          track_stock,
          is_active
        `)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error(
          "Product was not created."
        );
      }

      const newProduct =
        data as Product;

      setProducts((current) =>
        [...current, newProduct].sort(
          (a, b) =>
            a.name.localeCompare(b.name)
        )
      );

      addProduct(newProduct);

      setShowAddProduct(false);
      setProductSearch("");
    } catch (error) {
      console.error(
        "Add product error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Unable to add product."
      );
    } finally {
      setAddingProduct(false);
    }
  }

  // =========================================================
  // CART
  // =========================================================

  function removeProduct(productId: string) {
    setCart((current) =>
      current.filter(
        (item) =>
          item.product.id !== productId
      )
    );
  }

  function updateQuantity(
    productId: string,
    quantity: number
  ) {
    if (!Number.isFinite(quantity)) {
      return;
    }

    if (quantity < 1) {
      removeProduct(productId);
      return;
    }

    const item = cart.find(
      (cartItem) =>
        cartItem.product.id === productId
    );

    if (!item) {
      return;
    }

    if (
      item.product.track_stock &&
      quantity >
        Number(item.product.stock_quantity)
    ) {
      alert(
        `Only ${item.product.stock_quantity} ${
          item.product.unit || "units"
        } available.`
      );
      return;
    }

    setCart((current) =>
      current.map((cartItem) =>
        cartItem.product.id === productId
          ? {
              ...cartItem,
              quantity:
                Math.floor(quantity),
            }
          : cartItem
      )
    );
  }

  // IMPORTANT:
  // item.discount is a UNIT DISCOUNT (per single unit of the item),
  // not the total discount for the whole line.
  // Multiply by quantity wherever you need the line's total discount.
  function updateItemDiscount(
    productId: string,
    discount: number
  ) {
    const item = cart.find(
      (cartItem) =>
        cartItem.product.id === productId
    );

    if (!item) {
      return;
    }

    const price = Number(
      item.product.selling_price || 0
    );

    const safeDiscount = Math.min(
      Math.max(
        Number.isFinite(discount)
          ? discount
          : 0,
        0
      ),
      price
    );

    setCart((current) =>
      current.map((cartItem) =>
        cartItem.product.id === productId
          ? {
              ...cartItem,
              discount: safeDiscount,
            }
          : cartItem
      )
    );
  }

  // =========================================================
  // TOTALS
  // =========================================================

  const grossSubtotal = cart.reduce(
    (sum, item) => {
      const price = Number(
        item.product.selling_price || 0
      );

      return (
        sum +
        item.quantity * price
      );
    },
    0
  );

  // UNIT discount × quantity
  const totalItemDiscount = cart.reduce(
    (sum, item) => {
      const price = Number(
        item.product.selling_price || 0
      );

      const unitDiscount = Math.min(
        Math.max(
          Number(item.discount) || 0,
          0
        ),
        price
      );

      return (
        sum +
        unitDiscount * item.quantity
      );
    },
    0
  );

  const subtotal = Math.max(
    grossSubtotal -
      totalItemDiscount,
    0
  );

  const invoiceDiscountValue =
    Math.min(
      Math.max(
        Number(invoiceDiscount) || 0,
        0
      ),
      subtotal
    );

  const taxValue = Math.max(
    Number(tax) || 0,
    0
  );

  const total = Math.max(
    subtotal -
      invoiceDiscountValue +
      taxValue,
    0
  );

  const paid = Math.max(
    Number(amountPaid) || 0,
    0
  );

  const balance = Math.max(
    total - paid,
    0
  );

  const change = Math.max(
    paid - total,
    0
  );

  // =========================================================
  // PAYMENT STATUS
  // =========================================================

  function getPaymentStatus() {
    if (paid <= 0) {
      return "unpaid";
    }

    if (paid >= total) {
      return "paid";
    }

    return "partial";
  }

  // =========================================================
  // INVOICE NUMBER
  // =========================================================

  async function generateInvoiceNumber() {
    // Counting rows is unsafe: after a deletion or concurrent sale it can
    // reuse an existing invoice number. Use a millisecond timestamp plus a
    // short random suffix instead.
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    return `INV-${stamp}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  }

  // =========================================================
  // WHATSAPP
  // =========================================================

  function getWhatsAppNumber(
    customer: Customer
  ) {
    if (!customer.whatsapp) {
      return null;
    }

    const phone =
      customer.whatsapp.replace(
        /\D/g,
        ""
      );

    if (
      phone.startsWith("0") &&
      phone.length === 10
    ) {
      return (
        "94" +
        phone.substring(1)
      );
    }

    if (
      phone.startsWith("94") &&
      phone.length === 11
    ) {
      return phone;
    }

    if (
      phone.length >= 9 &&
      phone.length <= 15
    ) {
      return phone;
    }

    return null;
  }

  function createWhatsAppMessage(
    sale: SavedSaleSnapshot
  ) {
    let message =
      `Hello ${
        sale.customer?.name ??
        "Customer"
      },\n\n` +
      `Thank you for choosing *PRINT & CRAFT (PVT) LTD.*\n\n` +
      `🧾 Invoice: ${sale.invoiceNumber}\n\n`;

    sale.cart.forEach((item) => {
      const price = Number(
        item.product.selling_price || 0
      );

      const unitDiscount =
        Number(item.discount) || 0;

      const lineTotal =
        Math.max(
          item.quantity *
            (price - unitDiscount),
          0
        );

      message +=
        `${item.product.name} × ${
          item.quantity
        } = ${money(lineTotal)}\n`;
    });

    message +=
      `\nGross Subtotal: ${money(
        sale.grossSubtotal
      )}` +
      `\nItem Discount: ${money(
        sale.itemDiscount
      )}` +
      `\nSubtotal: ${money(
        sale.subtotal
      )}` +
      `\nInvoice Discount: ${money(
        sale.invoiceDiscount
      )}` +
      `\nTax: ${money(sale.tax)}` +
      `\nTotal: ${money(sale.total)}` +
      `\nPaid: ${money(sale.paid)}` +
      `\nBalance: ${money(
        sale.balance
      )}`;

    if (sale.change > 0) {
      message +=
        `\nChange: ${money(
          sale.change
        )}`;
    }

    message +=
      `\n\nThank you for your business! 🙏` +
      `\n\n*PRINT & CRAFT (PVT) LTD.*`;

    return message;
  }

  function sendWhatsAppInvoice(
    sale: SavedSaleSnapshot | null
  ) {
    if (!sale) {
      alert(
        "Invoice information is not available."
      );
      return;
    }

    if (!sale.customer) {
      alert(
        "This sale was created for a walk-in customer."
      );
      return;
    }

    const phone =
      getWhatsAppNumber(
        sale.customer
      );

    if (!phone) {
      alert(
        "This customer does not have a valid WhatsApp number."
      );
      return;
    }

    const message =
      createWhatsAppMessage(sale);

    const url =
      `https://wa.me/${phone}` +
      `?text=${encodeURIComponent(
        message
      )}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // =========================================================
  // SAVE SALE
  // =========================================================

  async function saveSale() {
    if (saving) {
      return;
    }

    if (cart.length === 0) {
      alert(
        "Please add at least one product or service."
      );
      return;
    }

    try {
      setSaving(true);

      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          "Unable to get logged-in user: " +
            sessionError.message
        );
      }

      const userId =
        sessionData.session?.user?.id ??
        null;

      // STOCK CHECK
      for (const item of cart) {
        if (
          item.product.track_stock &&
          item.quantity >
            Number(
              item.product.stock_quantity
            )
        ) {
          throw new Error(
            `Insufficient stock for ${item.product.name}. Available: ${item.product.stock_quantity}.`
          );
        }
      }

      const invoiceNumber =
        await generateInvoiceNumber();

      const paymentStatus =
        getPaymentStatus();

      // SAVE SALE
      const {
        data: sale,
        error: saleError,
      } = await supabase
        .from("sales")
        .insert({
          invoice_number:
            invoiceNumber,

          customer_id:
            customerId || null,

          cashier_id:
            userId,

          sale_date:
            new Date().toISOString(),

          // IMPORTANT:
          // subtotal is AFTER item discounts
          subtotal,

          // IMPORTANT:
          // total discount includes
          // item discounts + invoice discount
          discount:
            totalItemDiscount +
            invoiceDiscountValue,

          tax: taxValue,

          total,

          paid_amount: paid,

          payment_status:
            paymentStatus,

          notes:
            notes.trim() || null,
        })
        .select("*")
        .single();

      if (saleError) {
        throw new Error(
          "Sale could not be saved: " +
            saleError.message
        );
      }

      if (!sale) {
        throw new Error(
          "Sale was created but no sale record was returned."
        );
      }

      // SAVE SALE ITEMS
      //
      // item.discount in the cart is UNIT discount.
      // sale_items.discount stores TOTAL LINE DISCOUNT.
      const saleItems = cart.map(
        (item) => {
          const price = Number(
            item.product.selling_price ||
              0
          );

          const unitDiscount =
            Math.min(
              Math.max(
                Number(item.discount) ||
                  0,
                0
              ),
              price
            );

          const lineDiscount =
            unitDiscount *
            item.quantity;

          const lineTotal =
            Math.max(
              item.quantity *
                price -
                lineDiscount,
              0
            );

          return {
            sale_id: sale.id,

            product_id:
              item.isManual
                ? null
                : item.product.id,

            item_name:
              item.product.name,

            quantity:
              item.quantity,

            unit_price:
              price,

            // TOTAL discount for the line
            discount:
              lineDiscount,

            total:
              lineTotal,
          };
        }
      );

      const {
        error: itemsError,
      } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) {
        await supabase
          .from("sales")
          .delete()
          .eq("id", sale.id);

        throw new Error(
          "Sale items could not be saved: " +
            itemsError.message
        );
      }

      // UPDATE STOCK + LOG STOCK MOVEMENT
      //
      // We both update products.stock_quantity (fast current value)
      // AND insert a stock_movements row (audit trail: what changed,
      // why, and what the resulting quantity was). See migration
      // 001_stock_movements_and_balances.sql.
      for (const item of cart) {
        if (!item.product.track_stock) {
          continue;
        }

        const currentStock =
          Number(
            item.product.stock_quantity
          );

        const newStock =
          currentStock -
          item.quantity;

        const {
          error: stockError,
        } = await supabase
          .from("products")
          .update({
            stock_quantity:
              newStock,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            item.product.id
          );

        if (stockError) {
          console.error(
            "Stock update error:",
            stockError
          );

          throw new Error(
            `Sale saved, but stock update failed for ${item.product.name}: ${stockError.message}`
          );
        }

        const {
          error: movementError,
        } = await supabase
          .from("stock_movements")
          .insert({
            product_id:
              item.product.id,

            movement_type: "sale",

            quantity_change:
              -item.quantity,

            resulting_quantity:
              newStock,

            reference_type: "sale",

            reference_id: sale.id,

            notes:
              `Sale ${invoiceNumber}`,

            created_by: userId,
          });

        if (movementError) {
          // Stock quantity is already updated and correct — this is
          // only the audit-trail write failing. Log it but don't
          // block the sale on it.
          console.error(
            "Stock movement log error:",
            movementError
          );
        }
      }

      // RECORD PAYMENT
      if (paid > 0) {
        const paymentNumber =
          "PAY-" +
          new Date()
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, "") +
          "-" +
          Math.floor(
            100000 +
              Math.random() *
                900000
          );

        const {
          error: paymentError,
        } = await supabase
          .from("customer_payments")
          .insert({
            payment_number:
              paymentNumber,

            customer_id:
              customerId || null,

            sale_id:
              sale.id,

            received_by:
              userId,

            payment_date:
              new Date().toISOString(),

            amount: paid,

            payment_method:
              paymentMethod,

            reference_number:
              null,

            notes:
              `Payment for ${invoiceNumber}`,
          });

        if (paymentError) {
          console.error(
            "Payment record error:",
            paymentError
          );

          throw new Error(
            `Sale saved, but payment could not be recorded: ${paymentError.message}`
          );
        }
      }

      const saleSnapshot: SavedSaleSnapshot =
        {
          saleId: sale.id,

          invoiceNumber,

          customer:
            selectedCustomer,

          cart: [...cart],

          grossSubtotal,

          itemDiscount:
            totalItemDiscount,

          subtotal,

          invoiceDiscount:
            invoiceDiscountValue,

          tax: taxValue,

          total,

          paid,

          balance,

          change,

          paymentMethod,
        };

      setSavedSale(
        saleSnapshot
      );

      setShowSuccess(true);

      // RESET FORM
      setCart([]);

      setCustomerId("");
      setCustomerSearch("");
      setShowCustomerList(false);

      setProductSearch("");

      setInvoiceDiscount("");
      setTax("");

      setAmountPaid("");
      setPaymentMethod("cash");

      setNotes("");

      await loadData();
    } catch (error) {
      console.error(
        "Save sale error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Unable to save sale."
      );
    } finally {
      setSaving(false);
    }
  }

  function startNewSale() {
    setShowSuccess(false);
    setSavedSale(null);
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl">
            ⏳
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Loading POS...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-[1500px]">

        {/* HEADER */}

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              New Sale
            </h1>

            <p className="text-sm text-slate-500">
              Create invoice, receive payment and update stock.
            </p>
          </div>

          <div className="rounded-xl bg-white px-4 py-2 text-sm shadow-sm">
            <span className="text-slate-400">
              Items
            </span>{" "}
            <strong>
              {cart.length}
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">

          {/* =================================================
              LEFT
          ================================================= */}

          <div className="space-y-4">

            {/* CUSTOMER */}

            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-base font-bold">
                  Customer
                </h2>

                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={clearCustomer}
                    className="text-xs font-bold text-red-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={
                    selectedCustomer
                      ? selectedCustomer.name
                      : customerSearch
                  }
                  onChange={(e) => {
                    setCustomerId("");
                    setCustomerSearch(
                      e.target.value
                    );
                    setShowCustomerList(true);
                  }}
                  onFocus={() =>
                    setShowCustomerList(true)
                  }
                  placeholder="Search customer or leave blank for walk-in..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                />

                {showCustomerList &&
                  !selectedCustomer && (
                    <div className="absolute z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">

                      <button
                        type="button"
                        onClick={clearCustomer}
                        className="w-full border-b px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50"
                      >
                        👤 Walk-in Customer
                      </button>

                      {filteredCustomers
                        .slice(0, 20)
                        .map(
                          (customer) => (
                            <button
                              key={
                                customer.id
                              }
                              type="button"
                              onClick={() =>
                                selectCustomer(
                                  customer
                                )
                              }
                              className="w-full border-b px-4 py-3 text-left hover:bg-slate-50"
                            >
                              <div className="text-sm font-semibold">
                                {
                                  customer.name
                                }
                              </div>

                              <div className="text-xs text-slate-400">
                                {customer.customer_code ||
                                  customer.phone ||
                                  "Customer"}
                              </div>
                            </button>
                          )
                        )}

                      {filteredCustomers.length ===
                        0 && (
                        <div className="p-4 text-sm text-slate-500">
                          No customers found.
                        </div>
                      )}
                    </div>
                  )}
              </div>

              {selectedCustomer && (
                <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <strong>
                    {selectedCustomer.name}
                  </strong>

                  {selectedCustomer.phone && (
                    <span className="ml-3 text-slate-500">
                      📞{" "}
                      {
                        selectedCustomer.phone
                      }
                    </span>
                  )}
                </div>
              )}
            </section>

            {/* PRODUCT SEARCH */}

            <section className="rounded-2xl bg-white p-4 shadow-sm">

              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold">
                  Add Items
                </h2>

                <span className="text-xs text-slate-400">
                  Product / Service
                </span>
              </div>

              <input
                type="text"
                value={productSearch}
                onChange={(e) =>
                  setProductSearch(
                    e.target.value
                  )
                }
                placeholder="🔍 Search product, service, SKU or code..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
              />

              {productSearch.trim() && (
                <div className="mt-2">

                  {filteredProducts.length >
                    0 && (
                    <div className="grid max-h-[260px] gap-2 overflow-y-auto">

                      {filteredProducts
                        .slice(0, 30)
                        .map(
                          (product) => {
                            const outOfStock =
                              product.track_stock &&
                              Number(
                                product.stock_quantity
                              ) <= 0;

                            return (
                              <button
                                key={
                                  product.id
                                }
                                type="button"
                                disabled={
                                  outOfStock
                                }
                                onClick={() =>
                                  addProduct(
                                    product
                                  )
                                }
                                className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left ${
                                  outOfStock
                                    ? "cursor-not-allowed border-red-200 bg-red-50 opacity-60"
                                    : "border-slate-200 hover:border-black hover:bg-slate-50"
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-bold">
                                    {
                                      product.name
                                    }
                                  </div>

                                  <div className="text-xs text-slate-400">
                                    {product.sku ||
                                      product.product_code ||
                                      product.category ||
                                      "Service"}
                                  </div>
                                </div>

                                <div className="shrink-0 text-right">
                                  <div className="text-sm font-black">
                                    {money(
                                      Number(
                                        product.selling_price ||
                                          0
                                      )
                                    )}
                                  </div>

                                  {product.track_stock && (
                                    <div className="text-[10px] text-slate-400">
                                      {outOfStock
                                        ? "OUT OF STOCK"
                                        : `Stock: ${product.stock_quantity}`}
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          }
                        )}
                    </div>
                  )}

                  {/* ITEM NOT FOUND */}

                  {itemNotFound && (
                    <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                      <div className="mb-2 text-xs text-slate-500">
                        No existing item found for{" "}
                        <strong>
                          "{productSearch}"
                        </strong>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">

                        <button
                          type="button"
                          onClick={
                            openCustomItem
                          }
                          className="rounded-xl bg-black px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
                        >
                          ➕ Add Custom Item
                        </button>

                        <button
                          type="button"
                          onClick={
                            openAddProduct
                          }
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:border-black"
                        >
                          📦 Add to Product List
                        </button>

                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* CART */}

            <section className="overflow-hidden rounded-2xl bg-white shadow-sm">

              <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="text-base font-bold">
                  Sale Items
                </h2>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                  {cart.length}{" "}
                  {cart.length === 1
                    ? "item"
                    : "items"}
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="text-4xl">
                    🛒
                  </div>

                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    Cart is empty
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Search for an item above.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
  <table className="w-full table-fixed border-collapse">
    <colgroup>
      <col className="w-[34%]" />
      <col className="w-[10%]" />
      <col className="w-[16%]" />
      <col className="w-[16%]" />
      <col className="w-[16%]" />
      <col className="w-[8%]" />
    </colgroup>

    <thead className="bg-slate-50">
      <tr className="border-b border-slate-200">
        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
          Item
        </th>

        <th className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
          Qty
        </th>

        <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
          Price
        </th>

        <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
          Discount
        </th>

        <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
          Total
        </th>

        <th className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
          Action
        </th>
      </tr>
    </thead>

    <tbody>
      {cart.map((item) => {
        const price = Number(
          item.product.selling_price || 0
        );

        // -------------------------------------------------
        // FIX (Bug 1): item.discount is a UNIT discount.
        // It must be multiplied by quantity to get the
        // line's total discount — matches totalItemDiscount
        // in the Order Summary and the saveSale() logic.
        // -------------------------------------------------
        const lineGross = item.quantity * price;

        const unitDiscount = Math.min(
          Math.max(Number(item.discount) || 0, 0),
          price
        );

        const lineDiscount = unitDiscount * item.quantity;

        const lineTotal = Math.max(
          lineGross - lineDiscount,
          0
        );

        return (
          <tr
            key={item.product.id}
            className="border-b border-slate-100 last:border-b-0"
          >
            {/* ITEM */}
            <td className="px-4 py-4 align-middle">
              <div className="truncate font-semibold text-slate-900">
                {item.product.name}
              </div>

              <div className="mt-1 truncate text-xs text-slate-400">
                {item.product.sku ||
                  item.product.product_code ||
                  item.product.unit ||
                  "Service"}
              </div>
            </td>

            {/* QTY */}
            <td className="px-2 py-4 text-center align-middle">
              <input
                type="number"
                min="1"
                step="1"
                value={item.quantity}
                onChange={(e) =>
                  updateQuantity(
                    item.product.id,
                    Number(e.target.value)
                  )
                }
                className="mx-auto block w-[60px] rounded-lg border border-slate-300 px-2 py-2 text-center text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </td>

            {/* UNIT PRICE */}
            <td className="whitespace-nowrap px-3 py-4 text-right align-middle">
              <span className="text-sm font-medium text-slate-700">
                {money(price)}
              </span>
            </td>

            {/* UNIT DISCOUNT */}
            <td className="px-3 py-4 text-right align-middle">
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.discount}
                onChange={(e) =>
                  updateItemDiscount(
                    item.product.id,
                    Number(e.target.value)
                  )
                }
                className="ml-auto block w-[90px] rounded-lg border border-slate-300 px-2 py-2 text-right text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </td>

            {/* TOTAL */}
            <td className="whitespace-nowrap px-3 py-4 text-right align-middle">
              <span className="text-sm font-bold text-slate-900">
                {money(lineTotal)}
              </span>
            </td>

            {/* ACTION */}
            <td className="px-2 py-4 text-center align-middle">
              <button
                type="button"
                onClick={() =>
                  removeProduct(
                    item.product.id
                  )
                }
                className="rounded-lg bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
              >
                Remove
              </button>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>
              )}
            </section>

            {/* NOTES */}

            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <label className="mb-2 block text-sm font-bold">
                Sale Notes
              </label>

              <textarea
                value={notes}
                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }
                rows={2}
                placeholder="Optional notes..."
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-black"
              />
            </section>
          </div>

          {/* =================================================
              RIGHT — COMPACT SUMMARY
          ================================================= */}

          <aside className="h-fit xl:sticky xl:top-4">

            <div className="overflow-hidden rounded-2xl bg-white shadow-lg">

              <div className="bg-slate-900 px-5 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Current Sale
                    </p>

                    <h2 className="mt-1 text-xl font-black">
                      Order Summary
                    </h2>
                  </div>

                  <div className="text-2xl">
                    🧾
                  </div>
                </div>
              </div>

              <div className="p-5">

                {/* TOTALS */}

                <div className="space-y-2.5 text-sm">

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Gross subtotal
                    </span>

                    <span className="font-semibold">
                      {money(
                        grossSubtotal
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Item discounts
                    </span>

                    <span className="font-semibold text-red-600">
                      -{" "}
                      {money(
                        totalItemDiscount
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Subtotal
                    </span>

                    <span className="font-bold">
                      {money(subtotal)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                        Invoice Discount
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          invoiceDiscount
                        }
                        onChange={(e) =>
                          setInvoiceDiscount(
                            e.target.value
                          )
                        }
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-sm outline-none focus:border-black"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                        Tax
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tax}
                        onChange={(e) =>
                          setTax(
                            e.target.value
                          )
                        }
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-sm outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  {/* GRAND TOTAL */}

                  <div className="mt-3 rounded-xl bg-slate-100 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-600">
                        TOTAL
                      </span>

                      <span className="text-2xl font-black text-slate-900">
                        {money(total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PAYMENT */}

                <div className="my-4 border-t border-slate-200 pt-4">

                  <div className="mb-3">
                    <h3 className="text-sm font-bold">
                      Payment
                    </h3>

                    <p className="text-[11px] text-slate-400">
                      Amount received from customer
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                        Method
                      </label>

                      <select
                        value={
                          paymentMethod
                        }
                        onChange={(e) =>
                          setPaymentMethod(
                            e.target.value
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-black"
                      >
                        <option value="cash">
                          Cash
                        </option>

                        <option value="card">
                          Card
                        </option>

                        <option value="bank_transfer">
                          Bank Transfer
                        </option>

                        <option value="credit">
                          Credit
                        </option>

                        <option value="other">
                          Other
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                        Amount Paid
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          amountPaid
                        }
                        onChange={(e) =>
                          setAmountPaid(
                            e.target.value
                          )
                        }
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-sm font-bold outline-none focus:border-black"
                      />
                    </div>

                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">

                    <div className="rounded-lg bg-green-50 px-3 py-2">
                      <div className="text-green-600">
                        Paid
                      </div>

                      <div className="mt-0.5 font-bold text-green-700">
                        {money(paid)}
                      </div>
                    </div>

                    <div
                      className={`rounded-lg px-3 py-2 ${
                        balance > 0
                          ? "bg-orange-50"
                          : "bg-slate-50"
                      }`}
                    >
                      <div
                        className={
                          balance > 0
                            ? "text-orange-600"
                            : "text-slate-500"
                        }
                      >
                        Balance
                      </div>

                      <div
                        className={
                          balance > 0
                            ? "mt-0.5 font-bold text-orange-700"
                            : "mt-0.5 font-bold text-slate-700"
                        }
                      >
                        {money(balance)}
                      </div>
                    </div>

                  </div>

                  {change > 0 && (
                    <div className="mt-2 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-xs">
                      <span className="font-semibold text-blue-700">
                        Change
                      </span>

                      <strong className="text-blue-700">
                        {money(change)}
                      </strong>
                    </div>
                  )}

                  <div
                    className={`mt-3 rounded-lg px-3 py-2 text-center text-xs font-black ${
                      getPaymentStatus() ===
                      "paid"
                        ? "bg-green-100 text-green-700"
                        : getPaymentStatus() ===
                          "partial"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    ✓{" "}
                    {getPaymentStatus() ===
                    "paid"
                      ? "PAYMENT COMPLETE"
                      : getPaymentStatus() ===
                        "partial"
                      ? "PARTIAL PAYMENT"
                      : "PAYMENT PENDING"}
                  </div>
                </div>

                {/* SAVE */}

                <button
                  type="button"
                  onClick={saveSale}
                  disabled={
                    saving ||
                    cart.length === 0
                  }
                  className="w-full rounded-xl bg-black px-5 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving
                    ? "Saving Sale..."
                    : "🧾 Create Invoice"}
                </button>

              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* =================================================
          CUSTOM ITEM MODAL
      ================================================= */}

      {showCustomItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">

            <div className="mb-4">
              <h2 className="text-xl font-black">
                Add Custom Item
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                This item will be added to this sale only.
              </p>
            </div>

            <div className="space-y-3">

              <input
                value={manualItemName}
                onChange={(e) =>
                  setManualItemName(
                    e.target.value
                  )
                }
                placeholder="Item name"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
              />

              <div className="grid grid-cols-2 gap-3">

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualItemPrice}
                  onChange={(e) =>
                    setManualItemPrice(
                      e.target.value
                    )
                  }
                  placeholder="Unit price"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
                />

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={manualItemQuantity}
                  onChange={(e) =>
                    setManualItemQuantity(
                      e.target.value
                    )
                  }
                  placeholder="Quantity"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
                />

              </div>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  manualItemDiscount
                }
                onChange={(e) =>
                  setManualItemDiscount(
                    e.target.value
                  )
                }
                placeholder="Unit discount"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-black"
              />

            </div>

            <div className="mt-5 flex gap-2">

              <button
                type="button"
                onClick={() =>
                  setShowCustomItem(false)
                }
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  addManualItem
                }
                className="flex-1 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white"
              >
                Add Item
              </button>

            </div>
          </div>
        </div>
      )}

      {/* =================================================
          ADD PRODUCT MODAL
      ================================================= */}

      {showAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">

            <div className="mb-4">
              <h2 className="text-xl font-black">
                Add to Product List
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Create this item as a permanent product.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">

              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold">
                  Product Name
                </label>

                <input
                  value={newProductName}
                  onChange={(e) =>
                    setNewProductName(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">
                  Product Code / SKU
                </label>

                <input
                  value={newProductCode}
                  onChange={(e) =>
                    setNewProductCode(
                      e.target.value
                    )
                  }
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">
                  Unit
                </label>

                <input
                  value={newProductUnit}
                  onChange={(e) =>
                    setNewProductUnit(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">
                  Cost Price
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newProductCost}
                  onChange={(e) =>
                    setNewProductCost(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">
                  Selling Price
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newProductPrice}
                  onChange={(e) =>
                    setNewProductPrice(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold">
                  Opening Stock
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newProductStock}
                  onChange={(e) =>
                    setNewProductStock(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

            </div>

            <div className="mt-5 flex gap-2">

              <button
                type="button"
                onClick={() =>
                  setShowAddProduct(false)
                }
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  addingProduct
                }
                onClick={
                  addProductToList
                }
                className="flex-1 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {addingProduct
                  ? "Adding..."
                  : "Add Product"}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* =================================================
          SUCCESS MODAL
      ================================================= */}

      {showSuccess &&
        savedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">

              <div className="text-5xl">
                ✅
              </div>

              <h2 className="mt-3 text-2xl font-black">
                Sale Saved
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Invoice{" "}
                <strong>
                  {
                    savedSale.invoiceNumber
                  }
                </strong>{" "}
                created successfully.
              </p>

              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">

                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Total
                  </span>

                  <strong>
                    {money(
                      savedSale.total
                    )}
                  </strong>
                </div>

                <div className="mt-2 flex justify-between">
                  <span className="text-slate-500">
                    Paid
                  </span>

                  <strong className="text-green-600">
                    {money(
                      savedSale.paid
                    )}
                  </strong>
                </div>

                <div className="mt-2 flex justify-between">
                  <span className="text-slate-500">
                    Balance
                  </span>

                  <strong className="text-orange-600">
                    {money(
                      savedSale.balance
                    )}
                  </strong>
                </div>

                {savedSale.change >
                  0 && (
                  <div className="mt-2 flex justify-between">
                    <span className="text-slate-500">
                      Change
                    </span>

                    <strong className="text-blue-600">
                      {money(
                        savedSale.change
                      )}
                    </strong>
                  </div>
                )}

              </div>

              <div className="mt-5 grid gap-2">

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/sales/${savedSale.saleId}`
                    )
                  }
                  className="rounded-xl bg-black px-5 py-3 font-bold text-white"
                >
                  🧾 Open Invoice
                </button>

                {savedSale.customer && (
                  <button
                    type="button"
                    onClick={() =>
                      sendWhatsAppInvoice(
                        savedSale
                      )
                    }
                    className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white"
                  >
                    💬 Send via WhatsApp
                  </button>
                )}

                <button
                  type="button"
                  onClick={
                    startNewSale
                  }
                  className="rounded-xl border border-slate-300 px-5 py-3 font-bold"
                >
                  New Sale
                </button>

              </div>
            </div>
          </div>
        )}
    </main>
  );
}
