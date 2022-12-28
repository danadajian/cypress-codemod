import * as t from '@babel/types';
import {
  assertionMap,
  generateCallExpression,
  generateCypressMock,
  getIdentifierName
} from './helpers';
import { isEqual, uniqWith } from 'lodash';
import { Options } from './codemod';

export const generateComponentTestBlock = (
  arrowFunction: t.ArrowFunctionExpression,
  options: Options
) => {
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
