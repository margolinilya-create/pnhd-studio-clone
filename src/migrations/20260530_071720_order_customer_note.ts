import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Drizzle generator случайно повторил предыдущие миграции (meta columns) —
// руками оставлен только новый customer.note. Snapshot .json сохранён как
// baseline для следующих миграций.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload"."orders" ADD COLUMN "customer_note" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload"."orders" DROP COLUMN "customer_note";
  `)
}
