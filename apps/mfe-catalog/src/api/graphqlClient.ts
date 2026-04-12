import { GraphQLClient } from 'graphql-request'

const GRAPHQL_URL =
  (import.meta as ImportMeta & { env: Record<string, string> }).env
    .VITE_GRAPHQL_URL ?? 'http://localhost:8080/graphql'

export const graphqlClient = new GraphQLClient(GRAPHQL_URL, {
  headers: {},
})
