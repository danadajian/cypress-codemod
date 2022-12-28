import {readFileSync, writeFileSync} from "fs";
import {resolve} from "path";
import {parse} from "@babel/parser";
import * as t from "@babel/types";
import {generateComponentTestBlock} from "./generate-component-test-block";
import generate from "@babel/generator";
import {format, resolveConfig} from "prettier";

export interface Options {
  customMountCommand?: string;
  customDOMEmptyCommand?: string;
}

export const convertJestTestToComponentTest = (
  filePath: string,
  outPath: string,
  options: Options
) => {
  const contents = readFileSync(resolve(filePath)).toString();
  const ast = parse(contents, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  const currentNodes = ast.program.body;
  const newNodes = currentNodes
    .map(node => {
      // remove jest.fn expressions
      if (
        t.isVariableDeclaration(node) &&
        t.isVariableDeclarator(node.declarations[0]) &&
        t.isCallExpression(node.declarations[0].init) &&
        t.isMemberExpression(node.declarations[0].init.callee) &&
        t.isIdentifier(node.declarations[0].init.callee.object) &&
        t.isIdentifier(node.declarations[0].init.callee.property) &&
        node.declarations[0].init.callee.object.name === 'jest' &&
        node.declarations[0].init.callee.property.name === 'fn'
      ) {
        return undefined;
      }

      // leave import statements and other global constants
      if (!t.isExpressionStatement(node) || !t.isCallExpression(node.expression)) return node;

      // remove jest.mock expressions
      if (
        t.isMemberExpression(node.expression.callee) &&
        t.isIdentifier(node.expression.callee.object) &&
        t.isIdentifier(node.expression.callee.property) &&
        node.expression.callee.object.name === 'jest' &&
        node.expression.callee.property.name === 'mock'
      ) {
        return undefined;
      }

      // case where global describe block is not used
      if (t.isIdentifier(node.expression.callee) && node.expression.callee.name !== 'describe') {
        const testName = node.expression.arguments.find(arg => t.isStringLiteral(arg));
        const innerArrowFunction = node.expression.arguments.find(arg =>
          t.isArrowFunctionExpression(arg)
        );
        if (!t.isStringLiteral(testName) || !t.isArrowFunctionExpression(innerArrowFunction))
          return node;
        node.expression.callee.name = 'describe';
        const expression = t.callExpression(t.identifier('it'), [
          testName,
          generateComponentTestBlock(innerArrowFunction, options)
        ]);
        innerArrowFunction.body = t.blockStatement([t.expressionStatement(expression)]);
      }

      // global describe block is used
      const describeBlockArguments = node.expression.arguments;
      describeBlockArguments.forEach(argument => {
        if (!t.isArrowFunctionExpression(argument) || !t.isBlockStatement(argument.body))
          return node;
        argument.body.body.forEach(testBlock => {
          if (
            !t.isExpressionStatement(testBlock) ||
            !t.isCallExpression(testBlock.expression) ||
            !t.isIdentifier(testBlock.expression.callee)
          )
            return node;
          testBlock.expression.callee.name = 'it';
          const expressionArguments = testBlock.expression.arguments;
          expressionArguments.forEach((argument, index) => {
            if (t.isArrowFunctionExpression(argument)) {
              expressionArguments[index] = generateComponentTestBlock(argument, options);
            }
          });
        });
      });
      return node;
    })
    .filter((newNode): newNode is t.Statement => Boolean(newNode));

  const { code: newCode } = generate(t.program(newNodes), { retainLines: true });
  const prettierConfig = resolveConfig.sync(process.cwd());
  writeFileSync(outPath, format(newCode, { parser: 'babel', ...prettierConfig }));
};
