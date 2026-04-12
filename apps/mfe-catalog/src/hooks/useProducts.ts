import { useQuery } from '@tanstack/react-query'
import { graphqlClient } from '../api/graphqlClient'
import {
  PRODUCTS_QUERY,
  type ProductsQueryResult,
  type ProductsQueryVariables,
} from '../api/queries/products.gql'
import type { ProductFilter } from '../types/product'

const PAGE_SIZE = 20

export function useProducts(filter: ProductFilter, page: number) {
  const variables: ProductsQueryVariables = {
    filter: {
      query: filter.query || undefined,
      category: filter.category,
      minPrice: filter.minPrice,
      maxPrice: filter.maxPrice,
    },
    page,
    size: PAGE_SIZE,
  }

  return useQuery<ProductsQueryResult>({
    queryKey: ['products', variables],
    queryFn: () =>
      graphqlClient.request<ProductsQueryResult>(PRODUCTS_QUERY, variables),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  })
}
