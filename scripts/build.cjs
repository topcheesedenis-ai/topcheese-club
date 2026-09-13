const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const source = path.join(root, 'club-prototype');

// Only the generated deployment directory is replaced. Originals stay intact.
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(path.join(output, 'club-prototype'), { recursive: true });

for (const file of ['index.html', 'robots.txt', 'sitemap.xml']) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
for (const file of fs.readdirSync(source)) {
  if (/\.(html|css|js)$/.test(file)) {
    fs.copyFileSync(path.join(source, file), path.join(output, 'club-prototype', file));
  }
}
fs.cpSync(path.join(source, 'assets'), path.join(output, 'club-prototype', 'assets'), {
  recursive: true,
  filter: file => path.basename(file) !== '.DS_Store'
});
console.log('Static landing packaged in dist/; no compilation or content changes.');
