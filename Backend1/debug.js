const { execSync } = require('child_process');
try {
  execSync('npx prisma validate', { stdio: 'pipe', encoding: 'utf-8' });
} catch (e) {
  console.log(e.stderr.replace(/\r/g, '<cr>').replace(/\n/g, '<nl>'));
  console.log(e.stdout.replace(/\r/g, '<cr>').replace(/\n/g, '<nl>'));
}
