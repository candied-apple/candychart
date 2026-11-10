import { SyntaxParseError, tokenize, type Token } from "./lexer";

export type LiteralValue = number | string | boolean | null | undefined;

export type ExprNode =
  | { kind: "literal"; value: LiteralValue }
  | { kind: "identifier"; name: string }
  | { kind: "array"; elements: ExprNode[] }
  | { kind: "unary"; op: "-" | "+" | "!"; argument: ExprNode }
  | { kind: "update"; op: "++" | "--"; prefix: boolean; target: LValueNode }
  | { kind: "binary"; op: string; left: ExprNode; right: ExprNode }
  | { kind: "ternary"; test: ExprNode; consequent: ExprNode; alternate: ExprNode }
  | { kind: "member"; object: ExprNode; property: string }
  | { kind: "index"; object: ExprNode; index: ExprNode }
  | { kind: "call"; callee: ExprNode; args: ExprNode[] };

export type LValueNode =
  | { kind: "identifier"; name: string }
  | { kind: "index"; object: ExprNode; index: ExprNode };

export type StmtNode =
  | { kind: "assign"; op: "=" | "+=" | "-=" | "*=" | "/=" | "%="; target: LValueNode; value: ExprNode }
  | { kind: "expr"; expr: ExprNode };

export interface ParsedForHeader {
  init: StmtNode[];
  condition: ExprNode | null;
  update: StmtNode[];
}

const ASSIGN_OPS = new Set(["=", "+=", "-=", "*=", "/=", "%="]);

class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  private peek(offset = 0): Token {
    return this.tokens[this.pos + offset] ?? this.tokens[this.tokens.length - 1]!;
  }

  private advance(): Token {
    const tok = this.peek();
    if (tok.type !== "EOF") {
      this.pos++;
    }
    return tok;
  }

  private skipSeparators(): void {
    while (this.peek().type === "NEWLINE" || this.peek().type === "SEMI") {
      this.advance();
    }
  }

  private skipNewlines(): void {
    while (this.peek().type === "NEWLINE") {
      this.advance();
    }
  }

  private expect(type: Token["type"], msg: string): Token {
    const tok = this.peek();
    if (tok.type !== type) {
      throw new SyntaxParseError(msg, tok.pos);
    }
    return this.advance();
  }

  parseSingleExpr(forbidAssignment = false): ExprNode {
    this.skipNewlines();
    if (this.peek().type === "EOF") {
      throw new SyntaxParseError("İfade boş olamaz.", this.peek().pos);
    }
    if (forbidAssignment && this.looksLikeAssignment()) {
      throw new SyntaxParseError(
        "Koşul ifadesinde atama '=' kullanılamaz. Karşılaştırma için '==' kullanın (örnek: x == 5).",
        this.peek().pos,
      );
    }
    const expr = this.parseTernary();
    this.skipNewlines();
    if (this.peek().type === "OP" && ASSIGN_OPS.has(this.peek().value)) {
      if (forbidAssignment) {
        throw new SyntaxParseError(
          "Koşul ifadesinde atama '=' kullanılamaz. Karşılaştırma için '==' kullanın.",
          this.peek().pos,
        );
      }
      throw new SyntaxParseError(
        `Beklenmeyen '${this.peek().value}' operatörü.`,
        this.peek().pos,
      );
    }
    if (this.peek().type !== "EOF") {
      throw new SyntaxParseError(
        `Beklenmeyen ifade sonu: '${this.peek().value || this.peek().type}'`,
        this.peek().pos,
      );
    }
    return expr;
  }

  parseArgListExprs(): ExprNode[] {
    this.skipNewlines();
    if (this.peek().type === "EOF") {
      throw new SyntaxParseError("Çıktı ifadesi boş olamaz.", this.peek().pos);
    }
    const items: ExprNode[] = [];
    items.push(this.parseTernary());
    while (this.peek().type === "COMMA") {
      this.advance();
      this.skipNewlines();
      items.push(this.parseTernary());
    }
    this.skipNewlines();
    if (this.peek().type !== "EOF") {
      throw new SyntaxParseError(
        `Çıktı ifadesinde beklenmeyen karakter: '${this.peek().value}'`,
        this.peek().pos,
      );
    }
    return items;
  }

  parseStatementBlock(allowCommaSeparator = false): StmtNode[] {
    const stmts: StmtNode[] = [];
    this.skipSeparators();

    while (this.peek().type !== "EOF") {
      stmts.push(this.parseStatement());

      const next = this.peek();
      if (next.type === "EOF") break;
      if (next.type === "NEWLINE" || next.type === "SEMI") {
        this.skipSeparators();
        continue;
      }
      if (allowCommaSeparator && next.type === "COMMA") {
        this.advance();
        this.skipNewlines();
        if (this.peek().type === "EOF") {
          throw new SyntaxParseError("Virgül sonrası eksik ifade.", next.pos);
        }
        continue;
      }
      throw new SyntaxParseError(
        `Beklenmeyen token '${next.value}'. Birden fazla işlem için yeni satır veya ';' kullanın.`,
        next.pos,
      );
    }

    return stmts;
  }

  private looksLikeAssignment(): boolean {
    const first = this.peek();
    if (first.type === "KEYWORD") return true;
    return false;
  }

  private parseStatement(): StmtNode {
    // Optional let / const / var
    let hasDeclKeyword = false;
    if (this.peek().type === "KEYWORD") {
      hasDeclKeyword = true;
      this.advance();
      if (this.peek().type !== "IDENT") {
        throw new SyntaxParseError(
          `Değişken adı bekleniyor, ancak '${this.peek().value || "EOF"}' bulundu.`,
          this.peek().pos,
        );
      }
    }

    const expr = this.parseTernary();

    const opTok = this.peek();
    if (opTok.type === "OP" && ASSIGN_OPS.has(opTok.value)) {
      const lvalue = toLValue(expr, opTok.pos);
      if (hasDeclKeyword && lvalue.kind !== "identifier") {
        throw new SyntaxParseError("Değişken tanımlamasında indeks ataması yapılamaz.", opTok.pos);
      }
      this.advance();
      this.skipNewlines();
      if (
        this.peek().type === "EOF" ||
        this.peek().type === "NEWLINE" ||
        this.peek().type === "SEMI"
      ) {
        throw new SyntaxParseError(`'${opTok.value}' sonrasında değer/ifade eksik.`, opTok.pos);
      }
      const value = this.parseTernary();
      return {
        kind: "assign",
        op: opTok.value as "=" | "+=" | "-=" | "*=" | "/=" | "%=",
        target: lvalue,
        value,
      };
    }

    if (hasDeclKeyword) {
      throw new SyntaxParseError(
        "Değişken tanımlamasından sonra '=' ile başlangıç değeri verilmelidir (örnek: x = 0).",
        opTok.pos,
      );
    }

    // Disallow meaningless standalone comparisons like `x == 5` in Process
    if (
      expr.kind === "binary" &&
      ["==", "!=", "===", "!==", "<", "<=", ">", ">="].includes(expr.op)
    ) {
      throw new SyntaxParseError(
        `İşlem kutusunda '${expr.op}' karşılaştırması bir değişkene atanmıyor. Değer atamak için '=' kullanın veya Karar (Elmas) düğümü ekleyin.`,
      );
    }

    if (expr.kind !== "update" && expr.kind !== "call") {
      throw new SyntaxParseError(
        "İşlem kutusunda geçerli bir atama (örnek: x = x + 1) veya artış/azalış (i++) yazılmalıdır.",
      );
    }

    return { kind: "expr", expr };
  }

  private parseTernary(): ExprNode {
    const test = this.parseOr();
    if (this.peek().type === "QUESTION") {
      this.advance();
      const consequent = this.parseTernary();
      this.expect("COLON", "Üçlü operatörde (?:) ':' bekleniyor.");
      const alternate = this.parseTernary();
      return { kind: "ternary", test, consequent, alternate };
    }
    return test;
  }

  private parseOr(): ExprNode {
    let left = this.parseAnd();
    while (this.peek().type === "OP" && this.peek().value === "||") {
      const op = this.advance().value;
      const right = this.parseAnd();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseAnd(): ExprNode {
    let left = this.parseEquality();
    while (this.peek().type === "OP" && this.peek().value === "&&") {
      const op = this.advance().value;
      const right = this.parseEquality();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseEquality(): ExprNode {
    let left = this.parseRelational();
    while (
      this.peek().type === "OP" &&
      (this.peek().value === "==" ||
        this.peek().value === "!=" ||
        this.peek().value === "===" ||
        this.peek().value === "!==")
    ) {
      const op = this.advance().value;
      const right = this.parseRelational();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseRelational(): ExprNode {
    let left = this.parseAdditive();
    while (
      this.peek().type === "OP" &&
      (this.peek().value === "<" ||
        this.peek().value === "<=" ||
        this.peek().value === ">" ||
        this.peek().value === ">=")
    ) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseAdditive(): ExprNode {
    let left = this.parseMultiplicative();
    while (
      this.peek().type === "OP" &&
      (this.peek().value === "+" || this.peek().value === "-")
    ) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseMultiplicative(): ExprNode {
    let left = this.parsePower();
    while (
      this.peek().type === "OP" &&
      (this.peek().value === "*" || this.peek().value === "/" || this.peek().value === "%")
    ) {
      const op = this.advance().value;
      const right = this.parsePower();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parsePower(): ExprNode {
    const left = this.parseUnary();
    if (this.peek().type === "OP" && this.peek().value === "**") {
      const op = this.advance().value;
      const right = this.parsePower();
      return { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseUnary(): ExprNode {
    const tok = this.peek();
    if (tok.type === "OP" && (tok.value === "-" || tok.value === "+" || tok.value === "!")) {
      this.advance();
      const argument = this.parseUnary();
      return { kind: "unary", op: tok.value, argument };
    }
    if (tok.type === "OP" && (tok.value === "++" || tok.value === "--")) {
      this.advance();
      const operand = this.parsePostfix();
      const target = toLValue(operand, tok.pos);
      return { kind: "update", op: tok.value, prefix: true, target };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): ExprNode {
    let expr = this.parsePrimary();

    while (true) {
      const tok = this.peek();
      if (tok.type === "DOT") {
        this.advance();
        const prop = this.expect("IDENT", "'.' sonrasında özellik adı bekleniyor.");
        expr = { kind: "member", object: expr, property: prop.value };
        continue;
      }
      if (tok.type === "BRACKET_OPEN") {
        this.advance();
        const index = this.parseTernary();
        this.expect("BRACKET_CLOSE", "Kapanmamış köşeli parantez ']'.");
        expr = { kind: "index", object: expr, index };
        continue;
      }
      if (tok.type === "PAREN_OPEN") {
        this.advance();
        const args: ExprNode[] = [];
        if (this.peek().type !== "PAREN_CLOSE") {
          args.push(this.parseTernary());
          while (this.peek().type === "COMMA") {
            this.advance();
            args.push(this.parseTernary());
          }
        }
        this.expect("PAREN_CLOSE", "Kapanmamış fonksiyon parantezi ')'.");
        expr = { kind: "call", callee: expr, args };
        continue;
      }
      if (tok.type === "OP" && (tok.value === "++" || tok.value === "--")) {
        this.advance();
        const target = toLValue(expr, tok.pos);
        expr = { kind: "update", op: tok.value, prefix: false, target };
        continue;
      }
      break;
    }

    return expr;
  }

  private parsePrimary(): ExprNode {
    const tok = this.peek();

    switch (tok.type) {
      case "NUMBER":
        this.advance();
        return { kind: "literal", value: Number(tok.value) };
      case "STRING":
        this.advance();
        return { kind: "literal", value: tok.value };
      case "BOOLEAN":
        this.advance();
        return { kind: "literal", value: tok.value === "true" };
      case "NULL":
        this.advance();
        return { kind: "literal", value: null };
      case "UNDEFINED":
        this.advance();
        return { kind: "literal", value: undefined };
      case "IDENT":
        this.advance();
        return { kind: "identifier", name: tok.value };
      case "PAREN_OPEN": {
        this.advance();
        const inner = this.parseTernary();
        this.expect("PAREN_CLOSE", "Kapanmamış parantez ')'.");
        return inner;
      }
      case "BRACKET_OPEN": {
        this.advance();
        const elements: ExprNode[] = [];
        if (this.peek().type !== "BRACKET_CLOSE") {
          elements.push(this.parseTernary());
          while (this.peek().type === "COMMA") {
            this.advance();
            if (this.peek().type === "BRACKET_CLOSE") break;
            elements.push(this.parseTernary());
          }
        }
        this.expect("BRACKET_CLOSE", "Kapanmamış dizi parantezi ']'.");
        return { kind: "array", elements };
      }
      default:
        throw new SyntaxParseError(
          `Beklenmeyen ifade: '${tok.value || "satır sonu"}'`,
          tok.pos,
        );
    }
  }
}

function toLValue(expr: ExprNode, pos?: number): LValueNode {
  if (expr.kind === "identifier") {
    return expr;
  }
  if (expr.kind === "index") {
    return expr;
  }
  throw new SyntaxParseError("Atama hedefi yalnızca bir değişken veya dizi elemanı olabilir.", pos);
}

function stripOptionalIfWrapper(raw: string): string {
  const s = raw.trim();
  const match = /^if\s*\(/i.exec(s);
  if (!match) return raw;
  const openIdx = match[0].length - 1;
  let depth = 0;
  let quote: '"' | "'" | null = null;
  for (let i = openIdx; i < s.length; i++) {
    const ch = s[i]!;
    if (quote) {
      if (ch === "\\" && i + 1 < s.length) {
        i++;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) {
        return i === s.length - 1 ? s.slice(openIdx + 1, i) : raw;
      }
    }
  }
  return raw;
}

export function parseExpression(raw: string, options?: { forbidAssignment?: boolean }): ExprNode {
  const cleaned = stripOptionalIfWrapper(raw);
  const tokens = tokenize(cleaned);
  const parser = new Parser(tokens);
  return parser.parseSingleExpr(options?.forbidAssignment ?? false);
}

export function parseOutputArgs(raw: string): ExprNode[] {
  const tokens = tokenize(raw);
  const parser = new Parser(tokens);
  return parser.parseArgListExprs();
}

export function parseStatements(
  raw: string,
  options?: { allowCommaSeparator?: boolean },
): StmtNode[] {
  const tokens = tokenize(raw);
  const parser = new Parser(tokens);
  return parser.parseStatementBlock(options?.allowCommaSeparator ?? false);
}

function stripOuterForBrackets(raw: string): string {
  let s = raw.trim();
  if (/^for\b/i.test(s)) {
    s = s.slice(3).trim();
  }
  if (
    (s.startsWith("[") && s.endsWith("]")) ||
    (s.startsWith("(") && s.endsWith(")"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function splitTopLevelSemicolons(raw: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let parenDepth = 0;
  let bracketDepth = 0;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (quote) {
      current += ch;
      if (ch === "\\" && i + 1 < raw.length) {
        current += raw[++i]!;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "(") parenDepth++;
    else if (ch === ")") parenDepth = Math.max(0, parenDepth - 1);
    else if (ch === "[") bracketDepth++;
    else if (ch === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    else if (ch === ";" && parenDepth === 0 && bracketDepth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  parts.push(current.trim());
  return parts;
}

export function parseForHeader(raw: string): ParsedForHeader {
  const inner = stripOuterForBrackets(raw);
  if (!inner) {
    throw new SyntaxParseError(
      "For döngüsü ifadesi boş olamaz. Örnek: i=1; i<n; i++",
    );
  }

  const parts = splitTopLevelSemicolons(inner);
  if (parts.length !== 3) {
    throw new SyntaxParseError(
      "For döngüsü ';' ile ayrılmış 3 bölümden oluşmalıdır: [ başlangıç; koşul; artış ] (örnek: i=1; i<n; i++).",
    );
  }

  const [initRaw, condRaw, updateRaw] = parts as [string, string, string];
  const init = initRaw ? parseStatements(initRaw, { allowCommaSeparator: true }) : [];
  const condition = condRaw
    ? parseExpression(condRaw, { forbidAssignment: true })
    : null;
  const update = updateRaw ? parseStatements(updateRaw, { allowCommaSeparator: true }) : [];

  return { init, condition, update };
}

export function parseInputVarNames(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new SyntaxParseError("Input düğümü için en az bir değişken adı girin (örnek: n).");
  }
  const parts = trimmed.split(",").map((p) => p.trim());
  const names: string[] = [];
  for (const part of parts) {
    if (!part) {
      throw new SyntaxParseError("Değişken listesinde boş öğe var (örnek: a, b).");
    }
    const tokens = tokenize(part);
    if (tokens.length !== 2 || tokens[0]?.type !== "IDENT" || tokens[1]?.type !== "EOF") {
      throw new SyntaxParseError(
        `Geçersiz değişken adı: '${part}'. Yalnızca harf/rakam ve '_' kullanın (örnek: sayi1).`,
      );
    }
    names.push(tokens[0].value);
  }
  return names;
}
