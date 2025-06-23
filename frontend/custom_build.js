const fs = require('fs-extra');
const path = require('path');
const {execSync} = require('child_process');

const builderAppPath = path.resolve(__dirname, '../../builder/frontend');
const overrideSrcPath = path.resolve(__dirname, 'src');
const overrideFilesPath = path.resolve(__dirname, './src_override');

console.log('Starting : Copying original src.');
fs.copySync(path.join(builderAppPath, 'src'), overrideSrcPath);
console.log('Completed : Copying original src.');

console.log('Starting : Overriding src.');
fs.copySync(overrideFilesPath, overrideSrcPath);
console.log('Completed : Copying original src.');

execSync('yarn install', {stdio: 'inherit'});
