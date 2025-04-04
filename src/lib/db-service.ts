import Database from "@tauri-apps/plugin-sql";
import { GroupType, ProfileType, ProxyType } from "./types";

const DB_PATH = "sqlite:shadow.db";
let db: Database;

async function connect() {
  db = await Database.load(DB_PATH);
}

async function getProfiles(groupId: number): Promise<Array<ProfileType>> {
  !db && (await connect());
  let sql = `
    SELECT
     p.id,
     p.name,
     p.remark,
     COALESCE(g.name, 'ungrouped') AS group_name,
     COALESCE(pr.name, 'unproxied') AS proxy_name
     FROM profile_table p
     LEFT JOIN group_table g ON p.group_id = g.id
     LEFT JOIN proxy_table pr ON p.proxy_id = pr.id 
    `;
  if (groupId == -1) {
    sql += ` WHERE p.group_id IS NULL`;
  } else if (groupId > 0) {
    sql += ` WHERE p.group_id = ${groupId}`;
  }
  return await db.select(sql);
}

async function addProfile(
  name: string,
  groupId: number | null,
  proxyId: number | null,
  remark: string | null
) {
  !db && (await connect());
  return await db.execute(
    `INSERT INTO profile_table (name, group_id, proxy_id, remark) VALUES ($1, $2, $3, $4)`,
    [name, groupId, proxyId, remark]
  );
}

async function bulkAddProfile(
  names: string[],
  groupId: number | null,
  proxyId: number | null
) {
  !db && (await connect());
  try {
    const values = [];
    for (const name of names) {
      values.push(`('${name}', ${groupId}, ${proxyId}, null)`);
    }
    await db.execute(
      `INSERT INTO profile_table (name, group_id, proxy_id, remark) VALUES ${values.join(
        ", "
      )}`
    );
    console.log(`Insert ${names} profiles successfully`);
    return true;
  } catch (error) {
    console.log(`Failed to insert bulk profiles: ${error}`);
    return false;
  }
}

async function deleteProfile(id: number) {
  !db && (await connect());
  return await db.execute(`DELETE FROM profile_table WHERE id = $1`, [id]);
}

async function deleteProfiles(ids: Array<number>) {
  !db && (await connect());
  return await db.execute(
    `DELETE FROM profile_table WHERE id IN (${ids.toString()})`
  );
}

async function updateProfile(
  id: number,
  name: string,
  groupId: number | null,
  proxyId: number | null,
  remark: string | null
) {
  !db && (await connect());
  return await db.execute(
    `UPDATE profile_table set name = $1, group_id = $2, proxy_id = $3, remark = $4 WHERE id = $5`,
    [name, groupId, proxyId, remark, id]
  );
}

async function checkProfile(name: string) {
  !db && (await connect());
  const result: Array<{ count: number }> = await db.select(
    `SELECT COUNT(*) as count FROM profile_table WHERE name = $1`,
    [name]
  );
  return result[0].count > 0;
}

async function getGroups(): Promise<GroupType[]> {
  !db && (await connect());
  return await db.select(`SELECT * FROM group_table`);
}

async function addGroup(name: string, remark: string | null) {
  !db && (await connect());
  return await db.execute(
    `INSERT INTO group_table (name, remark) VALUES ($1, $2)`,
    [name, remark]
  );
}

async function deleteGroup(id: number) {
  !db && (await connect());
  return await db.execute(`DELETE FROM group_table WHERE id = $1`, [id]);
}

async function deleteGroups(ids: Array<number>) {
  !db && (await connect());
  return await db.execute(
    `DELETE FROM group_table WHERE id IN (${ids.toString()})`
  );
}

async function updateGroup(id: number, name: string, remark: string | null) {
  !db && (await connect());
  return await db.execute(
    `UPDATE group_table set name = $1, remark = $2 WHERE id = $3`,
    [name, remark, id]
  );
}

async function checkGroup(name: string) {
  !db && (await connect());
  const result: Array<{ count: number }> = await db.select(
    `SELECT COUNT(*) as count FROM group_table WHERE name = $1`,
    [name]
  );
  return result[0].count > 0;
}

async function getProxies(): Promise<Array<ProxyType>> {
  !db && (await connect());
  return await db.select(`SELECT * FROM proxy_table`);
}

async function addProxy(name: string, remark: string | null) {
  !db && (await connect());
  return await db.execute(
    `INSERT INTO proxy_table (name, remark) VALUES ($1, $2)`,
    [name, remark]
  );
}

async function deleteProxy(id: number) {
  !db && (await connect());
  return await db.execute(`DELETE FROM proxy_table WHERE id = $1`, [id]);
}

async function deleteProxies(ids: Array<number>) {
  !db && (await connect());
  return await db.execute(
    `DELETE FROM proxy_table WHERE id IN (${ids.toString()})`
  );
}

async function updateProxy(id: number, name: string, remark: string | null) {
  !db && (await connect());
  return await db.execute(
    `UPDATE proxy_table set name = $1, remark = $2 WHERE id = $3`,
    [name, remark, id]
  );
}

async function checkProxy(name: string) {
  !db && (await connect());
  const result: Array<{ count: number }> = await db.select(
    `SELECT COUNT(*) as count FROM proxy_table WHERE name = $1`,
    [name]
  );
  return result[0].count > 0;
}

export {
  connect,
  getProfiles,
  addProfile,
  bulkAddProfile,
  deleteProfile,
  deleteProfiles,
  updateProfile,
  checkProfile,
  getGroups,
  addGroup,
  deleteGroup,
  deleteGroups,
  updateGroup,
  checkGroup,
  getProxies,
  addProxy,
  deleteProxy,
  deleteProxies,
  updateProxy,
  checkProxy,
};
