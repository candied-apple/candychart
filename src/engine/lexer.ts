export type TokenType =
  | "NUMBER"
  | "STRING"
  | "BOOLEAN"
  | "NULL"
  | "UNDEFINED"
  | "IDENT"
  | "KEYWORD"
  | "OP"
  | "PAREN_OPEN"
  | "PAREN_CLOSE"
  | "BRACKET_OPEN"
  | "BRACKET_CLOSE"
  | "COMMA"
  | "DOT"
  | "SEMI"
  | "NEWLINE"
  | "QUESTION"
  | "COLON"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

export class SyntaxParseError extends Error {
  constructor(message: string, public pos?: number) {
    super(message);
    this.name = "SyntaxParseError";
  }
}

const KEYWORDS = new Set(["let", "const", "var"]);

const THREE_CHAR_OPS = new Set(["===", "!=="]);
const TWO_CHAR_OPS = new Set([
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "++",
  "--",
  "**",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
]);
const ONE_CHAR_OPS = new Set(["+", "-", "*", "/", "%", "=", "<", ">", "!"]);

function isIdentStart(ch: string): boolean {
  return ch === "_" || ch === "$" || /\p{L}/u.test(ch);
}

function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || /\p{N}/u.test(ch);
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i]!;

    // Spaces / tabs / CR
    if (ch === " " || ch === "\t" || ch === "\r") {
      i++;
      continue;
    }

    // Newlines act as potential statement separators
    if (ch === "\n") {
      tokens.push({ type: "NEWLINE", value: "\n", pos: i });
      i++;
      continue;
    }

    // Line comments // ...
    if (ch === "/" && input[i + 1] === "/") {
      while (i < len && input[i] !== "\n") {
        i++;
      }
      continue;
    }

    // String literal
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = i;
      i++;
      let str = "";
      let closed = false;
      while (i < len) {
        const cur = input[i]!;
        if (cur === "\\") {
          i++;
          if (i >= len) {
            throw new SyntaxParseError("Kapanmamış metin (string) kaçış karakteri.", start);
          }
          const esc = input[i]!;
          switch (esc) {
            case "n":
              str += "\n";
              break;
            case "t":
              str += "\t";
              break;
            case "r":
              str += "\r";
              break;
            case "\\":
              str += "\\";
              break;
            case '"':
              str += '"';
              break;
            case "'":
              str += "'";
              break;
            default:
              str += esc;
          }
          i++;
          continue;
        }
        if (cur === quote) {
          closed = true;
          i++;
          break;
        }
        str += cur;
        i++;
      }
      if (!closed) {
        throw new SyntaxParseError(
          `Kapanmamış metin sabiti (${quote}). Tırnak işaretini kapatın.`,
          start,
        );
      }
      tokens.push({ type: "STRING", value: str, pos: start });
      continue;
    }

    // Number literal (e.g. 42, 3.14, .5, 1e4)
    if (isDigit(ch) || (ch === "." && i + 1 < len && isDigit(input[i + 1]!))) {
      const start = i;
      let numStr = "";
      let hasDot = false;
      while (i < len) {
        const c = input[i]!;
        if (isDigit(c)) {
          numStr += c;
          i++;
        } else if (c === "_" && i + 1 < len && isDigit(input[i + 1]!)) {
          i++;
        } else if (c === "." && !hasDot && (i + 1 >= len || input[i + 1] !== ".")) {
          hasDot = true;
          numStr += c;
          i++;
        } else {
          break;
        }
      }
      // Scientific notation
      if (i < len && (input[i] === "e" || input[i] === "E")) {
        const expPos = i;
        let expStr = input[i]!;
        i++;
        if (i < len && (input[i] === "+" || input[i] === "-")) {
          expStr += input[i]!;
          i++;
        }
        let expDigits = "";
        while (i < len && isDigit(input[i]!)) {
          expDigits += input[i]!;
          i++;
        }
        if (expDigits.length === 0) {
          throw new SyntaxParseError("Geçersiz bilimsel sayı formatı.", expPos);
        }
        numStr += expStr + expDigits;
      }
      tokens.push({ type: "NUMBER", value: numStr, pos: start });
      continue;
    }

    // Identifiers and keywords
    if (isIdentStart(ch)) {
      const start = i;
      let ident = ch;
      i++;
      while (i < len && isIdentPart(input[i]!)) {
        ident += input[i]!;
        i++;
      }
      if (ident === "true" || ident === "false") {
        tokens.push({ type: "BOOLEAN", value: ident, pos: start });
      } else if (ident === "null") {
        tokens.push({ type: "NULL", value: ident, pos: start });
      } else if (ident === "undefined") {
        tokens.push({ type: "UNDEFINED", value: ident, pos: start });
      } else if (KEYWORDS.has(ident)) {
        tokens.push({ type: "KEYWORD", value: ident, pos: start });
      } else {
        tokens.push({ type: "IDENT", value: ident, pos: start });
      }
      continue;
    }

    // Multi-char operators
    const three = input.slice(i, i + 3);
    if (THREE_CHAR_OPS.has(three)) {
      tokens.push({ type: "OP", value: three, pos: i });
      i += 3;
      continue;
    }

    const two = input.slice(i, i + 2);
    if (TWO_CHAR_OPS.has(two)) {
      tokens.push({ type: "OP", value: two, pos: i });
      i += 2;
      continue;
    }

    if (ONE_CHAR_OPS.has(ch)) {
      tokens.push({ type: "OP", value: ch, pos: i });
      i++;
      continue;
    }

    // Punctuation
    switch (ch) {
      case "(":
        tokens.push({ type: "PAREN_OPEN", value: ch, pos: i });
        i++;
        break;
      case ")":
        tokens.push({ type: "PAREN_CLOSE", value: ch, pos: i });
        i++;
        break;
      case "[":
        tokens.push({ type: "BRACKET_OPEN", value: ch, pos: i });
        i++;
        break;
      case "]":
        tokens.push({ type: "BRACKET_CLOSE", value: ch, pos: i });
        i++;
        break;
      case ",":
        tokens.push({ type: "COMMA", value: ch, pos: i });
        i++;
        break;
      case ".":
        tokens.push({ type: "DOT", value: ch, pos: i });
        i++;
        break;
      case ";":
        tokens.push({ type: "SEMI", value: ch, pos: i });
        i++;
        break;
      case "?":
        tokens.push({ type: "QUESTION", value: ch, pos: i });
        i++;
        break;
      case ":":
        tokens.push({ type: "COLON", value: ch, pos: i });
        i++;
        break;
      case "&":
        throw new SyntaxParseError("Tek '&' yerine mantıksal VE için '&&' kullanın.", i);
      case "|":
        throw new SyntaxParseError("Tek '|' yerine mantıksal VEYA için '||' kullanın.", i);
      default:
        throw new SyntaxParseError(`Beklenmeyen karakter: '${ch}'`, i);
    }
  }

  tokens.push({ type: "EOF", value: "", pos: i });
  return tokens;
}
