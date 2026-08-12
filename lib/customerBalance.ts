import { supabase } from "@/lib/supabase";

export type CustomerBalance = {
  totalSales: number;
  totalPayments: number;
  balance: number;
  debt: number;
  credit: number;
};

export async function getCustomerBalance(
  customerId: string
): Promise<CustomerBalance> {
  if (!customerId) {
    return {
      totalSales: 0,
      totalPayments: 0,
      balance: 0,
      debt: 0,
      credit: 0,
    };
  }

  const { data, error } = await supabase
    .from("customer_balances")
    .select(
      "customer_id, total_sales, total_paid, outstanding_balance"
    )
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load customer balance: ${error.message}`
    );
  }

  if (!data) {
    return {
      totalSales: 0,
      totalPayments: 0,
      balance: 0,
      debt: 0,
      credit: 0,
    };
  }

  const totalSales = Number(data.total_sales || 0);
  const totalPayments = Number(data.total_paid || 0);
  const balance = Number(data.outstanding_balance || 0);
  const debt = Number(data.outstanding_balance || 0);
  const credit = Math.max(totalPayments - totalSales, 0);

  return {
    totalSales,
    totalPayments,
    balance,
    debt,
    credit,
  };
}
