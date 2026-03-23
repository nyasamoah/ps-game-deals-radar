import { createServerSupabaseClient } from "./supabase";

const REGIONS = {
  US: { url: "https://store.playstation.com/en-us", currency: "USD", lang: "en-US" },
  GB: { url: "https://store.playstation.com/en-gb", currency: "GBP", lang: "en-GB" },
  EU: { url: "https://store.playstation.com/en-de", currency: "EUR", lang: "en-DE" },
  JP: { url: "https://store.playstation.com/ja-jp", currency: "JPY", lang: "ja-JP" },
  AU: { url: "https://store.playstation.com/en-au", currency: "AUD", lang: "en-AU" },
  CA: { url: "https://store.playstation.com/en-ca", currency: "CAD", lang: "en-CA" },
  BR: { url: "https://store.playstation.com/pt-br", currency: "BRL", lang: "pt-BR" },
};

// PlayStation Store uses an internal GraphQL-like API
// This is the same approach PS Deals and PSprices use
const PS_API_BASE = "https://store.playstation.com/store/api/chihiro/00_09_000";

async function fetchPSStoreDeals(region = "US", offset = 0, limit = 30) {
  const regionConfig = REGIONS[region];
  if (!regionConfig) return [];

  // PlayStation Store deals endpoint
  const url = `${PS_API_BASE}/container/${regionConfig.lang}/999/${regionConfig.lang.split("-")[1]}/deal-of-the-week?size=${limit}&start=${offset}&platform=ps5,ps4`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Accept-Language": regionConfig.lang,
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      // Fallback: try the sale category API
      return await fetchPSStoreSaleCategory(region, offset, limit);
    }

    const data = await response.json();
    return parsePSStoreResponse(data, region);
  } catch (error) {
    console.error(`Scrape error for ${region}:`, error.message);
    return await fetchPSStoreSaleCategory(region, offset, limit);
  }
}

// Fallback: Use the PlayStation Store web API for sales
async function fetchPSStoreSaleCategory(region = "US", offset = 0, limit = 30) {
  const regionConfig = REGIONS[region];
  const countryCode = regionConfig.lang.split("-")[1];

  // Try the newer store API
  const url = `https://store.playstation.com/store/api/chihiro/00_09_000/container/${regionConfig.lang}/999/${countryCode}/STORE-MSF77008-PSPLUSSPECIALS?size=${limit}&start=${offset}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });

    if (!response.ok) return [];
    const data = await response.json();
    return parsePSStoreResponse(data, region);
  } catch {
    return [];
  }
}

function parsePSStoreResponse(data, region) {
  const games = [];
  const items = data?.included || data?.links || [];

  for (const item of items) {
    try {
      const attrs = item.attributes || item;
      if (!attrs.name) continue;

      const skus = attrs.skus?.[0] || {};
      const prices = skus.prices || attrs.default_sku?.prices || {};
      const salePrice = prices?.availability?.["not-ps-plus"]?.actual_price?.value;
      const originalPrice = prices?.availability?.["not-ps-plus"]?.strikethrough_price?.value || prices?.availability?.["not-ps-plus"]?.actual_price?.value;
      const plusPrice = prices?.availability?.["ps-plus"]?.actual_price?.value;

      const discount = originalPrice && salePrice && originalPrice > salePrice
        ? Math.round((1 - salePrice / originalPrice) * 100)
        : 0;

      games.push({
        ps_store_id: item.id || attrs.id || `${region}-${attrs.name?.replace(/\s/g, "-")}`,
        title: attrs.name || attrs.title,
        image_url: attrs.thumbnail_url_base || attrs.images?.[0]?.url,
        developer: attrs.provider_name || attrs.publisher,
        genre: attrs.genres?.[0]?.name || attrs.top_category,
        platforms: attrs.platforms || ["PS5"],
        release_date: attrs.release_date,
        size: attrs.file_size?.display,
        original_price: originalPrice ? originalPrice / 100 : null,
        sale_price: salePrice ? salePrice / 100 : null,
        discount_percent: discount,
        currency: REGIONS[region].currency,
        ps_plus_price: plusPrice ? plusPrice / 100 : null,
        is_on_sale: discount > 0,
      });
    } catch (err) {
      continue;
    }
  }

  return games;
}

// ── Main Scrape Function ──
export async function scrapeAllRegions(regions = ["US"]) {
  const supabase = createServerSupabaseClient();
  const startTime = Date.now();
  let totalScraped = 0;
  let totalUpdated = 0;
  let errors = 0;

  for (const region of regions) {
    try {
      let offset = 0;
      let allDeals = [];

      // Paginate through results
      while (offset < 300) {
        const deals = await fetchPSStoreDeals(region, offset, 30);
        if (!deals.length) break;
        allDeals = allDeals.concat(deals);
        offset += 30;

        // Rate limit: wait between requests
        await new Promise((r) => setTimeout(r, 1000));
      }

      totalScraped += allDeals.length;

      // Upsert games
      for (const deal of allDeals) {
        const { data: game, error: gameErr } = await supabase
          .from("games")
          .upsert(
            {
              ps_store_id: deal.ps_store_id,
              title: deal.title,
              image_url: deal.image_url,
              developer: deal.developer,
              genre: deal.genre,
              platforms: deal.platforms,
              release_date: deal.release_date,
              size: deal.size,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "ps_store_id" }
          )
          .select("id")
          .single();

        if (gameErr || !game) {
          errors++;
          continue;
        }

        // Upsert current price
        await supabase.from("prices").upsert(
          {
            game_id: game.id,
            region,
            original_price: deal.original_price,
            sale_price: deal.sale_price || deal.original_price,
            discount_percent: deal.discount_percent,
            currency: deal.currency,
            is_on_sale: deal.is_on_sale,
            ps_plus_price: deal.ps_plus_price,
            last_scraped_at: new Date().toISOString(),
          },
          { onConflict: "game_id,region" }
        );

        // Add to price history (daily)
        await supabase.from("price_history").insert({
          game_id: game.id,
          region,
          price: deal.sale_price || deal.original_price,
          original_price: deal.original_price,
          discount_percent: deal.discount_percent,
        });

        totalUpdated++;
      }
    } catch (err) {
      console.error(`Region ${region} scrape failed:`, err);
      errors++;
    }
  }

  // Log the scrape
  await supabase.from("scrape_log").insert({
    region: regions.join(","),
    games_scraped: totalScraped,
    games_updated: totalUpdated,
    errors,
    duration_ms: Date.now() - startTime,
    completed_at: new Date().toISOString(),
  });

  return { scraped: totalScraped, updated: totalUpdated, errors, duration: Date.now() - startTime };
}
