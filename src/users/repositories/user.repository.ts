import { Injectable, Inject } from '@nestjs/common';
import { Kysely } from 'kysely';
import { Database } from '../../database/types/database';
import { BaseRepository } from '../../database/base.repository';
import { User, NewUser, UpdateUser } from '../../database/types/users';

@Injectable()
export class UserRepository extends BaseRepository<'users'> {
  constructor(@Inject('DATABASE') protected readonly db: Kysely<Database>) {
    super(db, 'users');
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | undefined> {
    return this.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst() as Promise<User | undefined>;
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | undefined> {
    return this.db
      .selectFrom('users')
      .selectAll()
      .where('username', '=', username)
      .executeTakeFirst() as Promise<User | undefined>;
  }
  
  /**
   * Find users with role information
   */
  async findAllWithRoles(page = 1, limit = 10): Promise<{ data: (User & { role_name: string })[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    
    // Get total count
    const countResult = await this.db
      .selectFrom('users')
      .select(this.db.fn.count<number>('id').as('count'))
      .executeTakeFirstOrThrow();
      
    // Get users with role information
    const data = await this.db
      .selectFrom('users')
      .innerJoin('roles', 'roles.id', 'users.role_id')
      .select([
        'users.id',
        'users.email',
        'users.fullname',
        'users.username',
        'users.phone_number',
        'users.address',
        'users.status',
        'users.role_id',
        'users.created_at',
        'users.updated_at',
        'roles.name as role_name'
      ])
      .limit(limit)
      .offset(offset)
      .execute() as (User & { role_name: string })[];
    
    return {
      data,
      total: Number(countResult.count),
      page,
      limit
    };
  }

  /**
   * Create a new user
   */
  async createUser(data: NewUser): Promise<User> {
    return this.create<NewUser, User>(data);
  }

  /**
   * Update a user
   */
  async updateUser(id: string, data: UpdateUser): Promise<User> {
    return this.update<UpdateUser, User>(id, data);
  }

  /**
   * Update user status
   */
  async updateStatus(id: string, status: string): Promise<User> {
    return this.update<UpdateUser, User>(id, { status } as UpdateUser);
  }
}
