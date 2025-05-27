import {Injectable} from '@nestjs/common';
import {PrismaService} from '../../prisma/prisma.service';
import {Prisma, PrismaClient, User} from '@prisma/client';

@Injectable()
export class UserRepository {
    constructor(
        private prisma: PrismaService,
    ) {
    }

    findById(id: number): Promise<User | null> {
        return this.execTransaction((tx) =>
            tx.user.findUnique({where: {id}})
        );
    }

    findByTelegramId(telegramId: number): Promise<User | null> {
        return this.execTransaction((tx) =>
            tx.user.findUnique({where: {telegramId}})
        );
    }

    create(data: Prisma.UserCreateInput): Promise<User> {
        return this.execTransaction((tx) =>
            tx.user.create({data})
        );
    }

    update(id: number, data: Prisma.UserUpdateInput): Promise<User> {
        return this.execTransaction((tx) =>
            tx.user.update({
                where: {id},
                data,
            })
        );
    }

    async upsert(
        data: Prisma.UserUncheckedCreateInput
    ): Promise<User> {
        return this.execTransaction(tx =>
            tx.user.upsert({
                where: data.id ? {id: data.id} : {telegramId: data.telegramId},
                create: {...data, lastActiveAt: new Date()},
                update: {...data, lastActiveAt: new Date()},
            }),
        );
    }

    private execTransaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(fn);
    }
}