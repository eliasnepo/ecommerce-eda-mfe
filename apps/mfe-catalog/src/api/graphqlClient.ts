import { GraphQLClient } from 'graphql-request'

declare const __GRAPHQL_URL__: string

const GRAPHQL_URL = __GRAPHQL_URL__

export const graphqlClient = new GraphQLClient(GRAPHQL_URL, {
  headers: {},
})
