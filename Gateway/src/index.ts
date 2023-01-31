import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose } from "@apollo/gateway";

const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
        subgraphs: [{
            name: 'catalog',
            url: 'http://localhost:4000'
        }, {
            name: 'checkout',
            url: 'http://localhost:4001'
        }],
    }),
    debug: true
})

const server = new ApolloServer({
    gateway,
});

const mainAsync = async () => {
    const { url } = await startStandaloneServer(server, {
        listen: { port: 3000 },
    });

    return url;
};

mainAsync().then(url => {
    console.log(`Gateway up at ${url}`);
}).catch(ex => {
    console.error(ex);
});
