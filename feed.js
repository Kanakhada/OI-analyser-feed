import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function rand(min, max) {
  return Math.random() * (max - min) + min
}

function safeMax(arr, key) {
  if (!arr.length) return null
  return arr.reduce((a, b) => (Number(a[key]) > Number(b[key]) ? a : b))
}

async function updateFeed() {
  const { data: rows, error } = await supabase
    .from("option_chain_live")
    .select("*")
    .eq("symbol", "NIFTY")
    .eq("expiry", "2026-03-26")
    .order("strike", { ascending: true })

  if (error) {
    console.log("fetch error", error)
    return
  }

  const newSpot = 22120 + rand(-10, 10)

  for (const r of rows) {
    const oiChange = Math.floor(rand(-2000, 3000))
    const newOi = Math.max(1000, Number(r.oi) + oiChange)
    const newLtp = Math.max(1, Number(r.ltp) + rand(-5, 5))
    const newVolume = Number(r.volume) + Math.floor(rand(100, 500))

    const { error: updateError } = await supabase
      .from("option_chain_live")
      .update({
        spot_price: newSpot,
        oi: newOi,
        oi_change: oiChange,
        ltp: newLtp,
        volume: newVolume,
        updated_at: new Date().toISOString()
      })
      .eq("id", r.id)

    if (updateError) {
      console.log("row update error", updateError)
    }
  }

  const { data: updatedRows, error: updatedRowsError } = await supabase
    .from("option_chain_live")
    .select("*")
    .eq("symbol", "NIFTY")
    .eq("expiry", "2026-03-26")
    .order("strike", { ascending: true })

  if (updatedRowsError) {
    console.log("refetch error", updatedRowsError)
    return
  }

  const ceRows = updatedRows.filter((r) => r.option_type === "CE")
  const peRows = updatedRows.filter((r) => r.option_type === "PE")

  const maxCallOI = safeMax(ceRows, "oi")
  const maxPutOI = safeMax(peRows, "oi")
  const maxCallOIChange = safeMax(ceRows, "oi_change")
  const maxPutOIChange = safeMax(peRows, "oi_change")

  const supportStrike = maxPutOI ? maxPutOI.strike : null
  const resistanceStrike = maxCallOI ? maxCallOI.strike : null

  const insightText = `Support at ${supportStrike}, resistance at ${resistanceStrike}. Strongest call OI at ${maxCallOI?.strike}, strongest put OI at ${maxPutOI?.strike}.`

  const { error: summaryError } = await supabase
    .from("oi_summary_live")
    .update({
      spot_price: newSpot,
      support_strike: supportStrike,
      resistance_strike: resistanceStrike,
      max_call_oi_strike: maxCallOI ? maxCallOI.strike : null,
      max_put_oi_strike: maxPutOI ? maxPutOI.strike : null,
      max_call_oi_change_strike: maxCallOIChange ? maxCallOIChange.strike : null,
      max_put_oi_change_strike: maxPutOIChange ? maxPutOIChange.strike : null,
      insight_text: insightText,
      updated_at: new Date().toISOString()
    })
    .eq("symbol", "NIFTY")
    .eq("expiry", "2026-03-26")

  if (summaryError) {
    console.log("summary update error", summaryError)
    return
  }

  console.log("market tick", newSpot)
  console.log("summary updated", insightText)
}

updateFeed()
setInterval(updateFeed, 2000)
