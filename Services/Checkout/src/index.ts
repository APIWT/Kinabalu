import "reflect-metadata"

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from "@apollo/federation";
import gql from "graphql-tag";
import { dataSource, orderLineItemRepository, orderRepository } from "./services/dataSource";
import { Order } from "./entities/order";
import { JwtPayload } from "jsonwebtoken";
import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client/core";
import { fetch } from 'cross-fetch';
import { GraphQLError } from "graphql/error";
import {ApolloQueryResult} from "@apollo/client/core/types";
import {OrderLineItem} from "./entities/orderLineItem";

const catalogClient = new ApolloClient({
    link: new HttpLink({
        uri: 'http://localhost:4000/',
        fetch: fetch
    }),
    cache: new InMemoryCache(),
});

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
  
  type Mutation {
      placeOrder(productIds: [ID!]): Order
  }
`;

interface ProductByIdsQueryResult {
    productsByIds: Product[]
}

interface Product {
    id: number;
    price: number;
}

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
    Mutation: {
        async placeOrder(parent, { productIds }, context) {
            const payload = extractJwtPayloadFromContext(context);

            if (!payload) {
                throw new GraphQLError("Only logged in users can place orders");
            }

            const authenticatedUserId = parseInt(payload.sub, 10);

            let result: ApolloQueryResult<ProductByIdsQueryResult>;

            try {
                result = await catalogClient.query<ProductByIdsQueryResult>({
                    query: gql`
                        query($productIds: [ID!]) {
                            productsByIds(productIds: $productIds) {
                                id
                                price
                            }
                        }
                    `,
                    variables: {productIds}
                });
            } catch (err) {
                throw new GraphQLError("Unable to look up products");
            }

            const order = orderRepository.create();
            order.userId = authenticatedUserId;

            // We can only place an order if we can calculate a cost :^)
            let cost = 0;
            let lineItems: OrderLineItem[] = [];

            for (const productId of productIds) {
                const product = result.data.productsByIds.find(p => p.id == productId);

                if (!product) {
                    throw new GraphQLError(`The product ${productId} is not valid`);
                }

                cost += product.price;

                const lineItem = orderLineItemRepository.create();
                lineItem.order = order;
                lineItem.productId = productId;
                lineItems.push(lineItem);
            }

            order.lineItems = lineItems;
            order.cost = cost;

            await orderRepository.save(order);
            return order;
        }
    }
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
