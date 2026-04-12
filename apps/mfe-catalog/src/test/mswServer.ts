import { graphql, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

export const handlers = [
  graphql.query('Products', () => {
    return HttpResponse.json({
      data: {
        products: {
          content: [
            {
              id: 'prod-1',
              name: 'Wireless Headphones',
              description: 'Great sound',
              price: 99.99,
              category: 'Electronics',
              imageUrl: null,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          currentPage: 0,
        },
      },
    })
  }),

  graphql.query('Product', ({ variables }) => {
    if (variables.id === 'prod-1') {
      return HttpResponse.json({
        data: {
          product: {
            id: 'prod-1',
            name: 'Wireless Headphones',
            description: 'Great sound',
            price: 99.99,
            category: 'Electronics',
            imageUrl: null,
          },
        },
      })
    }

    return HttpResponse.json({ data: { product: null } })
  }),
]

export const server = setupServer(...handlers)
