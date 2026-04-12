import { gql } from 'graphql-request'
import type { Product } from '../../types/product'

export const PRODUCT_QUERY = gql`
  query Product($id: ID!) {
    product(id: $id) {
      id
      name
      description
      price
      category
      imageUrl
    }
  }
`

export interface ProductQueryResult {
  product: Product | null
}
