import axios from "axios"

/**
 * Proxy response type
 */
type ProxyResponse = {
  ip: string
  port: number
  username: string
  password: string
}

/**
 * Fetches and parses a list of proxy servers from Webshare API
 *
 * @description Makes a GET request to Webshare's proxy list endpoint and converts
 * the raw proxy strings into structured proxy objects. Each proxy string is expected
 * to be in the format: ip:port:username:password
 *
 * @throws If the API request fails or returns invalid data
 * @returns Array of parsed proxy objects with validated credentials
 */
const fetchWebshareProxyList = async (): Promise<ProxyResponse[]> => {
  if (!process.env.WEBSHARE_API_KEY) {
    throw new Error("WEBSHARE_API_KEY is not set")
  }
  const url = `https://proxy.webshare.io/api/v2/proxy/list/download/${process.env.WEBSHARE_API_KEY}/-/any/username/direct/-/`
  const response = await axios.get(url)
  const proxyList = response.data.split("\n").filter(Boolean)
  return proxyList.map(parseProxyString)
}

/**
 * Parses and validates a proxy server string into a structured object
 *
 * @description Takes a colon-separated proxy string and validates each component:
 * - IP address must be in valid IPv4 format
 * - Port must be a number between 1-65535
 * - Username and password must be non-empty
 *
 * @param proxyString - Raw proxy string in format "ip:port:username:password"
 * @throws If the proxy string format is invalid or any component fails validation
 * @returns Validated proxy object with typed properties
 */
const parseProxyString = (proxyString: string): ProxyResponse => {
  const parts = proxyString.split(":")
  if (parts.length !== 4) {
    throw new Error(`Invalid proxy format: ${proxyString}`)
  }
  const [ip, port, username, password] = parts

  // Validate IP format
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
  if (!ipRegex.test(ip)) {
    throw new Error(`Invalid IP address format: ${ip}`)
  }

  // Validate port is a number and in valid range
  const portNum = Number.parseInt(port)
  if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
    throw new Error(`Invalid port number: ${port}`)
  }

  // Validate username and password exist
  if (!username || !password) {
    throw new Error("Missing username or password")
  }

  return {
    ip,
    port: portNum,
    username,
    password,
  }
}

const getRandomWebshareProxy = async (): Promise<string> => {
  const proxyList = await fetchWebshareProxyList()
  if (!proxyList || proxyList.length === 0) {
    throw new Error("No proxies available from Webshare API")
  }
  const proxy = proxyList[Math.floor(Math.random() * proxyList.length)]
  return proxyToString(proxy)
}

const getAllWebshareProxies = async (): Promise<string[]> => {
  const proxies = await fetchWebshareProxyList()
  return proxies.map(proxyToString)
}

const proxyToString = (proxy: ProxyResponse) => {
  return `http://${proxy.username}:${proxy.password}@${proxy.ip}:${proxy.port}`
}

export { getAllWebshareProxies, getRandomWebshareProxy, parseProxyString }
