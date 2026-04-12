import { useQuery } from '@tanstack/react-query'
import { graphqlClient } from '../api/graphqlClient'
import {
  PRODUCT_QUERY,
  type ProductQueryResult,
} from '../api/queries/product.gql'

export function useProduct(id: string) {
  return useQuery<ProductQueryResult>({
    queryKey: ['product', id],
    queryFn: () => graphqlClient.request<ProductQueryResult>(PRODUCT_QUERY, { id }),
    staleTime: 300_000,
    enabled: Boolean(id),
  })
}
