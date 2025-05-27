import {Injectable} from '@nestjs/common';
import {UserRepository} from '../database/user.repository';
import {Prisma, User, UserRole} from '@prisma/client';

@Injectable()
export class UserService {
    constructor(private readonly userRepo: UserRepository) {
    }

    /**
     * Получает пользователя в БД по Id
     */
    async getUserById(id: number): Promise<User | null> {
        return this.userRepo.findById(id);
    }

    /**
     * Получает пользователя в БД по telegramId
     */
    async getUserByTelegramId(telegramId: number): Promise<User | null> {
        return this.userRepo.findByTelegramId(telegramId);
    }

    /**
     * Создает пользователя в БД
     */
    async createUser(telegramId: number): Promise<User> {
        return this.userRepo.create({telegramId})
    }

    /**
     * Обновляет или создает сущность пользователя. Возвращает User
     */
    async upsertUser(data : Prisma.UserUncheckedCreateInput): Promise<User> {
        if (!data.id && !data.telegramId) {
            throw new Error('Either id or telegramId must be provided for upsert');
        }
        return this.userRepo.upsert(data)
    }

    /**
     * Обновление роли пользователя
     */
    async updateRole(id: number, role: UserRole): Promise<User> {
        return this.userRepo.update(id, {role: role})
    }
}