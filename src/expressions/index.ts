/** The grammar and behavior are specified in specs/expressions.md. No dynamic execution. */
export type Value = null | boolean | number | string | Value[];
export type Environment = Readonly<Record<string, Value>>;
type Comparison = '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'contains';
export type Expression =
  | { kind: 'literal'; value: Value }
  | { kind: 'identifier'; name: string }
  | { kind: 'list'; items: Expression[] }
  | { kind: 'not'; operand: Expression }
  | { kind: 'and' | 'or'; left: Expression; right: Expression }
  | { kind: 'comparison'; operator: Comparison; left: Expression; right: Expression };

export class ExprError extends Error {
  override name = 'ExprError';
}

type Token = { kind: 'number' | 'string' | 'identifier' | 'keyword' | 'operator'; value: string };
const keywords = new Set(['and', 'or', 'not', 'in', 'contains', 'true', 'false', 'otherwise']);
const comparisons = new Set<string>(['==', '!=', '<', '<=', '>', '>=', 'in', 'contains']);

function tokenize(source: string): Token[] {
  const pattern = /\s*(?:(\d+(?:\.\d+)?)|('[^']*')|(==|!=|>=|<=|>|<|\(|\)|\[|\]|,)|([A-Za-z_][A-Za-z0-9_.]*))/y;
  const result: Token[] = [];
  const text = source.trimEnd();
  let position = 0;
  while (position < text.length) {
    pattern.lastIndex = position;
    const match = pattern.exec(text);
    if (!match) throw new ExprError(`Unexpected character at position ${position}`);
    position = pattern.lastIndex;
    if (match[1] !== undefined) result.push({ kind: 'number', value: match[1] });
    else if (match[2] !== undefined) result.push({ kind: 'string', value: match[2].slice(1, -1) });
    else if (match[3] !== undefined) result.push({ kind: 'operator', value: match[3] });
    else if (match[4] !== undefined) {
      result.push({ kind: keywords.has(match[4]) ? 'keyword' : 'identifier', value: match[4] });
    }
  }
  return result;
}

class Parser {
  private position = 0;
  constructor(private readonly tokens: Token[]) {}

  private peek(): Token | undefined { return this.tokens[this.position]; }
  private accept(value: string): boolean {
    const token = this.peek();
    if (token && (token.kind === 'keyword' || token.kind === 'operator') && token.value === value) {
      this.position++;
      return true;
    }
    return false;
  }
  private require(value: string): void {
    if (!this.accept(value)) throw new ExprError(`Expected ${value} at token ${this.position}`);
  }

  parse(): Expression {
    const result = this.or();
    if (this.peek()) throw new ExprError(`Unexpected trailing input at token ${this.position}`);
    return result;
  }
  private or(): Expression {
    let node = this.and();
    while (this.accept('or')) node = { kind: 'or', left: node, right: this.and() };
    return node;
  }
  private and(): Expression {
    let node = this.not();
    while (this.accept('and')) node = { kind: 'and', left: node, right: this.not() };
    return node;
  }
  private not(): Expression {
    return this.accept('not') ? { kind: 'not', operand: this.not() } : this.comparison();
  }
  private comparison(): Expression {
    const left = this.atom();
    const token = this.peek();
    if (token && (token.kind === 'keyword' || token.kind === 'operator') && comparisons.has(token.value)) {
      this.position++;
      return { kind: 'comparison', operator: token.value as Comparison, left, right: this.atom() };
    }
    return left;
  }
  private atom(): Expression {
    const token = this.peek();
    if (!token) throw new ExprError(`Expected an atom at token ${this.position}`);
    if (token.kind === 'number' || token.kind === 'string' || token.kind === 'identifier') {
      this.position++;
      if (token.kind === 'number') return { kind: 'literal', value: Number(token.value) };
      if (token.kind === 'string') return { kind: 'literal', value: token.value };
      return { kind: 'identifier', name: token.value };
    }
    if (this.accept('true') || this.accept('otherwise')) return { kind: 'literal', value: true };
    if (this.accept('false')) return { kind: 'literal', value: false };
    if (this.accept('(')) {
      const result = this.or();
      this.require(')');
      return result;
    }
    if (this.accept('[')) {
      const items = [this.atom()];
      while (this.accept(',')) items.push(this.atom());
      this.require(']');
      return { kind: 'list', items };
    }
    throw new ExprError(`Expected an atom at token ${this.position}`);
  }
}

export function parse(source: string): Expression {
  if (typeof source !== 'string' || !source.trim()) throw new ExprError('Empty expression');
  return new Parser(tokenize(source)).parse();
}

export function identifiers(node: Expression): Set<string> {
  switch (node.kind) {
    case 'identifier': return new Set([node.name]);
    case 'literal': return new Set();
    case 'list': return new Set(node.items.flatMap((item) => [...identifiers(item)]));
    case 'not': return identifiers(node.operand);
    default: return new Set([...identifiers(node.left), ...identifiers(node.right)]);
  }
}

function truthy(value: Value): boolean {
  if (value === null) return false;
  if (typeof value === 'string') return value.length > 0 && value !== 'false';
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return value !== 0;
  return value;
}

function equal(left: Value, right: Value): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => equal(item, right[index] ?? null));
  }
  if ((typeof left === 'boolean' || typeof left === 'number') &&
      (typeof right === 'boolean' || typeof right === 'number')) return Number(left) === Number(right);
  return left === right;
}

function contains(container: Value, item: Value): boolean {
  if (Array.isArray(container)) return container.some((entry) => equal(entry, item));
  if (typeof container === 'string' && typeof item === 'string') return container.includes(item);
  throw new ExprError('Membership requires a list or compatible text');
}

function compare(operator: Comparison, left: Value, right: Value): boolean {
  // Unanswered operands never trigger a comparison, including inequality and membership.
  if (left === null || right === null) return false;
  switch (operator) {
    case '==': return equal(left, right);
    case '!=': return !equal(left, right);
    case 'in': return contains(right, left);
    case 'contains': return contains(left, right);
  }
  let order: number;
  if ((typeof left === 'number' || typeof left === 'boolean') &&
      (typeof right === 'number' || typeof right === 'boolean')) {
    if (Number.isNaN(Number(left)) || Number.isNaN(Number(right))) return false;
    order = Number(left) === Number(right) ? 0 : Number(left) < Number(right) ? -1 : 1;
  } else if (Array.isArray(left) && Array.isArray(right)) {
    const sharedLength = Math.min(left.length, right.length);
    for (let index = 0; index < sharedLength; index++) {
      const a = left[index] ?? null;
      const b = right[index] ?? null;
      if (!equal(a, b)) return compare(operator, a, b);
    }
    order = Math.sign(left.length - right.length);
  } else if (typeof left === 'string' && typeof right === 'string') {
    // Python orders Unicode code points, rather than JavaScript's UTF-16 code units.
    const a = [...left].map((character) => character.codePointAt(0) ?? 0);
    const b = [...right].map((character) => character.codePointAt(0) ?? 0);
    const index = a.findIndex((value, i) => b[i] !== value);
    order = index === -1 ? Math.sign(a.length - b.length)
      : b[index] === undefined ? 1 : Math.sign((a[index] ?? 0) - (b[index] ?? 0));
  } else return false;
  return operator === '<' ? order < 0 : operator === '<=' ? order <= 0
    : operator === '>' ? order > 0 : order >= 0;
}

export function evaluate(node: Expression, environment: Environment): Value {
  switch (node.kind) {
    case 'literal': return node.value;
    case 'identifier': return Object.hasOwn(environment, node.name) ? environment[node.name] ?? null : null;
    case 'list': return node.items.map((item) => evaluate(item, environment));
    case 'not': return !truthy(evaluate(node.operand, environment));
    case 'and': return truthy(evaluate(node.left, environment)) && truthy(evaluate(node.right, environment));
    case 'or': return truthy(evaluate(node.left, environment)) || truthy(evaluate(node.right, environment));
    case 'comparison': return compare(node.operator, evaluate(node.left, environment), evaluate(node.right, environment));
  }
}

export function check(source: string, environment: Environment): boolean {
  return truthy(evaluate(parse(source), environment));
}
