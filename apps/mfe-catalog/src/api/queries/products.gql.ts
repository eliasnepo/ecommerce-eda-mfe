import { gql } from 'graphql-request'
import type { ProductPage } from '../../types/product'

export const PRODUCTS_QUERY = gql`
  query Products($filter: ProductFilter, $page: Int, $size: Int) {
    products(filter: $filter, page: $page, size: $size) {
      content {
        id
        name
        description
        price
        category
        imageUrl
      }
      totalElements
      totalPages
      currentPage
    }
  }
`

export interface ProductsQueryVariables {
  filter?: {
    query?: string
    category?: string
    minPrice?: number
    maxPrice?: number
  }
  page?: number
  size?: number
}

export interface ProductsQueryResult {
  products: ProductPage
}
