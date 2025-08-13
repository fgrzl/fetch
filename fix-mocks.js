import fs from 'fs';
import path from 'path';

// Fix authorization test file
const authPath = 'test/middleware/authorization/authorization.test.ts';
let content = fs.readFileSync(authPath, 'utf8');

// Replace mockResolvedValue with mockImplementation for Response objects
content = content.replace(
  /mockFetch\.mockResolvedValue\(\s*new Response\(/g,
  'mockFetch.mockImplementation(() => Promise.resolve(new Response('
);

// Fix the closing parentheses pattern - be more careful with the regex
content = content.replace(
  /\)\s*,\s*\)\s*;/g,
  ')),);'
);

fs.writeFileSync(authPath, content);

// Also fix any other test files with the same issue
const files = [
  'test/middleware/cache/cache.test.ts'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix specific mockResolvedValue calls that create new Response objects
    content = content.replace(
      /mockFetch\.mockResolvedValue\(new Response\(/g,
      'mockFetch.mockImplementation(() => Promise.resolve(new Response('
    );
    
    // Fix closing pattern for single line calls
    content = content.replace(
      /\)\);/g,
      ')),);'
    );
    
    fs.writeFileSync(file, content);
  }
}

console.log('Fixed mock implementations to prevent body reuse issues');
