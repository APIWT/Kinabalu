import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from "@apollo/federation";
import gql from "graphql-tag";

const typeDefs = gql`
  type Order @key(fields: "id") {
    id: ID!
    cost: Float
    products: [Product]
  }

  extend type Product @key(fields: "id") {
      id: ID! @external
      orders: [Order]
  }
  
  type Query {
    order(id: ID!): Order
    orders: [Order]
  }
`;

const orders = [
    {
        id: 'abc123',
        cost: 12.50,
        products: [1, 2]
    },
    {
        id: 'def1234',
        cost: 100.50,
        products: [3, 4]
    },
];

const resolvers = {
    Order: {
        products: (order) => {
            return order.products.map(id => ({
                __typeName: 'Product',
                id: id
            }))
        },
    },
    Product: {
        orders(product) {
            return orders.filter(o => {
                const matchingProductIds = o.products.filter(productId => productId == product.id);
                return matchingProductIds.length > 0;
            });
        }
    },
    Query: {
        order(_, { id }) {
            return orders.filter(o => o.id == id)[0];
        },
        orders() {
            return orders;
        }
    },
};

const server = new ApolloServer({
    schema: buildSubgraphSchema({
        typeDefs: typeDefs,
        resolvers: resolvers
    })
});

const mainAsync = async () => {
    const { url } = await startStandaloneServer(server, {
        listen: { port: 4001 },
    });

    return url;
};

mainAsync().then(url => {
    console.log(`Checkout service up at ${url}`);
}).catch(ex => {
    console.error(ex);
});
