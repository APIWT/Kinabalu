import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class Product {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column({ default: 0 })
    price: number
}