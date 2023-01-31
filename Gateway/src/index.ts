import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from "@apollo/gateway";
import * as jwt from 'jsonwebtoken';
import { Jwt } from "jsonwebtoken";

// In a production-like application, you would want this to be injected in a secure manner.
// That being said, since this is a public key, it is not a secret.
const publicKey = `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA25B+a7NvJ6xHyTuu+dpCgs42tMwPjhefBGydwAmdLvcazTv0KptK
F92lIgES4z05z+RhAtLH4XeF8xPjQN6N9JK1b+4coTulwkL3B+KoYZj3SpwNSXSS
S1GGMuQuILo0au+fr+uQc1N1JQ+qNAUvoVGDMcqteJFYaxPT4rwcUyHjsuHOUSAz
VzIS2Op/ery0FL3IlBLoKal/PEBFnF95UKxq4czw4Lb9s3b5pbh76vk6mpyashXR
OGYrk77xmdFMslcKA33e6Z4kXLXrfzIjyyrKZMadrC5yfcZ0P+FXMd3Kb4PmeoDV
gEUjTQ4TWFYjnhP9lOCff32KSGhRRY6BRQIDAQAB
-----END RSA PUBLIC KEY-----`;

const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
        subgraphs: [{
            name: 'catalog',
            url: 'http://localhost:4000'
        }, {
            name: 'checkout',
            url: 'http://localhost:4001'
        }, {
            name: 'accounts',
            url: 'http://localhost:4002'
        }],
    }),
    buildService({ name, url }) {
        return new RemoteGraphQLDataSource({
            url,
            willSendRequest({ request, context }) {
                request.http.headers.set(
                    "x-kinabalu-jwt-payload",
                    context.tokenPayload ? JSON.stringify(context.tokenPayload) : null
                );
            }
        });
    },
    debug: true
})

const server = new ApolloServer({
    gateway,
});

const mainAsync = async () => {
    const { url } = await startStandaloneServer(server, {
        listen: { port: 3000 },
        context: async ({ req, res }) => {
            const authorizationHeaderValue = req.headers.authorization || '';

            if (authorizationHeaderValue.trim() === '' || authorizationHeaderValue.substring(0, 7) !== 'Bearer ') {
                return {};
            }

            const token = authorizationHeaderValue.substring(7).trim();

            if (token === '') {
                return {};
            }

            let result: Jwt;

            try {
                // You would not want to hardcode the audience and issuer in a production-like environment.
                result = jwt.verify(token, publicKey, {
                    complete: true,
                    algorithms: ['RS256'],
                    audience: 'KinabaluAudience',
                    issuer: 'KinabaluIssuer'
                });
            } catch (err) {
                console.log(err);
                console.log(`The client passed in a bad access token: ${token}`);
                // This means they gave a bad token. You could return something here to signify that if you want.
                return {};
            }

            return {
                tokenPayload: result.payload
            };
        },
    });

    return url;
};

mainAsync().then(url => {
    console.log(`Gateway up at ${url}`);
}).catch(ex => {
    console.error(ex);
});
