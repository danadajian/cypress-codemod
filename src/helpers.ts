import * as t from '@babel/types';
import { Options } from './convert-jest-test-to-component-test';

export const assertionMap: Record<string, string> = {
  toBeVisible: 'be.visible',
  toBeNull: 'not.exist',
  toHaveBeenCalledWith: 'have.been.calledWith',
  toBeCalledTimes: 'have.callCount',
  toHaveBeenCalledTimes: 'have.callCount'
};

export const getIdentifierName = (name: string | false, options: Options) => {
  const identifierMap: Record<string, string> = {
    render: options.customMountCommand ?? 'mount',
    toBeEmptyDOMElement: options.customDOMEmptyCommand ?? 'expectDOMToBeEmpty'
  };
  return name ? identifierMap[name] : undefined;
};

export const generateCallExpression = (
  identifier: string,
  args: Parameters<typeof t.callExpression>[1]
) => {
  return t.callExpression(t.memberExpression(t.identifier('cy'), t.identifier(identifier)), args);
};

export const generateCypressMock = (name: string) => {
  const cyStubMemberExpression = t.memberExpression(t.identifier('cy'), t.identifier('stub'));
  const callExpression = t.callExpression(cyStubMemberExpression, []);
  const memberExpression = t.memberExpression(callExpression, t.identifier('as'));
  const expression = t.callExpression(memberExpression, [t.stringLiteral(name)]);
  return t.variableDeclaration('const', [t.variableDeclarator(t.identifier(name), expression)]);
};
