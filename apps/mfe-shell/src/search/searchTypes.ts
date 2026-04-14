export const CATALOG_SEARCH_QUERY_SET_EVENT = 'catalog:search-query:set'
export const CATALOG_SEARCH_QUERY_REQUEST_EVENT = 'catalog:search-query:request'
export const CATALOG_SEARCH_QUERY_STATE_EVENT = 'catalog:search-query:state'

export type CatalogSearchSource = 'shell_header'

export interface CatalogSearchSetDetail {
  query: string
  source: CatalogSearchSource
  updatedAt: string
}

export interface CatalogSearchStateDetail {
  query: string
  updatedAt: string
}
