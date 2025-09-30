// run with: npx tsx src/examples/code_tools/googlescraper/run-locally.ts
import { lgg } from "@core/utils/logging/Logger"
import { type InputMultiple, type InputUrl, searchGoogleMaps } from "@examples/code_tools/googlescraper/main/main"
import type { GoogleMapsBusiness } from "@examples/code_tools/googlescraper/main/types/GoogleMapsBusiness"
import { JSONN } from "@lucky/shared"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

const TYPE_OF_SEARCH = "multiple" as "multiple" | "locationMapLinks"
const onlyIncludeWithWebsite = "debontekoe.nl"

const locationLinks = [
  "https://www.google.com/maps/place/De+Bonte+Koe+Chocolade/data=!4m7!3m6!1s0x47c4356b36b061d9:0xb86de961eddd8145!8m2!3d51.9147728!4d4.3983162!16s%2Fg%2F1trqgcwz!19sChIJ2WGwNms1xEcRRYHd7WHpbbg?authuser=0&hl=nl&rclk=1",
  "https://www.google.com/maps/place/De+Bonte+Koe+Chocolade/data=!4m7!3m6!1s0x47c5b7e5063d993f:0x376fc805d2cb0ee5!8m2!3d52.0801575!4d4.3180612!16s%2Fg%2F11f62mhz71!19sChIJP5k9BuW3xUcR5Q7L0gXIbzc?authuser=0&hl=nl&rclk=1",
  "https://www.google.com/maps/place/De+Bonte+Koe+Chocolade/data=!4m7!3m6!1s0x47c433157a4d89bd:0x259e25153fb4ddc2!8m2!3d51.923838!4d4.5114474!16s%2Fg%2F11tdnpk29q!19sChIJvYlNehUzxEcRwt20PxUlniU?authuser=0&hl=nl&rclk=1",
  "https://www.google.com/maps/place/De+Bonte+Koe+Chocolade/data=!4m7!3m6!1s0x47c4351a5376f255:0x1696f7f2235d8866!8m2!3d51.915549!4d4.4670237!16s%2Fg%2F11m847s0ck!19sChIJVfJ2Uxo1xEcRZohdI_L3lhY?authuser=0&hl=nl&rclk=1",
  "https://www.google.com/maps/place/De+Bonte+Koe+Chocolade/data=!4m7!3m6!1s0x47c5b7242ccf4f71:0x3894960dfe7c787d!8m2!3d52.0820821!4d4.2989459!16s%2Fg%2F11tj9vw65s!19sChIJcU_PLCS3xUcRfXh8_g2WlDg?authuser=0&hl=nl&rclk=1",
  "https://www.google.com/maps/place/De+Bonte+Koe+Chocolade+-+Chocolab/data=!4m7!3m6!1s0x47c4356d571ae661:0x549a2cc2a783d091!8m2!3d51.9152511!4d4.3986301!16s%2Fg%2F11m5kjhy71!19sChIJYeYaV201xEcRkdCDp8IsmlQ?authuser=0&hl=nl&rclk=1",
] as const

const multiple = "De bonte koe chocolade"

const outputDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "output")
fs.mkdirSync(outputDir, { recursive: true })

function saveResults(name: string, businesses: GoogleMapsBusiness[], html?: string) {
  const dir = path.join(outputDir, name.toLowerCase().replace(/\s+/g, ""))
  fs.mkdirSync(dir, { recursive: true })

  fs.writeFileSync(path.join(dir, "business.json"), JSON.stringify(businesses, null, 2))
  if (html) fs.writeFileSync(path.join(dir, "raw.html"), html)

  lgg.log(`Saved ${businesses.length} businesses to ${path.join(dir, "business.json")}`)
}

async function runSearch(input: InputUrl | InputMultiple, options = {}) {
  const { output, success, error } = await searchGoogleMaps(input, options)
  if (!success) throw new Error(JSONN.show(error))
  return output
}

async function main() {
  lgg.log(
    "Starting search... for",
    TYPE_OF_SEARCH,
    "with",
    onlyIncludeWithWebsite ? `onlyIncludeWithWebsite: ${onlyIncludeWithWebsite}` : "",
  )
  try {
    if (TYPE_OF_SEARCH === "locationMapLinks") {
      const allBusinesses: GoogleMapsBusiness[] = []

      for (const [i, link] of locationLinks.entries()) {
        const { businesses } = await runSearch(
          {
            mode: "url",
            url: link,
          },
          { onlyIncludeWithWebsite },
        )

        allBusinesses.push(...businesses)
        lgg.log(`Processed link #${i + 1}, found ${businesses.length} businesses`)
      }

      fs.writeFileSync(path.join(outputDir, "all_location_businesses.json"), JSON.stringify(allBusinesses, null, 2))
      lgg.log(`Saved ${allBusinesses.length} total businesses`)
    } else if (TYPE_OF_SEARCH === "multiple") {
      const { businesses, html } = await runSearch({
        mode: "multiple",
        query: multiple,
        resultCount: 50,
        includeDetails: true,
      })
      saveResults(multiple, businesses, html)
    }
  } catch (error) {
    lgg.error(error)
    process.exit(1)
  }
}

main()
