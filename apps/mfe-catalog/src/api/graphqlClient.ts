import { GraphQLClient } from 'graphql-request'

declare const __GRAPHQL_URL__: string

const GRAPHQL_URL =
  typeof __GRAPHQL_URL__ === 'string' && __GRAPHQL_URL__.length > 0
    ? __GRAPHQL_URL__
    : 'http://localhost:8080/graphql'

export const graphqlClient = new GraphQLClient(GRAPHQL_URL, {
  headers: {},
})
