import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from '@babel/parser';
import * as t from '@babel/types';
import generate from '@babel/generator';
import { format, resolveConfig } from 'prettier';
import { isEqual, uniqWith } from 'lodash';

interface Options {
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

const generateComponentTestBlock = (arrowFunction: t.ArrowFunctionExpression, options: Options) => {
  const arrowFunctionBody = arrowFunction.body;
  const mockNodes: t.Statement[] = [];
  if (!t.isBlockStatement(arrowFunctionBody)) return arrowFunction;
  const newBody = arrowFunctionBody.body.map(testBodyNode => {
    if (t.isVariableDeclaration(testBodyNode)) {
      // const view = render()
      const declaration = testBodyNode.declarations[0];
      if (
        !t.isVariableDeclarator(declaration) ||
        !t.isCallExpression(declaration.init) ||
        !t.isIdentifier(declaration.init.callee)
      )
        return testBodyNode;
      const identifier = getIdentifierName(declaration.init.callee.name, options);
      if (identifier) {
        const callExpression = generateCallExpression(identifier, declaration.init.arguments);
        return t.expressionStatement(callExpression);
      }
    }

    if (!t.isExpressionStatement(testBodyNode) || !t.isCallExpression(testBodyNode.expression))
      return testBodyNode;

    const callee = testBodyNode.expression.callee;
    if (
      t.isMemberExpression(callee) &&
      t.isCallExpression(callee.object) &&
      t.isIdentifier(callee.property)
    ) {
      const argument = t.isCallExpression(callee.object.arguments[0])
        ? callee.object.arguments[0]
        : t.isAwaitExpression(callee.object.arguments[0]) && callee.object.arguments[0].argument;
      // testing library assertions
      if (
        argument &&
        t.isCallExpression(argument) &&
        t.isMemberExpression(argument.callee) &&
        t.isIdentifier(argument.callee.property) &&
        /[a-zA-Z]By[a-zA-Z]/.test(argument.callee.property.name)
      ) {
        const memberExpression = t.memberExpression(
          generateCallExpression(
            argument.callee.property.name.replace(/get|query/, 'find'),
            argument.arguments
          ),
          t.identifier('should')
        );
        const assertion = callee.property.name;
        const callExpression = t.callExpression(memberExpression, [
          t.stringLiteral(assertionMap[assertion])
        ]);
        return t.expressionStatement(callExpression);
      }

      if (t.isIdentifier(callee.object.arguments[0]) && assertionMap[callee.property.name]) {
        // asserting mocks were called
        const memberExpression = t.memberExpression(
          generateCallExpression('get', [t.stringLiteral(`@${callee.object.arguments[0].name}`)]),
          t.identifier('should')
        );
        mockNodes.push(generateCypressMock(callee.object.arguments[0].name));
        const callExpression = t.callExpression(memberExpression, [
          t.stringLiteral(assertionMap[callee.property.name]),
          ...testBodyNode.expression.arguments.map(arg => ({ ...arg, loc: undefined }))
        ]);
        return t.expressionStatement(callExpression);
      }
    }

    // identifier map statements
    const name = t.isIdentifier(callee)
      ? callee.name
      : t.isMemberExpression(callee) && t.isIdentifier(callee.property) && callee.property.name;
    const identifier = getIdentifierName(name, options);
    if (identifier) {
      const callExpression = generateCallExpression(identifier, testBodyNode.expression.arguments);
      return t.expressionStatement(callExpression);
    }
    return testBodyNode;
  });

  const dedupedMockNodes = uniqWith(mockNodes, isEqual);
  const body = dedupedMockNodes.concat(newBody);
  return t.arrowFunctionExpression(arrowFunction.params, { ...arrowFunctionBody, body });
};

const assertionMap: Record<string, string> = {
  toBeVisible: 'be.visible',
  toBeNull: 'not.exist',
  toHaveBeenCalledWith: 'have.been.calledWith',
  toBeCalledTimes: 'have.callCount',
  toHaveBeenCalledTimes: 'have.callCount'
};

const getIdentifierName = (name: string | false, options: Options) => {
  const identifierMap: Record<string, string> = {
    render: options.customMountCommand ?? 'mount',
    toBeEmptyDOMElement: options.customDOMEmptyCommand ?? 'expectDOMToBeEmpty'
  };
  return name ? identifierMap[name] : undefined;
};

const generateCallExpression = (
  identifier: string,
  args: Parameters<typeof t.callExpression>[1]
) => {
  return t.callExpression(t.memberExpression(t.identifier('cy'), t.identifier(identifier)), args);
};

const generateCypressMock = (name: string) => {
  const cyStubMemberExpression = t.memberExpression(t.identifier('cy'), t.identifier('stub'));
  const callExpression = t.callExpression(cyStubMemberExpression, []);
  const memberExpression = t.memberExpression(callExpression, t.identifier('as'));
  const expression = t.callExpression(memberExpression, [t.stringLiteral(name)]);
  return t.variableDeclaration('const', [t.variableDeclarator(t.identifier('mockFn'), expression)]);
};
