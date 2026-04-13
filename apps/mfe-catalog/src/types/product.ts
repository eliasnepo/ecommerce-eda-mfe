export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: string | null
  imageUrl: string | null
}

export interface ProductPage {
  content: Product[]
  totalElements: number
  totalPages: number
  currentPage: number
}

export interface ProductFilter {
  query?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: ProductSortBy
}

export type ProductSortBy = 'relevance' | 'price_asc' | 'price_desc'

export interface Store {
  id: string
  name: string
  rating: number
  reviewCount: string
  thumbnailUrl?: string
}
