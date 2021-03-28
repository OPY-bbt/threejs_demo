const fs = require("fs");
const babylon = require("babylon");
const traverse = require("babel-traverse").default;
const { transformFromAst } = require("babel-core");

module.exports = {
  // 利用 babylon 生成 ast
  getAST: (path) => {
    const content = fs.readFileSync(path, "utf-8");

    return babylon.parse(content, {
      sourceType: "module",
    });
  },
  // 利用 babel-traverse 分析 ast，生成 dependencies
  getDependencis: (ast) => {
    const dependencies = [];
    traverse(ast, {
      ImportDeclaration: ({ node }) => {
        dependencies.push(node.source.value);
      },
    });
    return dependencies;
  },
  // 转化 ES6 为 ES5
  transform: (ast) => {
    const { code } = transformFromAst(ast, null, {
      presets: ["env"],
    });

    return code;
  },
};
