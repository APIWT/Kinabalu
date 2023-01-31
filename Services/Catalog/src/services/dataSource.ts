import { DataSource } from "typeorm";
import { Product } from "../entities/product";

export const dataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5000,
    username: "postgres",
    password: "example",
    database: "postgres",
    synchronize: true, // You should not use this in a real application; this will adjust schema automatically at start-up.
    logging: true,
    entities: [Product]
});

export const productRepository = dataSource.getRepository(Product);