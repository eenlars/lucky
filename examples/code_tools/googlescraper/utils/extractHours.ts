import { lgg } from "@core/utils/logging/Logger"
import * as cheerio from "cheerio"

// normalize unicode dash variations to regular hyphen
function normalizeDashesAndSpaces(text: string): string {
  return text
    .replace(/[\u2010-\u2015\u2212]/g, "-") // en-dash, em-dash, minus sign, etc.
    .replace(/–/g, "-") // en-dash
    .replace(/—/g, "-") // em-dash
    .replace(/−/g, "-") // minus sign
    .replace(/\s+/g, " ") // replace multiple spaces with single space
    .replace(/ /g, " ") // replace multiple spaces with single space
    .replace(/ /g, " ") // replace multiple spaces with single space (different from above)
}

export function parseHours(hoursTableHtml: string | null) {
  if (!hoursTableHtml) {
    lgg.info("no hours table html")
    return null
  }

  // wrap tbody fragments in table for proper parsing
  let htmlToParse = hoursTableHtml
  if (hoursTableHtml.trim().startsWith("<tbody")) {
    htmlToParse = `<table>${hoursTableHtml}</table>`
  }

  const $ = cheerio.load(htmlToParse)

  const rows = $("tr").toArray()

  const hours = {
    monday: undefined as string | undefined,
    tuesday: undefined as string | undefined,
    wednesday: undefined as string | undefined,
    thursday: undefined as string | undefined,
    friday: undefined as string | undefined,
    saturday: undefined as string | undefined,
    sunday: undefined as string | undefined,
  }

  // multilingual day name mapping
  const dayMap: Record<string, keyof typeof hours> = {
    // english
    monday: "monday",
    tuesday: "tuesday",
    wednesday: "wednesday",
    thursday: "thursday",
    friday: "friday",
    saturday: "saturday",
    sunday: "sunday",
    // german
    montag: "monday",
    dienstag: "tuesday",
    mittwoch: "wednesday",
    donnerstag: "thursday",
    freitag: "friday",
    samstag: "saturday",
    sonntag: "sunday",
    // french
    lundi: "monday",
    mardi: "tuesday",
    mercredi: "wednesday",
    jeudi: "thursday",
    vendredi: "friday",
    samedi: "saturday",
    dimanche: "sunday",
    // spanish
    lunes: "monday",
    martes: "tuesday",
    miércoles: "wednesday",
    miercoles: "wednesday",
    jueves: "thursday",
    viernes: "friday",
    sábado: "saturday",
    sabado: "saturday",
    domingo: "sunday",
    // italian
    lunedì: "monday",
    lunedi: "monday",
    martedì: "tuesday",
    martedi: "tuesday",
    mercoledì: "wednesday",
    mercoledi: "wednesday",
    giovedì: "thursday",
    giovedi: "thursday",
    venerdì: "friday",
    venerdi: "friday",
    sabato: "saturday",
    domenica: "sunday",
    // portuguese
    segunda: "monday",
    "segunda-feira": "monday",
    terça: "tuesday",
    "terça-feira": "tuesday",
    quarta: "wednesday",
    "quarta-feira": "wednesday",
    quinta: "thursday",
    "quinta-feira": "thursday",
    sexta: "friday",
    "sexta-feira": "friday",
    // dutch
    maandag: "monday",
    dinsdag: "tuesday",
    woensdag: "wednesday",
    donderdag: "thursday",
    vrijdag: "friday",
    zaterdag: "saturday",
    zondag: "sunday",
  }

  // collect all row data first
  const rowData = rows
    .map(row => {
      const dayCell = $(row).find("td").first()
      const hoursCell = $(row).find("td").eq(1)

      const dayText = dayCell.find("div").first().text().toLowerCase().trim()
      const hoursText = normalizeDashesAndSpaces(hoursCell.find("li.G8aQO").text().trim())

      return { dayText, hoursText, row }
    })
    .filter(data => data.hoursText) // only keep rows with actual hours

  // try to match by day name first
  rowData.forEach(({ dayText, hoursText }) => {
    // handle partial matches - look for day names within the text
    let dayKey: keyof typeof hours | undefined

    // first try exact match
    dayKey = dayMap[dayText]

    // if no exact match, try partial matching
    if (!dayKey) {
      for (const [name, key] of Object.entries(dayMap)) {
        if (dayText.includes(name)) {
          dayKey = key
          break
        }
      }
    }

    if (dayKey && hoursText) {
      hours[dayKey] = hoursText
    }
  })

  // if we didn't get all days, try positional mapping as fallback
  const assignedDays = Object.values(hours).filter(h => h !== undefined).length
  if (assignedDays < rowData.length && rowData.length === 7) {
    // check if the first row might be sunday (common google maps pattern)
    if (rowData.length >= 7) {
      // try sunday-first pattern (sun, mon, tue, wed, thu, fri, sat)
      const sundayFirstOrder: (keyof typeof hours)[] = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ]

      // only apply positional if we haven't matched anything yet
      if (assignedDays === 0) {
        rowData.forEach(({ hoursText }, index) => {
          if (index < sundayFirstOrder.length && hoursText) {
            hours[sundayFirstOrder[index]] = hoursText
          }
        })
      }
    }
  }

  // check if parsing was successful
  const finalAssignedDays = Object.values(hours).filter(h => h !== undefined).length

  if (finalAssignedDays === 0 && rowData.length > 0) {
    // parsing failed but we have data in the table
    throw new Error(`failed to parse hours table:
${hoursTableHtml}`)
  }

  return hours
}
