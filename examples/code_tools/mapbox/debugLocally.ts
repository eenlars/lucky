// use : tsx --env-file=.env src/runtime/code_tools/mapbox/debugLocally.ts

import { lgg } from "@core/utils/logging/Logger"
import { geocodeLocation } from "./mapboxUse"

const result = await geocodeLocation({
  query: "kfc",
  limit: 1,
  country: "NL",
  types: "address",
  place: "amsterdam",
})

lgg.log(result)
