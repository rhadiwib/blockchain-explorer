// for test purpose only
const jwt = require('jsonwebtoken');
const fs = require('fs');

const secret = 'e7bcdeb26c7f03baa3a9e60b41c82c3e32c42aa75a11adb8a143c6f56b9dd4a3';

const payload = {
  id: 'admin',
  role: 'admin'
};

const token = jwt.sign(payload, secret, { expiresIn: '24h' });

console.log('Generated JWT Token:');
console.log(token);

fs.writeFileSync('auth-token.txt', token);
console.log('Token saved to auth-token.txt');

console.log('\nExample usage:');
console.log(`curl --request POST --url "http://localhost:3000/index?auth_token=${token}&scan=22265800:22265850"`);