import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function rand(min,max){
  return Math.random()*(max-min)+min
}

async function updateFeed(){

  const {data:rows,error} = await supabase
    .from("option_chain_live")
    .select("*")

  if(error){
    console.log(error)
    return
  }

  let newSpot = 22120 + rand(-10,10)

  for(const r of rows){

    let oiChange = Math.floor(rand(-2000,3000))

    await supabase
      .from("option_chain_live")
      .update({
        spot_price:newSpot,
        oi:r.oi + oiChange,
        oi_change:oiChange,
        ltp:r.ltp + rand(-5,5),
        volume:r.volume + Math.floor(rand(100,500)),
        updated_at:new Date()
      })
      .eq("id",r.id)

  }

  console.log("market tick",newSpot)

}

setInterval(updateFeed,2000)
