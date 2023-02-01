import "reflect-metadata"

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from "@apollo/federation";
import gql from "graphql-tag";
import { dataSource, productRepository } from "./services/dataSource";
import { In } from "typeorm";

const typeDefs = gql`
    type Product @key(fields: "id") {
        id: ID!
        name: String
        price: Float
    }

    type Query {
        product(id: ID!): Product
        products: [Product]
        productsByIds(productIds: [ID!]): [Product]
    }
`;

const resolvers = {
    Product: {
        async __resolveReference(ref) {
            return await productRepository.findOneBy({
                id: ref.id
            })
        }
    },
    Query: {
        async product(_, { id }) {
            return await productRepository.findOneBy({
                id: id
            })
        },
        async products() {
            return await productRepository.find();
        },
        async productsByIds(_, { productIds }) {
            return await productRepository.findBy({
                id: In(productIds)
            })
        },
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
        listen: { port: 4000 },
    });

    return url;
};

mainAsync().then(url => {
    console.log(`Catalog service up at ${url}`);
}).catch(ex => {
    console.error(ex);
});
