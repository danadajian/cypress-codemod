import { expect } from '@jest/globals';
import { convertJestTestToComponentTest } from '../src/convert-jest-test-to-component-test';
import { readFileSync } from 'fs';

const options = {
  customMountCommand: 'render',
  customDOMEmptyCommand: 'expectDOMToBeEmpty'
};

describe('generateTypesFromAbstractSyntaxTree', () => {
  it('should generate types when types do not exist', () => {
    convertJestTestToComponentTest('test/example1.tsx', 'test/example1-actual.tsx', options);
    const actual = readFileSync('test/example1-actual.tsx').toString();
    const expected = readFileSync('test/example1-expected.tsx').toString();
    expect(actual).toEqual(expected);
  });
});
