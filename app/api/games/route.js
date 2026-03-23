export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(request) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search") || "";
  const region = searchParams.get("region") || "US";
  const platform = searchParams.get("platform") || "";
  const genre = searchParams.get("genre") || "";
  const minDiscount = parseInt(searchParams.get("minDiscount") || "0");
  const maxPrice = parseFloat(searchParams.get("maxPrice") || "999");
  const sortBy = searchParams.get("sort") || "discount";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "30");
  const offset = (page - 1) * limit;

  try {
    let query = supabase
      .from("games")
      .select(`
        *,
        prices!inner (
          original_price, sale_price, discount_percent,
          currency, is_on_sale, sale_end_date, ps_plus_price
        )
      `)
      .eq("prices.region", region)
      .gte("prices.discount_percent", minDiscount)
      .lte("prices.sale_price", maxPrice);

    if (search) {
      query = query.ilike("title", `%${search}%`);
    }
    if (platform) {
      query = query.contains("platforms", [platform]);
    }
    if (genre) {
      query = query.eq("genre", genre);
    }

    // Sorting
    if (sortBy === "discount") {
      query = query.order("discount_percent", { ascending: false, foreignTable: "prices" });
    } else if (sortBy === "price") {
      query = query.order("sale_price", { ascending: true, foreignTable: "prices" });
    } else if (sortBy === "rating") {
      query = query.order("user_rating", { ascending: false });
    } else if (sortBy === "metacritic") {
      query = query.order("metacritic_score", { ascending: false });
    } else if (sortBy === "newest") {
      query = query.order("release_date", { ascending: false });
    } else if (sortBy === "ending") {
      query = query.order("sale_end_date", { ascending: true, foreignTable: "prices" });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Flatten price data into game objects
    const games = (data || []).map((g) => ({
      ...g,
      originalPrice: g.prices?.[0]?.original_price,
      salePrice: g.prices?.[0]?.sale_price,
      discount: g.prices?.[0]?.discount_percent,
      currency: g.prices?.[0]?.currency,
      isOnSale: g.prices?.[0]?.is_on_sale,
      saleEndDate: g.prices?.[0]?.sale_end_date,
      psPlusPrice: g.prices?.[0]?.ps_plus_price,
      prices: undefined,
    }));

    return NextResponse.json({ games, page, limit, total: count });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
