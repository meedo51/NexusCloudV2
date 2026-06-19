import { v4 as uuidv4 } from 'uuid';

type Row = Record<string, any>;

function getRowKey(row: Row, key: string): string | undefined {
  return Object.keys(row).find(k => {
    if (k.toLowerCase() === key.toLowerCase()) return true;
    // Handle alias-prefixed keys like wm.userId when looking up userId
    if (k.includes('.') && k.split('.').pop()!.toLowerCase() === key.toLowerCase()) return true;
    return false;
  });
}

function getRowValue(row: Row, key: string): any {
  const k = getRowKey(row, key);
  return k ? row[k] : undefined;
}

function setRowValue(row: Row, key: string, val: any): void {
  const existing = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
  if (existing && existing !== key) delete row[existing];
  row[key] = val;
}

function extractOutermost(sql: string): string {
  // Find all WHERE positions in the SQL (case-insensitive)
  const wherePositions: number[] = [];
  const whereRe = /\bWHERE\s+/gi;
  let m: RegExpExecArray | null;
  while ((m = whereRe.exec(sql)) !== null) {
    wherePositions.push(m.index + m[0].length); // position after 'WHERE '
  }
  for (const pos of wherePositions) {
    const before = sql.slice(0, pos);
    const openCount = (before.match(/\(/g) || []).length;
    const closeCount = (before.match(/\)/g) || []).length;
    if (openCount <= closeCount) {
      // This is the outermost WHERE
      const rest = sql.slice(pos);
      const endMatch = rest.match(/\b(?:ORDER BY|GROUP BY|LIMIT|OFFSET|RETURNING)\b/i);
      return endMatch ? rest.slice(0, endMatch.index).trim() : rest.trim();
    }
  }
  return '';
}

function toCamelCase(rows: Row[], tableName?: string): Row[] {
  const schema = tableName ? columnSchemas[tableName] : undefined;
  return rows.map(row => {
    const result: Row = {};
    for (const key of Object.keys(row)) {
      const originalKey = schema ? schema[key.toLowerCase()] : undefined;
      const camelKey = originalKey || key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camelKey] = row[key];
    }
    return result;
  });
}
type TableStore = Record<string, Row[]>;

const tables: TableStore = {
  users: [],
  files: [],
  share_links: [],
  favorites: [],
  file_versions: [],
  activity_logs: [],
  upload_requests: [],
  workspaces: [],
  workspace_members: [],
  workspace_items: [],
  workspace_invites: [],
  file_contents: [],
};

// Stores original column name casing per table for toCamelCase to restore
const columnSchemas: Record<string, Record<string, string>> = {};

export function registerColumnSchema(table: string, schema: Record<string, string>): void {
  columnSchemas[table] = { ...(columnSchemas[table] || {}), ...schema };
}

export function resetTables(): void {
  for (const key of Object.keys(tables)) {
    tables[key] = [];
  }
}

export function getTable(name: string): Row[] {
  return tables[name] || [];
}

// Convert $? and ? to $N (same as database.ts)
function convertParams(sql: string): string {
  let idx = 0;
  return sql.replace(/\$?\?/g, () => `$${++idx}`);
}

type ParsedSQL = {
  table: string;
  action: string;
  returning: boolean;
  hasSubquery: boolean;
};

function parseSQL(sql: string): ParsedSQL {
  const normalized = sql.replace(/\s+/g, ' ').trim();
  // Find the outermost FROM/INTO/UPDATE table, skipping subquery-embedded ones
  let table = '';
  const re = /(?:FROM|INTO|UPDATE|JOIN)\s+(\w+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    const before = normalized.slice(0, m.index);
    const openCount = (before.match(/\(/g) || []).length;
    const closeCount = (before.match(/\)/g) || []).length;
    if (openCount <= closeCount) {
      table = m[1];
      break;
    }
  }
  if (!table) {
    const fallback = normalized.match(/(?:FROM|INTO|UPDATE|JOIN)\s+(\w+)/i);
    table = fallback ? fallback[1] : '';
  }
  const returningMatch = normalized.match(/RETURNING\s+\*/i);
  const hasSubquery = /\(SELECT/i.test(normalized);
  let action = '';
  if (/^INSERT/i.test(normalized)) action = 'INSERT';
  else if (/^SELECT/i.test(normalized)) action = 'SELECT';
  else if (/^UPDATE/i.test(normalized)) action = 'UPDATE';
  else if (/^DELETE/i.test(normalized)) action = 'DELETE';
  else action = 'OTHER';
  return { table, action, returning: !!returningMatch, hasSubquery };
}

function getParam(sqlSegment: string, params: any[]): any {
  const m = sqlSegment.trim().match(/^\$(\d+)$/);
  if (m) return params[parseInt(m[1], 10) - 1];
  const sq = sqlSegment.trim();
  if (/^'/.test(sq)) return sq.replace(/^'|'$/g, '');
  if (/^NOW\(\)/i.test(sq)) return new Date();
  if (/^\d+\.?\d*$/.test(sq)) return parseFloat(sq);
  if (/^TRUE$/i.test(sq)) return true;
  if (/^FALSE$/i.test(sq)) return false;
  if (/^NULL$/i.test(sq)) return null;
  return sq;
}

function rowMatchesWhere(where: string, row: Row, params: any[]): boolean {
  if (!where) return true;
  const conditions = where.split(/\s+AND\s+/i);
  for (const cond of conditions) {
    const m = cond.match(/(\w+(?:\.\w+)?)\s*(=|!=|<>|<|>|<=|>=|IS NOT NULL|IS NULL|LIKE|ILIKE)\s*(.+)/i);
    if (!m) continue;
    let col = m[1].replace(/^\w+\./i, '');
    const op = m[2].toUpperCase();
    const rhs = m[3].trim();

    if (op === 'IS NULL') { if (getRowValue(row, col) != null) return false; continue; }
    if (op === 'IS NOT NULL') { if (getRowValue(row, col) == null) return false; continue; }

    const val = getParam(rhs, params);
    const colVal = getRowValue(row, col);

    if (op === '=') { if (String(colVal) !== String(val)) return false; }
    else if (op === '!=' || op === '<>') { if (String(colVal) === String(val)) return false; }
    else if (op === '>') { if (Number(colVal) <= Number(val)) return false; }
    else if (op === '<') { if (Number(colVal) >= Number(val)) return false; }
    else if (op === '>=') { if (Number(colVal) < Number(val)) return false; }
    else if (op === '<=') { if (Number(colVal) > Number(val)) return false; }
    else if (/ILIKE/i.test(op) || /LIKE/i.test(op)) {
      const pattern = String(val).replace(/%/g, '.*');
      if (!new RegExp(`^${pattern}$`, 'i').test(String(colVal))) return false;
    }
  }
  return true;
}

function orderRows(sql: string, rows: Row[]): Row[] {
  const m = sql.match(/ORDER BY\s+(\w+(?:\.\w+)?)(?:\s+(ASC|DESC))?/i);
  if (!m) return rows;
  let col = m[1].replace(/^\w+\./i, '');
  const dir = (m[2] || 'ASC').toUpperCase();
  return [...rows].sort((a, b) => {
    const aVal = getRowValue(a, col);
    const bVal = getRowValue(b, col);
    if (aVal == null) return 1; if (bVal == null) return -1;
    const c = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return dir === 'DESC' ? -c : c;
  });
}

function limitRows(sql: string, rows: Row[]): Row[] {
  const lm = sql.match(/LIMIT\s+(\d+)/i);
  const om = sql.match(/OFFSET\s+(\d+)/i);
  if (!lm) return rows;
  const limit = parseInt(lm[1], 10);
  const offset = om ? parseInt(om[1], 10) : 0;
  return rows.slice(offset, offset + limit);
}

function handleAggregations(sql: string, rows: Row[], tableRows: Row[], params: any[]): Row[] | null {
  // Correlated subqueries (SELECT COUNT(*) FROM ... WHERE ... = outer.col) are handled
  // by runSelect's subquery handling which runs before this function.
  // Skip them here to avoid overriding the full result set.
  if (/\(SELECT\s+COUNT/i.test(sql)) {
    return null; // fall through - already handled by subquery logic in runSelect
  }

  if (/COUNT\(\*\)/i.test(sql) && !/\(SELECT/i.test(sql)) {
    const aliasMatch = sql.match(/AS\s+(\w+)/i);
    return [{ [aliasMatch ? aliasMatch[1].toLowerCase() : 'count']: rows.length }];
  }

  if (/SUM\((\w+(?:\.\w+)?)\)/i.test(sql)) {
    const sm = sql.match(/SUM\((\w+(?:\.\w+)?)\)/i);
    const col = sm![1].replace(/^\w+\./i, '');
    const total = rows.reduce((a, r) => a + (Number(getRowValue(r, col)) || 0), 0);
    const aliasMatch = sql.match(/AS\s+(\w+)/i);
    return [{ [aliasMatch ? aliasMatch[1].toLowerCase() : 'total']: total }];
  }

  if (/COALESCE\(/i.test(sql)) {
    const cm = sql.match(/COALESCE\(SUM\((\w+(?:\.\w+)?)\),\s*(\d+)\)/i);
    if (cm) {
      const col = cm[1].replace(/^\w+\./i, '');
      const total = rows.reduce((a, r) => a + (Number(getRowValue(r, col)) || 0), 0);
      const aliasMatch = sql.match(/AS\s+(\w+)/i);
      const alias = aliasMatch ? aliasMatch[1].toLowerCase() : 'total';
      return [{ [alias]: total || parseInt(cm[2], 10) }];
    }
  }

  return null;
}

function handleDistinct(sql: string, rows: Row[]): Row[] | null {
  const m = sql.match(/SELECT\s+DISTINCT\s+(\w+(?:\.\w+)?)/i);
  if (!m) return null;
  const col = m[1].replace(/^\w+\./i, '');
  return [...new Set(rows.map(r => getRowValue(r, col)).filter(Boolean))].map(v => ({ [col.toLowerCase()]: v }));
}

function selectColumns(sql: string, rows: Row[]): Row[] {
  // Handle w.* and wm.* and u.* patterns
  const hasWildcard = /\w+\.\*/.test(sql);
  if (!hasWildcard) return rows.map(r => ({ ...r }));

  // Strip table aliases from column names when selecting w.*
  // For joined queries, we just return all columns
  return rows.map(r => {
    const out: Row = {};
    for (const [key, val] of Object.entries(r)) {
      out[key.replace(/^\w+\./i, '')] = val;
    }
    return out;
  });
}

export function prepare(sql: string) {
  const convertedSql = convertParams(sql);
  const parsed = parseSQL(convertedSql);
  const table = tables[parsed.table];

  function getWhere(sql: string): string {
    return extractOutermost(sql);
  }

  return {
    run: async (...params: any[]) => {
      if (parsed.action === 'INSERT') {
        const colMatch = convertedSql.match(/\(([^)]+)\)\s*VALUES/i);
        const valMatch = convertedSql.match(/VALUES\s*\(((?:[^()]|\([^)]*\))+)\)/i);
        if (!colMatch || !valMatch) return { rowCount: 0, rows: [] };

        const columns = colMatch[1].split(',').map(c => c.trim().replace(/^.*\./, ''));
        const valRefs = valMatch[1].split(',').map(v => v.trim());

        // Track column name casing for toCamelCase
        if (!columnSchemas[parsed.table]) columnSchemas[parsed.table] = {};
        for (const col of columns) {
          columnSchemas[parsed.table][col.toLowerCase()] = col;
        }

        const row: Row = {};
        for (let i = 0; i < columns.length && i < valRefs.length; i++) {
          const col = columns[i];
          const colLower = col.toLowerCase();
          let val = getParam(valRefs[i], params);
          if (colLower === 'id' && (!val || val === 'gen_random_uuid()' || val === 'DEFAULT')) val = uuidv4();
          if ((colLower === 'createdat' || colLower === 'updatedat' || colLower === 'joinedat' || colLower === 'addedat' || colLower === 'extractedat') && (!val || val === 'NOW()' || val instanceof Date && isNaN(val.getTime()))) {
            val = new Date();
          }
          if (colLower === 'backup_codes' || colLower === 'allowedtypes' || colLower === 'details') {
            if (typeof val === 'string') { try { val = JSON.parse(val); } catch {} }
          }
          row[col] = val;
        }
        // Apply defaults for known columns not explicitly set
        const tableLower = parsed.table.toLowerCase();
        if (!getRowValue(row, 'id') && tableLower !== 'workspace_members' && tableLower !== 'workspace_invites') setRowValue(row, 'id', uuidv4());
        if (!getRowValue(row, 'createdat')) setRowValue(row, 'createdat', new Date());
        if (!getRowValue(row, 'updatedat')) setRowValue(row, 'updatedat', new Date());
        if (tableLower === 'workspace_invites' && !getRowValue(row, 'accepted')) setRowValue(row, 'accepted', false);
        if (tableLower === 'workspace_items' && !getRowValue(row, 'isFolder')) setRowValue(row, 'isFolder', false);

        table.push(row);

        if (parsed.returning) return { rows: [row], rowCount: 1 };
        // Handle ON CONFLICT DO UPDATE - just insert or replace
        if (/ON CONFLICT/i.test(convertedSql)) {
          // Check for unique constraint violation (simplified - just keep last insert)
        }
        return { rowCount: 1, rows: [] };
      }

      if (parsed.action === 'UPDATE') {
        const setMatch = convertedSql.match(/SET\s+(.+?)(?:WHERE|$)/i);
        if (!setMatch) return { rowCount: 0, rows: [] };

        const setClauses = setMatch[1].split(',').map(s => s.trim());
        const where = getWhere(convertedSql);
        let updated = 0;

        for (const row of table) {
          if (!rowMatchesWhere(where, row, params)) continue;
          for (const clause of setClauses) {
            const sm = clause.match(/(\w+)\s*=\s*(.+)/i);
            if (!sm) continue;
            const col = sm[1];
            const raw = sm[2].trim();
            let val: any;
            if (/^\$\d+$/.test(raw)) val = params[parseInt(raw.substring(1), 10) - 1];
            else if (/^'/.test(raw)) val = raw.replace(/^'|'$/g, '');
            else if (/^NOW\(\)/i.test(raw)) val = new Date();
            else if (/^TRUE$/i.test(raw)) val = true;
            else if (/^FALSE$/i.test(raw)) val = false;
            else if (/^NULL$/i.test(raw)) val = null;
            else if (/^\d+\.?\d*$/.test(raw)) val = parseFloat(raw);
            else if (/^JSON/.test(raw)) {
              const jm = raw.match(/\$(\d+)/);
              if (jm) { val = params[parseInt(jm[1], 10) - 1]; if (typeof val === 'string') try { val = JSON.parse(val); } catch {} }
            } else if (/^COALESCE\(/i.test(raw)) {
              const cm = raw.match(/COALESCE\((\w+),\s*(\d+)\)/i);
              if (cm) val = getRowValue(row, cm[1]) ?? parseInt(cm[2], 10);
            } else val = raw;
            setRowValue(row, col, val);
          }
          updated++;
        }
        return { rowCount: updated, rows: [] };
      }

      if (parsed.action === 'DELETE') {
        const where = getWhere(convertedSql);
        let deleted = 0;
        for (let i = table.length - 1; i >= 0; i--) {
          if (rowMatchesWhere(where, table[i], params)) {
            table.splice(i, 1);
            deleted++;
          }
        }
        return { rowCount: deleted, rows: [] };
      }

      return { rowCount: 0, rows: [] };
    },

    get: async (...params: any[]) => {
      const results = runSelect(convertedSql, params);
      return results[0] || undefined;
    },

    all: async (...params: any[]) => {
      return runSelect(convertedSql, params);
    },
  };
}

function runSelect(sql: string, params: any[]): Row[] {
  const parsed = parseSQL(sql);
  const table = tables[parsed.table];
  if (!table) return [];

  const whereClause = extractOutermost(sql);

  // Handle basic JOINs
  const joinMatch = sql.match(/JOIN\s+(\w+)\s+(\w+)\s+ON\s+(\w+(?:\.\w+)?)\s*=\s*(\w+(?:\.\w+)?)/i);
  const hasJoin = !!joinMatch;

  // For JOIN queries, skip initial WHERE filtering (it references joined table columns),
  // take all rows, perform the JOIN, then filter.
  let results: Row[];
  if (hasJoin) {
    results = table.map(r => ({ ...r }));
  } else {
    results = table.filter(row => rowMatchesWhere(whereClause, row, params));
  }
  results = selectColumns(sql, results);

  // Perform JOIN
  if (hasJoin && joinMatch) {
    const joinTableName = joinMatch[1];
    const joinAlias = joinMatch[2];
    const joinTable = tables[joinTableName.toLowerCase()];
    if (joinTable) {
      const joinCol1 = joinMatch[3].replace(/^\w+\./i, '');
      const joinCol2 = joinMatch[4].replace(/^\w+\./i, '');
      const joined: Row[] = [];
      for (const row of results) {
        const joinVal = getRowValue(row, joinCol1);
        const matchingRows = joinTable.filter(r => String(getRowValue(r, joinCol2)) === String(joinVal));
        for (const matchRow of matchingRows) {
          const merged: Row = {};
          for (const [k, v] of Object.entries(matchRow)) {
            merged[`${joinAlias}.${k}`] = v;
          }
          joined.push({ ...row, ...merged });
        }
      }
      results = joined;
      // Now apply WHERE clause on the joined results
      if (whereClause) {
        results = results.filter(row => rowMatchesWhere(whereClause, row, params));
      }
    }
  }
  results = selectColumns(sql, results);

  // Handle subqueries in SELECT
  if (parsed.hasSubquery) {
    // Add subquery results as extra columns
    // For each row that has the proper matching key, compute the subquery
    // Only process subqueries that match the parameter or column reference pattern
    const subMatches = [...sql.matchAll(/\(SELECT\s+(.+?)\s+FROM\s+(\w+)\s+WHERE\s+(\w+(?:\.\w+)?)\s*=\s*(\$\d+|\w+(?:\.\w+)?)\)(?:\s+AS\s+(\w+))?/gi)];
    for (const sm of subMatches) {
      const subExpr = sm[1];
      const subTableName = sm[2];
      const subJoinCol = sm[3].replace(/^\w+\./i, '');
      const subRefRaw = sm[4];
      const subAlias = sm[5] ? sm[5].toLowerCase() : 'subquery_result';
      const subTable = tables[subTableName.toLowerCase()];
      if (!subTable) continue;

      for (const row of results) {
        let refVal: any;
        const refMatch = subRefRaw.match(/^\$(\d+)$/);
        if (refMatch) refVal = params[parseInt(refMatch[1], 10) - 1];
        else {
          const refCol = subRefRaw.replace(/^w\./i, '');
          refVal = getRowValue(row, refCol);
        }

        const filtered = subTable.filter(r => String(getRowValue(r, subJoinCol) || '') === String(refVal));

        if (/COUNT/i.test(subExpr)) {
          row[subAlias] = filtered.length;
        } else if (/SUM\(/i.test(subExpr)) {
          const sc = subExpr.match(/SUM\((\w+)\)/i);
          if (sc) {
            const total = filtered.reduce((a: number, r: Row) => a + (Number(getRowValue(r, sc[1])) || 0), 0);
            row[subAlias] = total;
          }
        }
      }
    }
  }

  // Handle standalone aggregations
  const agg = handleAggregations(sql, results, table, params);
  if (agg) return agg;

  const dist = handleDistinct(sql, results);
  if (dist) return dist;

  results = orderRows(sql, results);
  results = limitRows(sql, results);

  // Handle ::int and ::bigint casting - strip them
  return results;
}

export async function initializeDatabase(): Promise<void> {}

export async function recalculateUsedStorage(userId: string): Promise<number> {
  const total = tables.files
    .filter(f => String(f.userid) === String(userId) && !f.isfolder && !f.deletedat)
    .reduce((sum, f) => sum + (Number(f.size) || 0), 0);
  const user = tables.users.find(u => String(getRowValue(u, 'id')) === String(userId));
  if (user) setRowValue(user, 'usedstoragebytes', total);
  return total;
}

export async function checkQuota(userId: string, additionalBytes: number): Promise<{ allowed: boolean; used: number; quota: number; remaining: number }> {
  const user = tables.users.find(u => String(getRowValue(u, 'id')) === String(userId));
  const used = getRowValue(user || {}, 'usedstoragebytes') || 0;
  const quota = getRowValue(user || {}, 'storagequotabytes') || 3221225472;
  return { allowed: quota - used >= additionalBytes, used, quota, remaining: quota - used };
}

export async function logActivity(params: {
  userId: string; action: string; itemType?: string; itemId?: string;
  itemName?: string; details?: any; ipAddress?: string; userAgent?: string;
}): Promise<void> {
  const entry: Row = {
    id: uuidv4(), userid: params.userId, action: params.action,
    itemtype: params.itemType || 'file', itemid: params.itemId || null,
    itemname: params.itemName || '', details: params.details || {},
    ipaddress: params.ipAddress || '', useragent: params.userAgent || '',
    createdat: new Date(),
  };
  // Register schema for activity_logs
  if (!columnSchemas['activity_logs']) {
    columnSchemas['activity_logs'] = {
      id: 'id', userid: 'userid', action: 'action',
      itemtype: 'itemtype', itemid: 'itemid',
      itemname: 'itemname', details: 'details',
      ipaddress: 'ipaddress', useragent: 'useragent',
      createdat: 'createdat',
    };
  }
  tables.activity_logs.push(entry);
}

export async function pruneVersions(_fileId: string): Promise<void> {}

export const pool = {} as any;
export default { prepare };
