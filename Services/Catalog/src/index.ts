import "reflect-metadata"

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from "@apollo/federation";
import gql from "graphql-tag";
import { dataSource, productRepository } from "./services/dataSource";

const typeDefs = gql`
    type Product @key(fields: "id") {
        id: ID!
        name: String
    }

    type Query {
        product(id: ID!): Product
        products: [Product]
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
        listen: { port: 4000 },
    });

    return url;
};

mainAsync().then(url => {
    console.log(`Catalog service up at ${url}`);
}).catch(ex => {
    console.error(ex);
});
