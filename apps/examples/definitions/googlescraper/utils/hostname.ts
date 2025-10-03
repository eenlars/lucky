// returns only the domain and tld (last two parts)
export const normalizeHostname = (url: string) => {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    const parts = hostname.split(".")
    return parts.length >= 2 ? parts.slice(-2).join(".") : hostname
  } catch (_error) {
    const cleanedUrl = url
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split("?")[0]
      .split("#")[0]

    const parts = cleanedUrl.split(".")
    return parts.length >= 2 ? parts.slice(-2).join(".") : cleanedUrl
  }
}
