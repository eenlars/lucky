export type GoogleMapsBusiness = {
  placeId?: string
  address?: string
  category?: string
  status?: string
  phone?: string
  googleUrl?: string
  bizWebsite?: string
  storeName?: string
  ratingText?: string
  stars: string | null
  numberOfReviews: number | null
  mainImage?: string
  hours: {
    monday?: string
    tuesday?: string
    wednesday?: string
    thursday?: string
    friday?: string
    saturday?: string
    sunday?: string
  } | null
}
