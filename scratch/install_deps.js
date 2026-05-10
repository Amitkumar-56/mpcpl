const { execSync } = require('child_process');
try {
  console.log('Installing nodemailer...');
  execSync('npm install nodemailer', { stdio: 'inherit' });
  console.log('Successfully installed nodemailer.');
} catch (error) {
  console.error('Failed to install nodemailer:', error.message);
}
