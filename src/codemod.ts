#!/usr/bin/env node

import { convertJestTestToComponentTest } from './convert-jest-test-to-component-test';
import * as chalk from 'chalk';
import { program } from 'commander';
import { sync } from 'glob';

program
  .option('-f, --filePath <string>', 'A path to a test file to migrate.')
  .option('-d, --directory <string>', 'A directory containing test files to migrate.')
  .parse(process.argv);

console.log(chalk.yellowBright('Generating custom command types...'));

const { filePath, directory, ...options } = program.opts();

if (!filePath && !directory || filePath && directory) {
  console.error(chalk.red('Please specify exactly one of --filePath (-f) or --directory (-d).'));
  process.exit(1);
}

if (directory) {
  const filePaths = sync(`${directory.trim()}${directory.endsWith('/') ? '' : '/'}**/*`, {
    nodir: true
  });
  filePaths.forEach(filePath => {
    convertJestTestToComponentTest(filePath, filePath, options);
  });
}

if (filePath) {
  convertJestTestToComponentTest(filePath, filePath, options);
}

console.log(chalk.bgGreen('Codemod complete!'));
