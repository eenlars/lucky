// response type, good for not having to throw errors all the time.
export type RS<T> =
  | {
      success: true
      error?: undefined
      data: T
      usdCost: number | undefined
    }
  | {
      success: false
      error: string
      data?: never
      usdCost: number | undefined
    }

export const R: {
  error: (error: string, usdCost: number | undefined) => RS<never>
  success: <T>(data: T, usdCost: number | undefined) => RS<T>
} = {
  error(error: string, usdCost: number | undefined): RS<never> {
    return {
      success: false,
      error,
      usdCost,
    }
  },
  success<T>(data: T, usdCost: number | undefined): RS<T> {
    return {
      success: true,
      data,
      usdCost,
    }
  },
}
