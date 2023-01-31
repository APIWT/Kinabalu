import {Entity, PrimaryGeneratedColumn, Column, ManyToOne} from "typeorm"
import { Order } from "./order";

@Entity()
export class OrderLineItem {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(type => Order, order => order.lineItems)
    order: Order

    @Column()
    productId: number
}