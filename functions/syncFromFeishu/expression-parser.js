/**
 * expression-parser.js - 安全的数学表达式解析器
 * @version 1.0
 *
 * 功能：
 * - 解析并计算数学表达式，不使用 eval
 * - 支持变量引用（如 prices.video_60plus, metrics.expected_plays）
 * - 支持基本运算：+ - * / ()
 * - 支持内置函数：min, max, abs, round, floor, ceil, if
 * - 安全：只允许数学运算，禁止代码执行
 *
 * 表达式示例：
 * - "prices.video_60plus / metrics.expected_plays * 1000"
 * - "(prices.video_60plus * 0.6 + prices.video_21_60 * 0.4) / metrics.expected_plays * 1000"
 * - "if(metrics.expected_plays > 0, prices.video_60plus / metrics.expected_plays * 1000, 0)"
 * - "max(metrics.cpm, 0)"
 * - "round(prices.video_60plus / metrics.expected_plays * 1000, 2)"
 */

// Token 类型
const TokenType = {
  NUMBER: 'NUMBER',
  VARIABLE: 'VARIABLE',
  OPERATOR: 'OPERATOR',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  COMMA: 'COMMA',
  FUNCTION: 'FUNCTION',
  COMPARISON: 'COMPARISON',
  EOF: 'EOF'
};

// 支持的函数
const FUNCTIONS = {
  'min': (args) => Math.min(...args),
  'max': (args) => Math.max(...args),
  'abs': (args) => Math.abs(args[0]),
  'round': (args) => {
    const [value, decimals = 0] = args;
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  },
  'floor': (args) => Math.floor(args[0]),
  'ceil': (args) => Math.ceil(args[0]),
  'sqrt': (args) => Math.sqrt(args[0]),
  'pow': (args) => Math.pow(args[0], args[1] || 2),
  'if': (args) => {
    const [condition, trueVal, falseVal = 0] = args;
    return condition ? trueVal : falseVal;
  },
  'coalesce': (args) => {
    // 返回第一个非空值
    for (const arg of args) {
      if (arg !== null && arg !== undefined && !isNaN(arg)) {
        return arg;
      }
    }
    return 0;
  }
};

/**
 * 词法分析器 - 将表达式字符串转换为 token 流
 */
class Lexer {
  constructor(expression) {
    this.expression = expression;
    this.pos = 0;
    this.currentChar = this.expression[0];
  }

  advance() {
    this.pos++;
    this.currentChar = this.pos < this.expression.length ? this.expression[this.pos] : null;
  }

  skipWhitespace() {
    while (this.currentChar && /\s/.test(this.currentChar)) {
      this.advance();
    }
  }

  readNumber() {
    let result = '';
    while (this.currentChar && /[\d.]/.test(this.currentChar)) {
      result += this.currentChar;
      this.advance();
    }
    return parseFloat(result);
  }

  readIdentifier() {
    let result = '';
    // 支持 prices.video_60plus 这种带点和下划线的变量名
    while (this.currentChar && /[a-zA-Z0-9_.]/.test(this.currentChar)) {
      result += this.currentChar;
      this.advance();
    }
    return result;
  }

  getNextToken() {
    while (this.currentChar) {
      // 跳过空白
      if (/\s/.test(this.currentChar)) {
        this.skipWhitespace();
        continue;
      }

      // 数字
      if (/\d/.test(this.currentChar)) {
        return { type: TokenType.NUMBER, value: this.readNumber() };
      }

      // 标识符（变量或函数）
      if (/[a-zA-Z_]/.test(this.currentChar)) {
        const identifier = this.readIdentifier();
        // 检查是否是函数
        if (FUNCTIONS[identifier.toLowerCase()]) {
          return { type: TokenType.FUNCTION, value: identifier.toLowerCase() };
        }
        return { type: TokenType.VARIABLE, value: identifier };
      }

      // 比较运算符
      if (this.currentChar === '>' || this.currentChar === '<' || this.currentChar === '=' || this.currentChar === '!') {
        let op = this.currentChar;
        this.advance();
        if (this.currentChar === '=') {
          op += '=';
          this.advance();
        }
        return { type: TokenType.COMPARISON, value: op };
      }

      // 运算符
      if (['+', '-', '*', '/'].includes(this.currentChar)) {
        const op = this.currentChar;
        this.advance();
        return { type: TokenType.OPERATOR, value: op };
      }

      // 括号
      if (this.currentChar === '(') {
        this.advance();
        return { type: TokenType.LPAREN, value: '(' };
      }
      if (this.currentChar === ')') {
        this.advance();
        return { type: TokenType.RPAREN, value: ')' };
      }

      // 逗号
      if (this.currentChar === ',') {
        this.advance();
        return { type: TokenType.COMMA, value: ',' };
      }

      throw new Error(`未知字符: ${this.currentChar} at position ${this.pos}`);
    }

    return { type: TokenType.EOF, value: null };
  }

  tokenize() {
    const tokens = [];
    let token = this.getNextToken();
    while (token.type !== TokenType.EOF) {
      tokens.push(token);
      token = this.getNextToken();
    }
    tokens.push(token);
    return tokens;
  }
}

/**
 * 语法分析器 - 递归下降解析器
 *
 * 语法优先级（从低到高）：
 * 1. 比较运算 (>, <, >=, <=, ==, !=)
 * 2. 加减 (+, -)
 * 3. 乘除 (*, /)
 * 4. 一元运算 (-)
 * 5. 函数调用、括号、数字、变量
 */
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.currentToken = this.tokens[0];
  }

  advance() {
    this.pos++;
    this.currentToken = this.pos < this.tokens.length ? this.tokens[this.pos] : { type: TokenType.EOF };
  }

  eat(tokenType) {
    if (this.currentToken.type === tokenType) {
      const token = this.currentToken;
      this.advance();
      return token;
    }
    throw new Error(`期望 ${tokenType}，但得到 ${this.currentToken.type}`);
  }

  // 解析表达式（最低优先级：比较运算）
  parseExpression() {
    let left = this.parseAddSub();

    while (this.currentToken.type === TokenType.COMPARISON) {
      const op = this.currentToken.value;
      this.advance();
      const right = this.parseAddSub();
      left = { type: 'comparison', operator: op, left, right };
    }

    return left;
  }

  // 解析加减
  parseAddSub() {
    let left = this.parseMulDiv();

    while (this.currentToken.type === TokenType.OPERATOR &&
           (this.currentToken.value === '+' || this.currentToken.value === '-')) {
      const op = this.currentToken.value;
      this.advance();
      const right = this.parseMulDiv();
      left = { type: 'binary', operator: op, left, right };
    }

    return left;
  }

  // 解析乘除
  parseMulDiv() {
    let left = this.parseUnary();

    while (this.currentToken.type === TokenType.OPERATOR &&
           (this.currentToken.value === '*' || this.currentToken.value === '/')) {
      const op = this.currentToken.value;
      this.advance();
      const right = this.parseUnary();
      left = { type: 'binary', operator: op, left, right };
    }

    return left;
  }

  // 解析一元运算（负号）
  parseUnary() {
    if (this.currentToken.type === TokenType.OPERATOR && this.currentToken.value === '-') {
      this.advance();
      const operand = this.parseUnary();
      return { type: 'unary', operator: '-', operand };
    }
    return this.parsePrimary();
  }

  // 解析基本元素（数字、变量、函数、括号）
  parsePrimary() {
    const token = this.currentToken;

    // 数字
    if (token.type === TokenType.NUMBER) {
      this.advance();
      return { type: 'number', value: token.value };
    }

    // 变量
    if (token.type === TokenType.VARIABLE) {
      this.advance();
      return { type: 'variable', name: token.value };
    }

    // 函数调用
    if (token.type === TokenType.FUNCTION) {
      const funcName = token.value;
      this.advance();
      this.eat(TokenType.LPAREN);

      const args = [];
      if (this.currentToken.type !== TokenType.RPAREN) {
        args.push(this.parseExpression());
        while (this.currentToken.type === TokenType.COMMA) {
          this.advance();
          args.push(this.parseExpression());
        }
      }

      this.eat(TokenType.RPAREN);
      return { type: 'function', name: funcName, args };
    }

    // 括号
    if (token.type === TokenType.LPAREN) {
      this.advance();
      const expr = this.parseExpression();
      this.eat(TokenType.RPAREN);
      return expr;
    }

    throw new Error(`意外的 token: ${token.type} (${token.value})`);
  }

  parse() {
    const ast = this.parseExpression();
    if (this.currentToken.type !== TokenType.EOF) {
      throw new Error(`表达式末尾有多余内容: ${this.currentToken.value}`);
    }
    return ast;
  }
}

/**
 * 解释器 - 执行 AST
 */
class Interpreter {
  constructor(variables) {
    this.variables = variables;
  }

  evaluate(node) {
    switch (node.type) {
      case 'number':
        return node.value;

      case 'variable': {
        const value = this.getVariable(node.name);
        if (value === null || value === undefined) {
          return null; // 变量不存在时返回 null
        }
        return value;
      }

      case 'unary':
        if (node.operator === '-') {
          const operand = this.evaluate(node.operand);
          return operand === null ? null : -operand;
        }
        throw new Error(`未知一元运算符: ${node.operator}`);

      case 'binary': {
        const left = this.evaluate(node.left);
        const right = this.evaluate(node.right);

        // 如果任一操作数为 null，返回 null
        if (left === null || right === null) return null;

        switch (node.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return right !== 0 ? left / right : null;
          default: throw new Error(`未知运算符: ${node.operator}`);
        }
      }

      case 'comparison': {
        const left = this.evaluate(node.left);
        const right = this.evaluate(node.right);

        if (left === null || right === null) return false;

        switch (node.operator) {
          case '>': return left > right;
          case '<': return left < right;
          case '>=': return left >= right;
          case '<=': return left <= right;
          case '==': return left === right;
          case '!=': return left !== right;
          default: throw new Error(`未知比较运算符: ${node.operator}`);
        }
      }

      case 'function': {
        const func = FUNCTIONS[node.name];
        if (!func) {
          throw new Error(`未知函数: ${node.name}`);
        }

        const args = node.args.map(arg => this.evaluate(arg));

        // 对于 if 函数，特殊处理 null
        if (node.name === 'if') {
          return func(args);
        }

        // 对于 coalesce 函数，特殊处理
        if (node.name === 'coalesce') {
          return func(args);
        }

        // 其他函数，如果有 null 参数则返回 null
        if (args.some(arg => arg === null)) {
          return null;
        }

        return func(args);
      }

      default:
        throw new Error(`未知节点类型: ${node.type}`);
    }
  }

  getVariable(path) {
    return this.variables[path];
  }
}

/**
 * 主函数：解析并计算表达式
 *
 * @param {string} expression - 表达式字符串
 * @param {Object} variables - 变量值映射 { "prices.video_60plus": 50000, "metrics.expected_plays": 100000 }
 * @returns {number|null} 计算结果，无法计算时返回 null
 */
function evaluateExpression(expression, variables) {
  try {
    // 词法分析
    const lexer = new Lexer(expression);
    const tokens = lexer.tokenize();

    // 语法分析
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // 执行
    const interpreter = new Interpreter(variables);
    const result = interpreter.evaluate(ast);

    return result;
  } catch (error) {
    console.error(`[表达式解析] 错误: ${error.message}`);
    console.error(`[表达式解析] 表达式: ${expression}`);
    return null;
  }
}

/**
 * 验证表达式语法是否正确
 *
 * @param {string} expression - 表达式字符串
 * @returns {{ valid: boolean, error?: string, variables?: string[] }}
 */
function validateExpression(expression) {
  try {
    const lexer = new Lexer(expression);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    // 提取所有变量
    const variables = extractVariables(ast);

    return { valid: true, variables };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * 从 AST 中提取所有变量名
 */
function extractVariables(node, variables = new Set()) {
  if (!node) return Array.from(variables);

  switch (node.type) {
    case 'variable':
      variables.add(node.name);
      break;
    case 'binary':
    case 'comparison':
      extractVariables(node.left, variables);
      extractVariables(node.right, variables);
      break;
    case 'unary':
      extractVariables(node.operand, variables);
      break;
    case 'function':
      node.args.forEach(arg => extractVariables(arg, variables));
      break;
  }

  return Array.from(variables);
}

/**
 * 获取支持的函数列表
 */
function getSupportedFunctions() {
  return Object.keys(FUNCTIONS).map(name => ({
    name,
    description: getFunctionDescription(name)
  }));
}

function getFunctionDescription(name) {
  const descriptions = {
    'min': 'min(a, b, ...) - 返回最小值',
    'max': 'max(a, b, ...) - 返回最大值',
    'abs': 'abs(x) - 返回绝对值',
    'round': 'round(x, decimals?) - 四舍五入到指定小数位',
    'floor': 'floor(x) - 向下取整',
    'ceil': 'ceil(x) - 向上取整',
    'sqrt': 'sqrt(x) - 平方根',
    'pow': 'pow(base, exp?) - 幂运算，默认平方',
    'if': 'if(condition, trueValue, falseValue?) - 条件判断',
    'coalesce': 'coalesce(a, b, ...) - 返回第一个非空值'
  };
  return descriptions[name] || name;
}

module.exports = {
  evaluateExpression,
  validateExpression,
  extractVariables,
  getSupportedFunctions,
  // 导出类用于测试
  Lexer,
  Parser,
  Interpreter
};
