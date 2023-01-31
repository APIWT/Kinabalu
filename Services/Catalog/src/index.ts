import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from "@apollo/federation";
import gql from "graphql-tag";

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

const products = [
    {
        id: 1,
        name: 'Pepsi 12 pack'
    },
    {
        id: 2,
        name: 'Coffee Cup'
    },
    {
        id: 3,
        name: 'Laptop Computer'
    },
    {
        id: 4,
        name: 'Keyboard'
    },
];

const resolvers = {
    Product: {
        __resolveReference(ref) {
            return products.filter(o => o.id == ref.id)[0];
        }
    },
    Query: {
        product(_, { id }) {
            return products.filter(o => o.id == id)[0];
        },
        products() {
            return products;
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
