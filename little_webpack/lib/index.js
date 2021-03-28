const Compiler = require("./compiler");

const options = require("../little_webpack.config");

new Compiler(options).run();
