// This is a simple script to generate placeholder images
// You can replace these with actual images later

const fs = require('fs');
const { createCanvas } = require('canvas');

// Create placeholder images for welcome screens
function createPlaceholder(filename, color, text) {
  const canvas = createCanvas(400, 400);
  const ctx = canvas.getContext('2d');
  
  // Fill background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 400, 400);
  
  // Add text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 200, 200);
  
  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
  console.log(`Created ${filename}`);
}

// Create the placeholder images
createPlaceholder('welcome-1.png', '#FF6B6B', 'Welcome Screen');
createPlaceholder('welcome-2.png', '#4ECDC4', 'Organize Collection');
createPlaceholder('welcome-3.png', '#FFD166', 'Track Progress');
createPlaceholder('welcome-4.png', '#6772E5', 'Join Community');

console.log('All placeholder images created!');
