import "reflect-metadata"

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from "@apollo/federation";
import gql from "graphql-tag";
import { dataSource, orderRepository } from "./services/dataSource";
import { Order } from "./entities/order";

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

const resolvers = {
    Order: {
        async products(order: Order) {
            return order.lineItems.map(lineItem => ({
                __typeName: 'Product',
                id: lineItem.productId
            }))
        },
    },
    Product: {
        orders(product) {
            return orderRepository.find({
                where: {
                    lineItems: {
                        productId: product.id
                    }
                },
                relations: ["lineItems"]
            });
        }
    },
    Query: {
        async order(_, { id }) {
            return await orderRepository.findOne({
                where: {
                    id: id,
                },
                relations: ['lineItems']
            });
        },
        async orders() {
            return await orderRepository.find({
                relations: ['lineItems']
            });
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
    await dataSource.initialize();

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
