const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    const stat = fs.lstatSync(fromPath);
    if (stat.isFile()) {
      fs.copyFileSync(fromPath, toPath);
    } else if (stat.isDirectory()) {
      copyFolderSync(fromPath, toPath);
    }
  });
}

// Copy db assets
const dbSrc = path.join(__dirname, '..', 'db');
const dbDest = path.join(__dirname, '..', 'dist', 'db');
if (fs.existsSync(dbSrc)) {
  copyFolderSync(dbSrc, dbDest);
  console.log('Successfully copied db directory to dist/db');
}

// Copy assets (icon/logo)
const assetsSrc = path.join(__dirname, '..', 'assets');
const assetsDest = path.join(__dirname, '..', 'dist', 'assets');
if (fs.existsSync(assetsSrc)) {
  copyFolderSync(assetsSrc, assetsDest);
  console.log('Successfully copied assets directory to dist/assets');
}
