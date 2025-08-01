"use server"

import { ColorMode } from "@xyflow/react"
import { cookies } from "next/headers"

export async function setColorModeCookie(colorMode: ColorMode) {
  const cookieStore = await cookies()
  cookieStore.set("colorMode", colorMode)
}
