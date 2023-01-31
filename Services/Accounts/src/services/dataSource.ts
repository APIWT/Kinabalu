import { DataSource } from "typeorm";
import { User } from "../entities/user";

export const dataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5002,
    username: "postgres",
    password: "example",
    database: "postgres",
    synchronize: true, // You should not use this in a real application; this will adjust schema automatically at start-up.
    logging: true,
    entities: [User]
});

export const userRepository = dataSource.getRepository(User);