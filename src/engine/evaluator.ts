import type { RuntimeValue } from "../types/flowchart";
import type { ExprNode, LValueNode, StmtNode } from "./parser";

export class RuntimeEvalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeEvalError";
  }
}

type BuiltinFn = (...args: RuntimeValue[]) => RuntimeValue;

const MATH_NAMESPACE: Record<string, unknown> = {
  PI: Math.PI,
  E: Math.E,
  abs: (x: RuntimeValue) => Math.abs(asNumber(x, "Math.abs")),
  sqrt: (x: RuntimeValue) => {
    const n = asNumber(x, "Math.sqrt");
    if (n < 0) throw new RuntimeEvalError("Negatif sayının karekökü alınamaz.");
    return Math.sqrt(n);
  },
  floor: (x: RuntimeValue) => Math.floor(asNumber(x, "Math.floor")),
  ceil: (x: RuntimeValue) => Math.ceil(asNumber(x, "Math.ceil")),
  round: (x: RuntimeValue) => Math.round(asNumber(x, "Math.round")),
  pow: (a: RuntimeValue, b: RuntimeValue) =>
    Math.pow(asNumber(a, "Math.pow"), asNumber(b, "Math.pow")),
  min: (...args: RuntimeValue[]) => {
    if (args.length === 0) throw new RuntimeEvalError("min() en az bir argüman ister.");
    return Math.min(...args.map((a) => asNumber(a, "min")));
  },
  max: (...args: RuntimeValue[]) => {
    if (args.length === 0) throw new RuntimeEvalError("max() en az bir argüman ister.");
    return Math.max(...args.map((a) => asNumber(a, "max")));
  },
  random: () => Math.random(),
};

const BUILTIN_FUNCTIONS: Record<string, BuiltinFn> = {
  abs: MATH_NAMESPACE.abs as BuiltinFn,
  sqrt: MATH_NAMESPACE.sqrt as BuiltinFn,
  floor: MATH_NAMESPACE.floor as BuiltinFn,
  ceil: MATH_NAMESPACE.ceil as BuiltinFn,
  round: MATH_NAMESPACE.round as BuiltinFn,
  pow: MATH_NAMESPACE.pow as BuiltinFn,
  min: MATH_NAMESPACE.min as BuiltinFn,
  max: MATH_NAMESPACE.max as BuiltinFn,
  random: MATH_NAMESPACE.random as BuiltinFn,
  len: (x: RuntimeValue) => {
    if (typeof x === "string" || Array.isArray(x)) return x.length;
    throw new RuntimeEvalError("len() yalnızca metin veya dizi için kullanılabilir.");
  },
  Number: (x: RuntimeValue) => {
    const n = Number(x);
    if (!Number.isFinite(n)) {
      throw new RuntimeEvalError(`'${formatValue(x)}' sayıya dönüştürülemedi.`);
    }
    return n;
  },
  String: (x: RuntimeValue) => formatValue(x),
  Boolean: (x: RuntimeValue) => Boolean(x),
  parseInt: (x: RuntimeValue) => {
    const n = Number.parseInt(String(x), 10);
    if (Number.isNaN(n)) {
      throw new RuntimeEvalError(`'${formatValue(x)}' tam sayıya dönüştürülemedi.`);
    }
    return n;
  },
  parseFloat: (x: RuntimeValue) => {
    const n = Number.parseFloat(String(x));
    if (Number.isNaN(n)) {
      throw new RuntimeEvalError(`'${formatValue(x)}' ondalıklı sayıya dönüştürülemedi.`);
    }
    return n;
  },
};

function asNumber(val: RuntimeValue, context: string): number {
  if (typeof val === "number") {
    if (!Number.isFinite(val)) {
      throw new RuntimeEvalError(`Geçersiz sayısal sonuç (Infinity/NaN): ${context}`);
    }
    return val;
  }
  if (typeof val === "boolean") {
    return val ? 1 : 0;
  }
  throw new RuntimeEvalError(
    `Sayısal değer bekleniyordu (${context}), ancak '${formatValue(val)}' (${typeof val}) bulundu.`,
  );
}

export function formatValue(val: RuntimeValue): string {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) {
    return `[${val.map((item) => (typeof item === "string" ? `"${item}"` : formatValue(item))).join(", ")}]`;
  }
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

function getNumericLValue(
  target: LValueNode,
  env: Record<string, RuntimeValue>,
): number {
  if (target.kind === "identifier") {
    if (!(target.name in env)) {
      throw new RuntimeEvalError(
        `Tanımsız değişken: '${target.name}'. Kullanmadan önce değer atayın veya Input ile alın.`,
      );
    }
    return asNumber(env[target.name], target.name);
  }
  const obj = evalExpr(target.object, env);
  const idx = asNumber(evalExpr(target.index, env), "dizi indeksi");
  if (!Array.isArray(obj)) {
    throw new RuntimeEvalError("İndeks erişimi yalnızca dizilerde kullanılabilir.");
  }
  if (!Number.isInteger(idx) || idx < 0 || idx >= obj.length) {
    throw new RuntimeEvalError(`Dizi indeksi sınır dışında: ${idx}`);
  }
  return asNumber(obj[idx], `[${idx}]`);
}

function setLValue(
  target: LValueNode,
  value: RuntimeValue,
  env: Record<string, RuntimeValue>,
): void {
  if (target.kind === "identifier") {
    env[target.name] = value;
    return;
  }
  const obj = evalExpr(target.object, env);
  const idx = asNumber(evalExpr(target.index, env), "dizi indeksi");
  if (!Array.isArray(obj)) {
    throw new RuntimeEvalError("İndeks ataması yalnızca dizilerde kullanılabilir.");
  }
  if (!Number.isInteger(idx) || idx < 0) {
    throw new RuntimeEvalError(`Geçersiz dizi indeksi: ${idx}`);
  }
  obj[idx] = value;
}

export function evalExpr(expr: ExprNode, env: Record<string, RuntimeValue>): RuntimeValue {
  switch (expr.kind) {
    case "literal":
      return expr.value;

    case "identifier": {
      if (expr.name in env) {
        return env[expr.name];
      }
      if (expr.name === "Math") {
        return MATH_NAMESPACE as RuntimeValue;
      }
      throw new RuntimeEvalError(
        `Tanımsız değişken: '${expr.name}'. Kullanmadan önce değer atayın veya Input ile alın.`,
      );
    }

    case "array":
      return expr.elements.map((el) => evalExpr(el, env));

    case "unary": {
      const arg = evalExpr(expr.argument, env);
      if (expr.op === "-") return -asNumber(arg, "tekli '-'");
      if (expr.op === "+") return +asNumber(arg, "tekli '+'");
      return !arg;
    }

    case "update": {
      const current = getNumericLValue(expr.target, env);
      const next = expr.op === "++" ? current + 1 : current - 1;
      setLValue(expr.target, next, env);
      return expr.prefix ? next : current;
    }

    case "ternary": {
      const cond = evalExpr(expr.test, env);
      return cond ? evalExpr(expr.consequent, env) : evalExpr(expr.alternate, env);
    }

    case "binary": {
      if (expr.op === "&&") {
        const left = evalExpr(expr.left, env);
        return left ? evalExpr(expr.right, env) : left;
      }
      if (expr.op === "||") {
        const left = evalExpr(expr.left, env);
        return left ? left : evalExpr(expr.right, env);
      }

      const left = evalExpr(expr.left, env);
      const right = evalExpr(expr.right, env);

      switch (expr.op) {
        case "+": {
          if (typeof left === "string" || typeof right === "string") {
            return formatValue(left) + formatValue(right);
          }
          return asNumber(left, "'+'") + asNumber(right, "'+'");
        }
        case "-":
          return asNumber(left, "'-'") - asNumber(right, "'-'");
        case "*":
          return asNumber(left, "'*'") * asNumber(right, "'*'");
        case "/": {
          const r = asNumber(right, "'/'");
          if (r === 0) {
            throw new RuntimeEvalError("Sıfıra bölme hatası: Bölen değer 0 olamaz.");
          }
          return asNumber(left, "'/'") / r;
        }
        case "%": {
          const r = asNumber(right, "'%'");
          if (r === 0) {
            throw new RuntimeEvalError("Sıfıra göre mod hatası: Bölen değer 0 olamaz.");
          }
          return asNumber(left, "'%'") % r;
        }
        case "**": {
          const res = asNumber(left, "'**'") ** asNumber(right, "'**'");
          if (!Number.isFinite(res)) {
            throw new RuntimeEvalError("Üs alma işlemi geçersiz veya çok büyük bir sonuç üretti.");
          }
          return res;
        }
        case "<":
          if (typeof left === "string" && typeof right === "string") return left < right;
          return asNumber(left, "'<'") < asNumber(right, "'<'");
        case "<=":
          if (typeof left === "string" && typeof right === "string") return left <= right;
          return asNumber(left, "'<='") <= asNumber(right, "'<='");
        case ">":
          if (typeof left === "string" && typeof right === "string") return left > right;
          return asNumber(left, "'>'") > asNumber(right, "'>'");
        case ">=":
          if (typeof left === "string" && typeof right === "string") return left >= right;
          return asNumber(left, "'>='") >= asNumber(right, "'>='");
        case "==":
        case "===":
          return left === right;
        case "!=":
        case "!==":
          return left !== right;
        default:
          throw new RuntimeEvalError(`Desteklenmeyen operatör: ${expr.op}`);
      }
    }

    case "index": {
      const obj = evalExpr(expr.object, env);
      const idx = asNumber(evalExpr(expr.index, env), "indeks");
      if (Array.isArray(obj)) {
        if (!Number.isInteger(idx) || idx < 0 || idx >= obj.length) {
          throw new RuntimeEvalError(`Dizi indeksi sınır dışında: ${idx} (uzunluk: ${obj.length})`);
        }
        return obj[idx];
      }
      if (typeof obj === "string") {
        if (!Number.isInteger(idx) || idx < 0 || idx >= obj.length) {
          throw new RuntimeEvalError(`Metin indeksi sınır dışında: ${idx}`);
        }
        return obj[idx];
      }
      throw new RuntimeEvalError("İndeks erişimi yalnızca dizi veya metinlerde kullanılabilir.");
    }

    case "member": {
      if (expr.property === "__proto__" || expr.property === "constructor" || expr.property === "prototype") {
        throw new RuntimeEvalError(`Güvenlik: '${expr.property}' özelliğine erişilemez.`);
      }
      const obj = evalExpr(expr.object, env);
      if (obj === MATH_NAMESPACE) {
        if (expr.property in MATH_NAMESPACE) {
          return MATH_NAMESPACE[expr.property] as RuntimeValue;
        }
        throw new RuntimeEvalError(`Math.${expr.property} desteklenmiyor.`);
      }
      if (Array.isArray(obj)) {
        if (expr.property === "length") return obj.length;
        throw new RuntimeEvalError(`Dizilerde '.${expr.property}' özelliği bulunamadı.`);
      }
      if (typeof obj === "string") {
        if (expr.property === "length") return obj.length;
        throw new RuntimeEvalError(`Metinlerde '.${expr.property}' özelliği bulunamadı.`);
      }
      throw new RuntimeEvalError(`'.${expr.property}' özelliğine erişilemedi.`);
    }

    case "call": {
      const args = expr.args.map((a) => evalExpr(a, env));

      // Method calls like arr.push(x), arr.pop(), str.toUpperCase(), Math.sqrt(x)
      if (expr.callee.kind === "member") {
        const { object, property } = expr.callee;
        if (object.kind === "identifier" && object.name === "Math" && !(object.name in env)) {
          const fn = MATH_NAMESPACE[property];
          if (typeof fn === "function") {
            return (fn as BuiltinFn)(...args);
          }
          throw new RuntimeEvalError(`Math.${property} bir fonksiyon değil veya desteklenmiyor.`);
        }
        const target = evalExpr(object, env);
        if (Array.isArray(target)) {
          switch (property) {
            case "push":
              target.push(...args);
              return target.length;
            case "pop":
              return target.pop();
            case "includes":
              return target.includes(args[0]);
            case "join":
              return target.map((v) => formatValue(v)).join(args[0] !== undefined ? formatValue(args[0]) : ",");
            default:
              throw new RuntimeEvalError(`Dizi metodu '.${property}()' desteklenmiyor.`);
          }
        }
        if (typeof target === "string") {
          switch (property) {
            case "toUpperCase":
              return target.toUpperCase();
            case "toLowerCase":
              return target.toLowerCase();
            case "trim":
              return target.trim();
            case "includes":
              return target.includes(formatValue(args[0]));
            default:
              throw new RuntimeEvalError(`Metin metodu '.${property}()' desteklenmiyor.`);
          }
        }
        throw new RuntimeEvalError(`'.${property}()' çağrısı desteklenmiyor.`);
      }

      if (expr.callee.kind === "identifier") {
        if (expr.callee.name in env) {
          throw new RuntimeEvalError(`'${expr.callee.name}' bir fonksiyon değildir.`);
        }
        const builtin = BUILTIN_FUNCTIONS[expr.callee.name];
        if (builtin) {
          return builtin(...args);
        }
        throw new RuntimeEvalError(`Tanımsız fonksiyon: '${expr.callee.name}()'`);
      }

      throw new RuntimeEvalError("Geçersiz fonksiyon çağrısı.");
    }
  }
}

export function execStatements(
  stmts: StmtNode[],
  env: Record<string, RuntimeValue>,
): void {
  for (const stmt of stmts) {
    if (stmt.kind === "expr") {
      evalExpr(stmt.expr, env);
      continue;
    }

    const rhs = evalExpr(stmt.value, env);
    if (stmt.op === "=") {
      setLValue(stmt.target, rhs, env);
      continue;
    }

    // Compound assignments +=, -=, *=, /=, %=
    if (stmt.op === "+=") {
      let current: RuntimeValue;
      if (stmt.target.kind === "identifier") {
        if (!(stmt.target.name in env)) {
          throw new RuntimeEvalError(
            `Tanımsız değişken: '${stmt.target.name}'. '+=' kullanmadan önce başlangıç değeri atayın.`,
          );
        }
        current = env[stmt.target.name];
      } else {
        const obj = evalExpr(stmt.target.object, env);
        const idx = asNumber(evalExpr(stmt.target.index, env), "dizi indeksi");
        if (!Array.isArray(obj) || !Number.isInteger(idx) || idx < 0 || idx >= obj.length) {
          throw new RuntimeEvalError(`Geçersiz dizi indeksi: ${idx}`);
        }
        current = obj[idx];
      }
      if (typeof current === "string" || typeof rhs === "string") {
        setLValue(stmt.target, formatValue(current) + formatValue(rhs), env);
      } else {
        setLValue(stmt.target, asNumber(current, "'+='") + asNumber(rhs, "'+='"), env);
      }
      continue;
    }

    const curNum = getNumericLValue(stmt.target, env);
    const rhsNum = asNumber(rhs, `'${stmt.op}'`);
    let nextVal: number;
    switch (stmt.op) {
      case "-=":
        nextVal = curNum - rhsNum;
        break;
      case "*=":
        nextVal = curNum * rhsNum;
        break;
      case "/=":
        if (rhsNum === 0) {
          throw new RuntimeEvalError("Sıfıra bölme hatası: '/=' işleminde bölen 0 olamaz.");
        }
        nextVal = curNum / rhsNum;
        break;
      case "%=":
        if (rhsNum === 0) {
          throw new RuntimeEvalError("Sıfıra göre mod hatası: '%=' işleminde bölen 0 olamaz.");
        }
        nextVal = curNum % rhsNum;
        break;
    }
    setLValue(stmt.target, nextVal, env);
  }
}
