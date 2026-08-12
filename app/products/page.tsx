"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  item_type: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  minimum_stock: number;
  track_stock: boolean;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_code: string | null;
  category: string | null;
  low_stock_level: number | null;
};

type StatusFilter = "all" | "active" | "inactive";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("active");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "",
    item_type: "product",
    unit: "pcs",
    cost_price: "",
    selling_price: "",
    stock_quantity: "",
    minimum_stock: "",
    track_stock: false,
    description: "",
  });

  function generateSku(name: string) {
    const base = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 16) || "PRODUCT";
    return `${base}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  }

  // =========================================================
  // LOAD PRODUCTS
  // =========================================================

  async function loadProducts() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw new Error(error.message);
      }

      setProducts((data || []) as Product[]);
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to load products."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

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
  // DATE
  // =========================================================

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // =========================================================
  // FORM
  // =========================================================

  function updateField(
    field: keyof typeof form,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm({
      name: "",
      sku: "",
      category: "",
      item_type: "product",
      unit: "pcs",
      cost_price: "",
      selling_price: "",
      stock_quantity: "",
      minimum_stock: "",
      track_stock: false,
      description: "",
    });

    setEditing(false);
    setSelectedProduct(null);
  }

  // =========================================================
  // ADD PRODUCT
  // =========================================================

  async function addProduct(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter product/service name.");
      return;
    }

    const sellingPrice =
      Number(form.selling_price) || 0;

    const costPrice =
      Number(form.cost_price) || 0;

    if (sellingPrice < 0 || costPrice < 0) {
      alert("Prices cannot be negative.");
      return;
    }

    try {
      setSaving(true);
      const generatedSku = form.sku.trim() || generateSku(form.name);

      const { error } = await supabase
        .from("products")
        .insert({
          name: form.name.trim(),

          sku:
            generatedSku,

          product_code:
            generatedSku,

          category:
            form.category.trim() || null,

          item_type:
            form.item_type,

          unit:
            form.unit.trim() || "pcs",

          cost_price:
            costPrice,

          selling_price:
            sellingPrice,

          stock_quantity:
            Number(form.stock_quantity) || 0,

          minimum_stock:
            Number(form.minimum_stock) || 0,

          track_stock:
            form.track_stock,

          description:
            form.description.trim() || null,

          is_active: true,
        });

      if (error) {
        throw new Error(error.message);
      }

      alert(
        "Product/service added successfully."
      );

      resetForm();
      setShowForm(false);

      await loadProducts();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to add product."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // EDIT
  // =========================================================

  function openEdit(product: Product) {
    setSelectedProduct(product);

    setForm({
      name: product.name || "",
      sku:
        product.sku ||
        product.product_code ||
        "",
      category:
        product.category || "",
      item_type:
        product.item_type || "product",
      unit:
        product.unit || "pcs",
      cost_price:
        String(product.cost_price ?? ""),
      selling_price:
        String(product.selling_price ?? ""),
      stock_quantity:
        String(product.stock_quantity ?? ""),
      minimum_stock:
        String(product.minimum_stock ?? ""),
      track_stock:
        Boolean(product.track_stock),
      description:
        product.description || "",
    });

    setEditing(true);
    setShowForm(true);
  }

  // =========================================================
  // UPDATE
  // =========================================================

  async function updateProduct(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!selectedProduct) {
      return;
    }

    if (!form.name.trim()) {
      alert("Please enter product/service name.");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("products")
        .update({
          name: form.name.trim(),

          sku:
            form.sku.trim() || null,

          product_code:
            form.sku.trim() || null,

          category:
            form.category.trim() || null,

          item_type:
            form.item_type,

          unit:
            form.unit.trim() || "pcs",

          cost_price:
            Number(form.cost_price) || 0,

          selling_price:
            Number(form.selling_price) || 0,

          stock_quantity:
            Number(form.stock_quantity) || 0,

          minimum_stock:
            Number(form.minimum_stock) || 0,

          track_stock:
            form.track_stock,

          description:
            form.description.trim() || null,

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", selectedProduct.id);

      if (error) {
        throw new Error(error.message);
      }

      alert(
        "Product/service updated successfully."
      );

      resetForm();
      setShowForm(false);

      await loadProducts();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to update product."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // DEACTIVATE
  // =========================================================

  async function deactivateProduct(
    product: Product
  ) {
    const confirmed = window.confirm(
      `Deactivate "${product.name}"?\n\nIt will no longer appear as an active product in the POS.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .update({
          is_active: false,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", product.id);

      if (error) {
        throw new Error(error.message);
      }

      await loadProducts();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to deactivate product."
      );
    }
  }

  // =========================================================
  // ACTIVATE
  // =========================================================

  async function activateProduct(
    product: Product
  ) {
    try {
      const { error } = await supabase
        .from("products")
        .update({
          is_active: true,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", product.id);

      if (error) {
        throw new Error(error.message);
      }

      await loadProducts();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to activate product."
      );
    }
  }

  // =========================================================
  // FILTER
  // =========================================================

  const filteredProducts =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return products.filter(
        (product) => {
          const matchesSearch =
            !query ||
            product.name
              .toLowerCase()
              .includes(query) ||
            (product.sku || "")
              .toLowerCase()
              .includes(query) ||
            (product.product_code || "")
              .toLowerCase()
              .includes(query) ||
            (product.category || "")
              .toLowerCase()
              .includes(query);

          const matchesStatus =
            statusFilter === "all" ||
            (statusFilter ===
              "active" &&
              product.is_active) ||
            (statusFilter ===
              "inactive" &&
              !product.is_active);

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      products,
      search,
      statusFilter,
    ]);

  // =========================================================
  // DASHBOARD
  // =========================================================

  const activeProducts =
    products.filter(
      (product) =>
        product.is_active
    ).length;

  const stockTrackedProducts =
    products.filter(
      (product) =>
        product.is_active &&
        product.track_stock
    ).length;

  const lowStockProducts =
    products.filter(
      (product) =>
        product.is_active &&
        product.track_stock &&
        Number(
          product.stock_quantity
        ) <=
          Number(
            product.minimum_stock
          )
    ).length;

  const totalStockValue =
    products.reduce(
      (sum, product) => {
        if (!product.track_stock) {
          return sum;
        }

        return (
          sum +
          Number(
            product.stock_quantity || 0
          ) *
            Number(
              product.cost_price || 0
            )
        );
      },
      0
    );

  // =========================================================
  // PROFIT
  // =========================================================

  function getProfit(product: Product) {
    return (
      Number(
        product.selling_price || 0
      ) -
      Number(
        product.cost_price || 0
      )
    );
  }

  function getProfitPercentage(
    product: Product
  ) {
    const cost =
      Number(
        product.cost_price || 0
      );

    const selling =
      Number(
        product.selling_price || 0
      );

    if (cost <= 0) {
      return 0;
    }

    return (
      ((selling - cost) / cost) *
      100
    );
  }

  // =========================================================
  // LOW STOCK
  // =========================================================

  function isLowStock(
    product: Product
  ) {
    return (
      product.track_stock &&
      Number(
        product.stock_quantity || 0
      ) <=
        Number(
          product.minimum_stock || 0
        )
    );
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">
              ⏳
            </div>

            <p className="mt-3 text-slate-500">
              Loading products...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              Products & Services
            </h1>

            <p className="mt-1 text-sm text-slate-500 md:text-base">
              Manage products, services, prices and stock
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="w-full rounded-xl bg-black px-5 py-3 font-semibold text-white shadow-sm hover:bg-slate-800 md:w-auto"
          >
            + Add Product / Service
          </button>

        </div>

        {/* DASHBOARD */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Active Products
            </p>

            <p className="mt-2 text-3xl font-bold">
              {activeProducts}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Stock Tracked
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {stockTrackedProducts}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Low Stock
            </p>

            <p className="mt-2 text-3xl font-bold text-red-600">
              {lowStockProducts}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Stock Cost Value
            </p>

            <p className="mt-2 text-xl font-bold text-purple-600">
              {money(totalStockValue)}
            </p>
          </div>

        </div>

        {/* SEARCH */}

        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm md:p-5">

          <div className="flex flex-col gap-3 lg:flex-row">

            <div className="flex-1">

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="🔍 Search by product name, SKU, code or category..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-black"
              />

            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target
                    .value as StatusFilter
                )
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none lg:w-auto"
            >
              <option value="active">
                Active Products
              </option>

              <option value="all">
                All Products
              </option>

              <option value="inactive">
                Inactive Products
              </option>
            </select>

          </div>

          <p className="mt-3 text-sm text-slate-500">
            Showing{" "}
            <strong>
              {filteredProducts.length}
            </strong>{" "}
            products/services
          </p>

        </div>

        {/* ADD / EDIT FORM */}

        {showForm && (
          <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm md:p-6">

            <div className="mb-5 flex items-center justify-between">

              <div>
                <h2 className="text-xl font-bold">
                  {editing
                    ? "Edit Product / Service"
                    : "Add Product / Service"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter the product or service details below.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-2xl text-slate-400 hover:text-black"
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                editing
                  ? updateProduct
                  : addProduct
              }
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >

              {/* NAME */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Product / Service Name *
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    updateField(
                      "name",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-black"
                  required
                />
              </div>

              {/* SKU */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  SKU / Product Code
                </label>

                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) =>
                    updateField(
                      "sku",
                      e.target.value
                    )
                  }
                  placeholder="Example: TSHIRT-001"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* CATEGORY */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Category
                </label>

                <input
                  type="text"
                  value={form.category}
                  onChange={(e) =>
                    updateField(
                      "category",
                      e.target.value
                    )
                  }
                  placeholder="Example: Printing"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* TYPE */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Item Type
                </label>

                <select
                  value={
                    form.item_type
                  }
                  onChange={(e) =>
                    updateField(
                      "item_type",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none"
                >
                  <option value="product">
                    Product
                  </option>

                  <option value="service">
                    Service
                  </option>
                </select>
              </div>

              {/* UNIT */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Unit
                </label>

                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) =>
                    updateField(
                      "unit",
                      e.target.value
                    )
                  }
                  placeholder="pcs"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* COST */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Cost Price (LKR)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.cost_price
                  }
                  onChange={(e) =>
                    updateField(
                      "cost_price",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* SELLING */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Selling Price (LKR)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.selling_price
                  }
                  onChange={(e) =>
                    updateField(
                      "selling_price",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* STOCK */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Current Stock
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.stock_quantity
                  }
                  onChange={(e) =>
                    updateField(
                      "stock_quantity",
                      e.target.value
                    )
                  }
                  disabled={
                    !form.track_stock
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              {/* MINIMUM STOCK */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Minimum Stock
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.minimum_stock
                  }
                  onChange={(e) =>
                    updateField(
                      "minimum_stock",
                      e.target.value
                    )
                  }
                  disabled={
                    !form.track_stock
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              {/* TRACK STOCK */}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">

                <label className="flex cursor-pointer items-start gap-3">

                  <input
                    type="checkbox"
                    checked={
                      form.track_stock
                    }
                    onChange={(e) =>
                      updateField(
                        "track_stock",
                        e.target.checked
                      )
                    }
                    className="mt-1 h-5 w-5"
                  />

                  <div>
                    <p className="font-semibold">
                      Track Stock
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Enable this for physical products that have inventory.
                      Disable it for services such as photocopying or printing.
                    </p>
                  </div>

                </label>

              </div>

              {/* DESCRIPTION */}

              <div className="md:col-span-2">

                <label className="mb-1 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  value={
                    form.description
                  }
                  onChange={(e) =>
                    updateField(
                      "description",
                      e.target.value
                    )
                  }
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-black"
                />

              </div>

              {/* BUTTONS */}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row md:col-span-2">

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-black px-6 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editing
                    ? "Update Product"
                    : "Save Product"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="rounded-xl border border-slate-300 px-6 py-3 font-semibold"
                >
                  Cancel
                </button>

              </div>

            </form>

          </div>
        )}

        {/* PRODUCT TABLE */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-slate-200 p-5">

            <h2 className="text-lg font-bold">
              Product & Service List
            </h2>

          </div>

          {filteredProducts.length ===
          0 ? (
            <div className="p-10 text-center">

              <div className="mb-3 text-4xl">
                📦
              </div>

              <h3 className="text-lg font-semibold">
                No products found
              </h3>

              <p className="mt-1 text-slate-500">
                Try another search or add a new product.
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1250px]">

                <thead className="bg-slate-50">

                  <tr>

                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Product / Service
                    </th>

                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Category
                    </th>

                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Type
                    </th>

                    <th className="px-4 py-3 text-right text-sm font-semibold">
                      Cost
                    </th>

                    <th className="px-4 py-3 text-right text-sm font-semibold">
                      Selling
                    </th>

                    <th className="px-4 py-3 text-right text-sm font-semibold">
                      Profit
                    </th>

                    <th className="px-4 py-3 text-center text-sm font-semibold">
                      Stock
                    </th>

                    <th className="px-4 py-3 text-center text-sm font-semibold">
                      Status
                    </th>

                    <th className="px-4 py-3 text-center text-sm font-semibold">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredProducts.map(
                    (product) => {
                      const profit =
                        getProfit(
                          product
                        );

                      const profitPercentage =
                        getProfitPercentage(
                          product
                        );

                      const lowStock =
                        isLowStock(
                          product
                        );

                      return (
                        <tr
                          key={
                            product.id
                          }
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >

                          {/* PRODUCT */}

                          <td className="px-4 py-4">

                            <div className="font-semibold text-slate-900">
                              {
                                product.name
                              }
                            </div>

                            {(product.sku ||
                              product.product_code) && (
                              <div className="mt-1 text-xs text-slate-400">
                                SKU:{" "}
                                {
                                  product.sku ||
                                  product.product_code
                                }
                              </div>
                            )}

                          </td>

                          {/* CATEGORY */}

                          <td className="px-4 py-4 text-sm">

                            {product.category ||
                            product.category_id ? (
                              product.category ||
                              product.category_id
                            ) : (
                              <span className="text-slate-400">
                                —
                              </span>
                            )}

                          </td>

                          {/* TYPE */}

                          <td className="px-4 py-4">

                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              {
                                product.item_type
                              }
                            </span>

                          </td>

                          {/* COST */}

                          <td className="px-4 py-4 text-right">

                            {money(
                              Number(
                                product.cost_price ||
                                  0
                              )
                            )}

                          </td>

                          {/* SELLING */}

                          <td className="px-4 py-4 text-right font-semibold">

                            {money(
                              Number(
                                product.selling_price ||
                                  0
                              )
                            )}

                          </td>

                          {/* PROFIT */}

                          <td className="px-4 py-4 text-right">

                            <div
                              className={
                                profit >= 0
                                  ? "font-semibold text-green-600"
                                  : "font-semibold text-red-600"
                              }
                            >
                              {money(
                                profit
                              )}
                            </div>

                            <div className="text-xs text-slate-400">
                              {profitPercentage.toFixed(
                                1
                              )}
                              %
                            </div>

                          </td>

                          {/* STOCK */}

                          <td className="px-4 py-4 text-center">

                            {product.track_stock ? (
                              <div>

                                <span
                                  className={
                                    lowStock
                                      ? "font-bold text-red-600"
                                      : "font-semibold text-slate-900"
                                  }
                                >
                                  {
                                    product.stock_quantity
                                  }{" "}
                                  {
                                    product.unit
                                  }
                                </span>

                                {lowStock && (
                                  <div className="mt-1 text-xs font-semibold text-red-500">
                                    ⚠️ Low stock
                                  </div>
                                )}

                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">
                                Not tracked
                              </span>
                            )}

                          </td>

                          {/* STATUS */}

                          <td className="px-4 py-4 text-center">

                            {product.is_active ? (
                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                                Active
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                                Inactive
                              </span>
                            )}

                          </td>

                          {/* ACTIONS */}

                          <td className="px-4 py-4">

                            <div className="flex min-w-max justify-center gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  openEdit(
                                    product
                                  )
                                }
                                className="rounded-lg bg-yellow-50 px-3 py-2 text-xs font-semibold text-yellow-700 hover:bg-yellow-100"
                              >
                                ✏️ Edit
                              </button>

                              {product.is_active ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    deactivateProduct(
                                      product
                                    )
                                  }
                                  className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                                >
                                  🗑 Deactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    activateProduct(
                                      product
                                    )
                                  }
                                  className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100"
                                >
                                  ♻️ Activate
                                </button>
                              )}

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* FOOTER */}

        <div className="mt-6 text-center text-xs text-slate-400">
          Products & Services Management • Print & Craft POS
        </div>

      </div>
    </main>
  );
}
