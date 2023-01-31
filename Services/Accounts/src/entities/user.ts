import {Entity, PrimaryGeneratedColumn, Column, Unique} from "typeorm"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ unique: true })
    email: string

    @Column()
    passwordHash: string
}