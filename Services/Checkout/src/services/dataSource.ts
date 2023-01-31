import { DataSource } from "typeorm";
import { OrderLineItem } from "../entities/orderLineItem";
import { Order } from "../entities/order";

export const dataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5001,
    username: "postgres",
    password: "example",
    database: "postgres",
    synchronize: true, // You should not use this in a real application; this will adjust schema automatically at start-up.
    logging: true,
    entities: [Order, OrderLineItem]
});

export const orderRepository = dataSource.getRepository(Order);
export const orderLineItemRepository = dataSource.getRepository(OrderLineItem);