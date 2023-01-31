import "reflect-metadata"

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from "@apollo/federation";
import gql from "graphql-tag";
import { dataSource, orderRepository } from "./services/dataSource";
import { Order } from "./entities/order";
import { JwtPayload } from "jsonwebtoken";

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

const extractJwtPayloadFromContext = (context: any): JwtPayload | null => {
    if (!context || !context.jwtPayload) {
        return null;
    }

    return context.jwtPayload;
};

const resolvers = {
    Order: {
        async products(order: Order, _, context) {
            const payload = extractJwtPayloadFromContext(context);

            if (!payload) {
                return [];
            }

            const authenticatedUserId = parseInt(payload.sub, 10);

            if (order.userId !== authenticatedUserId) {
                return [];
            }

            return order.lineItems.map(lineItem => ({
                __typeName: 'Product',
                id: lineItem.productId
            }))
        },
    },
    Product: {
        orders(product, _, context) {
            const payload = extractJwtPayloadFromContext(context);

            if (!payload) {
                return [];
            }

            const authenticatedUserId = parseInt(payload.sub, 10);

            return orderRepository.find({
                where: {
                    lineItems: {
                        productId: product.id
                    },
                    userId: authenticatedUserId
                },
                relations: ["lineItems"]
            });
        }
    },
    Query: {
        async order(_, { id }, context) {
            const payload = extractJwtPayloadFromContext(context);

            if (!payload) {
                return null;
            }

            const authenticatedUserId = parseInt(payload.sub, 10);

            return await orderRepository.findOne({
                where: {
                    id: id,
                    userId: authenticatedUserId
                },
                relations: ['lineItems']
            });
        },
        async orders(_, __, context) {
            const payload = extractJwtPayloadFromContext(context);

            if (!payload) {
                return [];
            }

            const authenticatedUserId = parseInt(payload.sub, 10);

            return await orderRepository.find({
                where: {
                    userId: authenticatedUserId
                },
                relations: ['lineItems']
            });
        }
    },
};

const server = new ApolloServer({
    schema: buildSubgraphSchema({
        typeDefs: typeDefs,
        resolvers: resolvers
    }),
});

const mainAsync = async () => {
    await dataSource.initialize();

    const { url } = await startStandaloneServer(server, {
        listen: { port: 4001 },
        context: async ({ req }) => {
            let jwtPayloadHeaderValue = req.headers["x-kinabalu-jwt-payload"];

            if (typeof jwtPayloadHeaderValue !== 'string') {
                return {};
            }

            const jwtPayload = jwtPayloadHeaderValue ? JSON.parse(jwtPayloadHeaderValue) : null;
            return {
                jwtPayload: jwtPayload
            };
        }
    });

    return url;
};

mainAsync().then(url => {
    console.log(`Checkout service up at ${url}`);
}).catch(ex => {
    console.error(ex);
});
