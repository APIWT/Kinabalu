import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany} from "typeorm"
import { OrderLineItem } from "./orderLineItem";

@Entity()
export class Order {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    cost: number

    @Column()
    userId: number

    @OneToMany(type => OrderLineItem, lineItem => lineItem.order, {
        cascade: ["insert", "update", "remove"]
    })
    lineItems: OrderLineItem[]
}