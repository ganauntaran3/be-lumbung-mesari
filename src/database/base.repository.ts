import { Kysely, Selectable, Insertable, Updateable } from 'kysely'
import { Database } from './types/database'

export abstract class BaseRepository<T> {
  constructor(
    protected readonly db: Kysely<Database>,
    protected readonly tableName: keyof Database & string
  ) {}

  async findAll(): Promise<Selectable<T>[]> {
    return this.db.selectFrom(this.tableName).selectAll().execute() as Promise<
      Selectable<T>[]
    >
  }

  async findById(id: any): Promise<Selectable<T> | undefined> {
    return this.db
      .selectFrom(this.tableName)
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst() as Promise<Selectable<T> | undefined>
  }

  async create(data: Insertable<T>): Promise<Selectable<T>> {
    return this.db
      .insertInto(this.tableName)
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow() as Promise<Selectable<T>>
  }

  async updateById(id: any, data: Updateable<T>): Promise<Selectable<T>> {
    return this.db
      .updateTable(this.tableName)
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow() as Promise<Selectable<T>>
  }

  async deleteById(id: any): Promise<Selectable<T>> {
    return this.db
      .deleteFrom(this.tableName)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow() as Promise<Selectable<T>>
  }

  async paginate(
    page = 1,
    perPage = 10
  ): Promise<{ data: Selectable<T>[]; total: number }> {
    const offset = (page - 1) * perPage

    const [data, { total }] = await Promise.all([
      this.db
        .selectFrom(this.tableName)
        .selectAll()
        .limit(perPage)
        .offset(offset)
        .execute() as Promise<Selectable<T>[]>,

      this.db
        .selectFrom(this.tableName)
        .select((eb) => eb.fn.countAll().as('total'))
        .executeTakeFirstOrThrow()
        .then((res) => ({ total: Number((res as any).total) }))
    ])

    return { data, total }
  }
}
