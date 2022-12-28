#!/usr/bin/env node

import {convertJestTestToComponentTest} from "./convert-jest-test-to-component-test";
import * as chalk from 'chalk';
import { program } from 'commander';
import {sync} from "glob";

program
  .option(
    '-f, --file <string>',
    'A test file to migrate.'
  )
  .option(
    '-d, --directory <string>',
    'A directory containing test files to migrate.'
  )
  .parse(process.argv);

console.log(chalk.yellowBright('Generating custom command types...'));

const { file, directory, ...options } = program.opts();

if (!file && !directory) {
  console.error(chalk.red('Please specify one of --file or --directory.'));
  process.exit(1);
}

const filePaths = sync(`${directory.trim()}${directory.endsWith('/') ? '' : '/'}**/*`, { nodir: true });

filePaths.forEach(filePath => {
  convertJestTestToComponentTest(filePath, filePath, options);
});

console.log(chalk.bgGreen('Codemod complete!'));
