/**
 * DSL Parser v2 — Genogram Markdown DSL
 *
 * Supports both multi-line and single-line block forms:
 *   person P1 { name: 王大明; gender: male; age: 78 }
 *   person P1 {
 *     name: 王大明
 *     gender: male
 *   }
 *
 * And single-line statements:
 *   marriage P1 P2
 *   children parents: [P1, P2] kids: [P3, P4]
 *   household [P1, P2]
 *   caregiver from: P2 to: P1 burden: moderate
 */

import type {
  Burden,
  EcomapDirection,
  EcomapStrength,
  EconomicStatus,
  Gender,
  GenogramAST,
  ParseError,
  Person,
  ResourceType,
  SupportLevel,
} from '../types/genogram';

interface Statement {
  raw: string;
  line: number;
  keyword: string;
  args: string;
  block?: string;
}

function emptyAst(): GenogramAST {
  return {
    people: new Map(),
    resources: new Map(),
    marital: [],
    children: [],
    households: [],
    nearbyHouseholds: [],
    caregivers: [],
    miscarriages: [],
    stillbirths: [],
    ecomap: [],
    family: {},
    errors: [],
  };
}

/** Strip a trailing comment from a single line (preserves the line itself). */
function stripComment(line: string): string {
  const idx = line.indexOf('#');
  return idx === -1 ? line : line.slice(0, idx);
}

/** Split top-level DSL into statements, handling brace blocks. */
function tokenize(input: string): Statement[] {
  const lines = input.split(/\r?\n/);
  const cleaned = lines.map(stripComment);

  const statements: Statement[] = [];
  let i = 0;
  while (i < cleaned.length) {
    const trimmed = cleaned[i].trim();
    if (trimmed.length === 0) {
      i++;
      continue;
    }
    const startLine = i + 1;
    const openIdx = cleaned[i].indexOf('{');
    if (openIdx === -1) {
      // single-line statement
      const { keyword, args } = splitKeyword(trimmed);
      statements.push({ raw: trimmed, line: startLine, keyword, args });
      i++;
      continue;
    }

    // collect block; supports inline `{ ... }` on same line
    const before = cleaned[i].slice(0, openIdx).trim();
    const { keyword, args } = splitKeyword(before);
    let depth = 0;
    const buf: string[] = [];
    let j = i;
    let charIdx = openIdx;
    let blockBuf = '';
    while (j < cleaned.length) {
      const lineRest = j === i ? cleaned[j].slice(charIdx) : cleaned[j];
      for (let k = 0; k < lineRest.length; k++) {
        const ch = lineRest[k];
        if (ch === '{') {
          depth++;
          if (depth === 1) continue; // skip opening brace
        } else if (ch === '}') {
          depth--;
          if (depth === 0) {
            statements.push({
              raw: cleaned.slice(i, j + 1).join('\n'),
              line: startLine,
              keyword,
              args,
              block: blockBuf,
            });
            // resume after this brace on the same line
            const rest = lineRest.slice(k + 1).trim();
            if (rest.length > 0) {
              // very rare: put back as a synthetic remainder line; ignore for now
            }
            i = j + 1;
            j = cleaned.length; // break outer
            break;
          }
        } else if (depth >= 1) {
          blockBuf += ch;
        }
      }
      if (depth === 0) break;
      buf.push(lineRest);
      blockBuf += '\n';
      j++;
      charIdx = 0;
    }

    if (depth !== 0) {
      // unterminated block — push as error placeholder
      statements.push({
        raw: cleaned.slice(i).join('\n'),
        line: startLine,
        keyword,
        args,
        block: blockBuf,
      });
      i = cleaned.length;
    }
  }
  return statements;
}

function splitKeyword(s: string): { keyword: string; args: string } {
  const m = s.match(/^(\S+)\s*(.*)$/);
  if (!m) return { keyword: '', args: '' };
  return { keyword: m[1], args: m[2].trim() };
}

/** Split a block body into key-value pairs.  Handles both ';' and newline separators. */
function parseBlockFields(block: string): Map<string, string> {
  const fields = new Map<string, string>();
  const chunks = block
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const chunk of chunks) {
    const idx = chunk.indexOf(':');
    if (idx === -1) continue;
    const key = chunk.slice(0, idx).trim().toLowerCase();
    const val = chunk.slice(idx + 1).trim();
    fields.set(key, val);
  }
  return fields;
}

/** Parse an inline list literal `[a, b, c]` from a string. Returns the list and the index after `]`. */
function parseList(s: string, start: number): { items: string[]; next: number } | null {
  let i = start;
  while (i < s.length && /\s/.test(s[i])) i++;
  if (s[i] !== '[') return null;
  const end = s.indexOf(']', i);
  if (end === -1) return null;
  const inner = s.slice(i + 1, end);
  const items = inner
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
  return { items, next: end + 1 };
}

/** Parse a sequence of `key: value` pairs from an args string. Values can be IDs, numbers, or `[lists]`. */
function parseInlineKv(args: string): Map<string, string | string[]> {
  const out = new Map<string, string | string[]>();
  let i = 0;
  while (i < args.length) {
    while (i < args.length && /\s/.test(args[i])) i++;
    // key
    const keyMatch = args.slice(i).match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*/);
    if (!keyMatch) break;
    const key = keyMatch[1].toLowerCase();
    i += keyMatch[0].length;
    // value
    if (args[i] === '[') {
      const list = parseList(args, i);
      if (!list) break;
      out.set(key, list.items);
      i = list.next;
    } else {
      // read until next `keyword:` or end
      const rest = args.slice(i);
      const nextKey = rest.match(/\s+[A-Za-z_][A-Za-z0-9_]*\s*:/);
      const valEnd = nextKey ? nextKey.index! : rest.length;
      const val = rest.slice(0, valEnd).trim();
      out.set(key, val);
      i += valEnd;
    }
  }
  return out;
}

function asGender(s: string | undefined): Gender {
  if (s === 'male' || s === 'female') return s;
  return 'unknown';
}

function asBool(s: string | undefined): boolean | undefined {
  if (s === undefined) return undefined;
  if (/^true$/i.test(s)) return true;
  if (/^false$/i.test(s)) return false;
  return undefined;
}

function asNumber(s: string | undefined): number | undefined {
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function asBurden(s: string | undefined): Burden | undefined {
  if (s === 'mild' || s === 'moderate' || s === 'severe') return s;
  return undefined;
}

function asResourceType(s: string | undefined): ResourceType {
  switch (s) {
    case 'medical':
    case 'community':
    case 'school':
    case 'religion':
    case 'work':
      return s;
    default:
      return 'other';
  }
}

function asStrength(s: string | undefined): EcomapStrength {
  if (s === 'strong' || s === 'weak' || s === 'stressful') return s;
  return 'normal';
}

function asDirection(s: string | undefined): EcomapDirection {
  if (s === 'in' || s === 'out') return s;
  return 'both';
}

function asSupportLevel(s: string | undefined): SupportLevel | undefined {
  if (s === 'good' || s === 'normal' || s === 'weak') return s;
  return undefined;
}

function asEconomicStatus(s: string | undefined): EconomicStatus | undefined {
  if (s === 'stable' || s === 'unstable') return s;
  return undefined;
}

export function parseDsl(input: string): GenogramAST {
  const ast = emptyAst();
  const errors: ParseError[] = ast.errors;
  const stmts = tokenize(input);
  let caseAssigned = false;

  for (const stmt of stmts) {
    try {
      switch (stmt.keyword) {
        case 'person': {
          const idMatch = stmt.args.match(/^(\S+)/);
          if (!idMatch) {
            errors.push({ line: stmt.line, message: 'person 缺少 ID' });
            break;
          }
          const id = idMatch[1];
          const fields = parseBlockFields(stmt.block ?? '');
          const person: Person = {
            id,
            name: fields.get('name') ?? id,
            gender: asGender(fields.get('gender')),
            age: asNumber(fields.get('age')),
            role: fields.get('role'),
            health: fields.get('health'),
            mobility: fields.get('mobility'),
            generation: asNumber(fields.get('generation')) ?? 2,
            note: fields.get('note'),
            deceased: asBool(fields.get('deceased')),
            deathYear: asNumber(fields.get('death_year')),
          };
          if (person.role && person.role.includes('案主')) {
            person.isCase = true;
            caseAssigned = true;
          }
          if (person.role && person.role.includes('主要照顧者')) {
            person.isCaregiver = true;
          }
          ast.people.set(id, person);
          break;
        }
        case 'external_resource': {
          const idMatch = stmt.args.match(/^(\S+)/);
          if (!idMatch) {
            errors.push({ line: stmt.line, message: 'external_resource 缺少 ID' });
            break;
          }
          const id = idMatch[1];
          const fields = parseBlockFields(stmt.block ?? '');
          ast.resources.set(id, {
            id,
            name: fields.get('name') ?? id,
            resourceType: asResourceType(fields.get('type')),
            strength: asStrength(fields.get('strength')),
          });
          break;
        }
        case 'marriage':
        case 'divorce':
        case 'cohabit': {
          const parts = stmt.args.split(/\s+/).filter(Boolean);
          if (parts.length < 2) {
            errors.push({ line: stmt.line, message: `${stmt.keyword} 需 2 個人物 ID` });
            break;
          }
          ast.marital.push({ kind: stmt.keyword, a: parts[0], b: parts[1] });
          break;
        }
        case 'children': {
          const kv = parseInlineKv(stmt.args);
          const parents = kv.get('parents');
          const kids = kv.get('kids');
          if (!Array.isArray(parents) || !Array.isArray(kids)) {
            errors.push({ line: stmt.line, message: 'children 語法錯誤' });
            break;
          }
          if (parents.length === 0 || kids.length === 0) {
            errors.push({ line: stmt.line, message: 'children parents/kids 不可為空' });
            break;
          }
          const p: [string, string] | [string] =
            parents.length >= 2
              ? [parents[0], parents[1]]
              : [parents[0]];
          ast.children.push({ parents: p, kids });
          break;
        }
        case 'household': {
          const list = parseList(stmt.args, 0);
          if (!list) {
            errors.push({ line: stmt.line, message: 'household 需 [P1, P2, ...]' });
            break;
          }
          ast.households.push({ members: list.items });
          break;
        }
        case 'nearby_household': {
          const a = parseList(stmt.args, 0);
          if (!a) {
            errors.push({ line: stmt.line, message: 'nearby_household 語法錯誤' });
            break;
          }
          const b = parseList(stmt.args, a.next);
          if (!b) {
            errors.push({ line: stmt.line, message: 'nearby_household 需兩組 [..]' });
            break;
          }
          ast.nearbyHouseholds.push({ a: a.items, b: b.items });
          break;
        }
        case 'caregiver': {
          const kv = parseInlineKv(stmt.args);
          const from = kv.get('from');
          const to = kv.get('to');
          if (typeof from !== 'string' || typeof to !== 'string') {
            errors.push({ line: stmt.line, message: 'caregiver 需 from: 與 to:' });
            break;
          }
          ast.caregivers.push({
            from,
            to,
            burden: asBurden(typeof kv.get('burden') === 'string' ? (kv.get('burden') as string) : undefined),
          });
          const p = ast.people.get(from);
          if (p) p.isCaregiver = true;
          break;
        }
        case 'primary_contact': {
          const id = stmt.args.trim();
          if (!id) {
            errors.push({ line: stmt.line, message: 'primary_contact 需指定 ID' });
            break;
          }
          ast.primaryContact = id;
          const p = ast.people.get(id);
          if (p) p.isPrimaryContact = true;
          break;
        }
        case 'miscarriage': {
          const kv = parseInlineKv(stmt.args);
          const parents = kv.get('parents');
          if (!Array.isArray(parents) || parents.length < 2) {
            errors.push({ line: stmt.line, message: 'miscarriage 需 parents: [P1, P2]' });
            break;
          }
          const year =
            typeof kv.get('year') === 'string' ? asNumber(kv.get('year') as string) : undefined;
          ast.miscarriages.push({ parents: [parents[0], parents[1]], year });
          break;
        }
        case 'stillbirth': {
          const kv = parseInlineKv(stmt.args);
          const parents = kv.get('parents');
          if (!Array.isArray(parents) || parents.length < 2) {
            errors.push({ line: stmt.line, message: 'stillbirth 需 parents: [P1, P2]' });
            break;
          }
          const year =
            typeof kv.get('year') === 'string' ? asNumber(kv.get('year') as string) : undefined;
          ast.stillbirths.push({ parents: [parents[0], parents[1]], year });
          break;
        }
        case 'ecomap_link': {
          const kv = parseInlineKv(stmt.args);
          const person = kv.get('person');
          const resource = kv.get('resource');
          if (typeof person !== 'string' || typeof resource !== 'string') {
            errors.push({ line: stmt.line, message: 'ecomap_link 需 person 與 resource' });
            break;
          }
          ast.ecomap.push({
            person,
            resource,
            strength: asStrength(typeof kv.get('strength') === 'string' ? (kv.get('strength') as string) : undefined),
            direction: asDirection(typeof kv.get('direction') === 'string' ? (kv.get('direction') as string) : undefined),
          });
          break;
        }
        case 'support_level': {
          const kv = parseInlineKv(stmt.args);
          const fam = kv.get('family');
          if (typeof fam === 'string') ast.family.supportLevel = asSupportLevel(fam);
          break;
        }
        case 'economic_status': {
          const kv = parseInlineKv(stmt.args);
          const fam = kv.get('family');
          if (typeof fam === 'string') ast.family.economicStatus = asEconomicStatus(fam);
          break;
        }
        default:
          if (stmt.keyword.length > 0) {
            errors.push({
              line: stmt.line,
              message: `未知關鍵字: ${stmt.keyword}`,
            });
          }
      }
    } catch (e) {
      errors.push({
        line: stmt.line,
        message: `parse error: ${(e as Error).message}`,
      });
    }
  }

  // Fallback: if no explicit case marked, the first person with role=案主 already
  // becomes the case via the loop. If still none, the first person becomes the case.
  if (!caseAssigned && ast.people.size > 0) {
    const first = ast.people.values().next().value;
    if (first) first.isCase = true;
  }

  return ast;
}
