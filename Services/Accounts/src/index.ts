import "reflect-metadata"

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from "@apollo/federation";
import gql from "graphql-tag";
import { dataSource, userRepository } from "./services/dataSource";
import { GraphQLError } from "graphql/error";
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';

// In a production-like application, you would want this to be injected in a secure manner.
const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEA25B+a7NvJ6xHyTuu+dpCgs42tMwPjhefBGydwAmdLvcazTv0
KptKF92lIgES4z05z+RhAtLH4XeF8xPjQN6N9JK1b+4coTulwkL3B+KoYZj3SpwN
SXSSS1GGMuQuILo0au+fr+uQc1N1JQ+qNAUvoVGDMcqteJFYaxPT4rwcUyHjsuHO
USAzVzIS2Op/ery0FL3IlBLoKal/PEBFnF95UKxq4czw4Lb9s3b5pbh76vk6mpya
shXROGYrk77xmdFMslcKA33e6Z4kXLXrfzIjyyrKZMadrC5yfcZ0P+FXMd3Kb4Pm
eoDVgEUjTQ4TWFYjnhP9lOCff32KSGhRRY6BRQIDAQABAoIBAD0dcTMFVRFT8P9g
b4n4aL8EK1IT4tiIVqjimt5TTr895OXvpD0f0HXoKgjXB6zc4/Sr+xzQEvb9T/mj
NYRe7mB/XaV0P9/ZPIBgJ2a4fmn8LAlGeqRRoE76uEH+JaDSc7i4TlinVyPivR69
x4CHWQSsLbp0UejXfCcB896OwcuZhSsxJC06HCYtxY1U5o3B9VgV7nWXrUJJ0nah
23xt1vwEqYzlWtciR6Td6B63LaX/BixaZeZ7xpFUTaR1ehsBC9Tr1Xlzz1Bskb+9
Jha+77OPwxLASERYzKrSUAOOQ/LnrEnLEizwjqeM/L1vlT8ANVCPumEzWz1KrAoJ
p35fbFkCgYEA4prPLbqq3veRL1y9wiDmNsLRl92GKqN5N8fdAdvZljSRkXIUeAIY
odODLsNVPt8fRLDA6zE9zpJsj8IAslBv6rCrAKt/cyhByD4OkXPvEnNcgUN03cj7
Hy/efBQvcIGKjBF0chmAYKOwiMeeoKmUO8ja6GM8Jp8PnuD76ChA0eMCgYEA+Avj
JYlRoxHT3LvEuX8akJn7JHRWayXRrrUFkzS68TOS7Sx8uJM28uNFQeh88VxlAKwE
sCLvkmuq3egYz9NQY/jAWf2SWhHb3cHhHcHhVPMbzE7+WRGi9kuXQ8kJABK0pdSK
Y5EK2NXLE+fOVVD3AQ3ulFpX7VFmk0qaVb9vKLcCgYAOPRgDkZUnCXtP9I3f4t1U
V41/82V4zGjTfnV+pmfXrlnvP7HVkJwnnvjBOXjjyHVYhZq5rJBrqHu11MTib3d4
0b0M/7m0bLUldfDIZvaAvEr1vF1dikFtRj6+oS4R7bHc90PP35ZXfDGdhp2LDtzH
nOlUbNfcvWXn3880WUMpbQKBgGEzt1W0VCuFBvMPGe5fIrfbv5DvjhX7AgpmocKn
/UIcJc2Pi2iBOB1Cdpd3Vc73mBUFU+j6J8vHKXRAScjXVD948VfSiJGHQhPKsD8L
BRRXGGOd6QpaYPQHd0V2+HHw4p3BhmGyKwAB98zbH/5K9iCRpxa3uJElPv8lUwmb
NSJNAoGAFgyePiKbusXZPVTTC5MthFVFTsXBfo3YZlLzoZCdcgaaC70Y2RBdG5i+
bkPSoNjgVij04NhgWhC/UNWVj0D3C6zUogen62v5L7lnCeY8uyGM4ye1W8QdBELq
2PtRfbf/0s6UWDtK8O6H+51y7vOLrFN951AQunhBBTljjMdCDB0=
-----END RSA PRIVATE KEY-----`;

const typeDefs = gql`
    type AuthResult {
        accessToken: String
    }

    type Mutation {
        login(email: String!, password: String!): AuthResult
    }
`;

interface AuthResult {
    accessToken: string
}

const resolvers = {
    Mutation: {
        async login(parent, { email, password }) {
            if (typeof email !== 'string' || email.trim() === '') {
                throw new GraphQLError("Invalid credentials");
            }

            const user = await userRepository.findOneBy({
                email: email
            });

            if (!user || !user.passwordHash || user.passwordHash.trim() === '' || !password || password.trim() === '') {
                throw new GraphQLError("Invalid credentials");
            }

            const isValid = await bcrypt.compare(password, user.passwordHash);

            if (!isValid) {
                throw new GraphQLError("Invalid credentials");
            }

            const token = jwt.sign({
                email: user.email,
                roles: ["superuser", "cool"]
            }, privateKey, {
                subject: user.id.toString(10),
                algorithm: "RS256",
                audience: 'KinabaluAudience',
                issuer: 'KinabaluIssuer',
                expiresIn: '7d',
                notBefore: '-60s'
            });

            const authResult: AuthResult = {
                accessToken: token
            };

            return authResult;
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
        listen: { port: 4002 },
    });

    return url;
};

mainAsync().then(url => {
    console.log(`Accounts service up at ${url}`);
}).catch(ex => {
    console.error(ex);
});
