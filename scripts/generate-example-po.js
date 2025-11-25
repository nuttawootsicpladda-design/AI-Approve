/**
 * Example PO Generator
 * Run: node scripts/generate-example-po.js
 * 
 * This script generates a sample PO document for testing
 */

const fs = require('fs');
const path = require('path');

const examplePO = {
  items: [
    {
      name: "Dell XPS 15 Laptop",
      quantity: 5,
      cost: 1499.99,
      poNo: "PO-2024-001",
      usd: 7499.95
    },
    {
      name: "HP Monitor 27 inch",
      quantity: 10,
      cost: 299.99,
      poNo: "PO-2024-002",
      usd: 2999.90
    },
    {
      name: "Logitech MX Master Mouse",
      quantity: 15,
      cost: 99.99,
      poNo: "PO-2024-003",
      usd: 1499.85
    },
    {
      name: "Microsoft Surface Keyboard",
      quantity: 15,
      cost: 79.99,
      poNo: "PO-2024-004",
      usd: 1199.85
    },
    {
      name: "USB-C Docking Station",
      quantity: 8,
      cost: 199.99,
      poNo: "PO-2024-005",
      usd: 1599.92
    }
  ]
};

// Create examples directory if it doesn't exist
const examplesDir = path.join(process.cwd(), 'examples');
if (!fs.existsSync(examplesDir)) {
  fs.mkdirSync(examplesDir, { recursive: true });
}

// Generate CSV
const csv = [
  'Name,Quantity,Cost,PO No.,USD',
  ...examplePO.items.map(item => 
    `"${item.name}",${item.quantity},${item.cost},${item.poNo},${item.usd}`
  )
].join('\n');

fs.writeFileSync(path.join(examplesDir, 'example-po.csv'), csv);

// Generate TXT
const txt = [
  'PURCHASE ORDER',
  '='.repeat(80),
  '',
  ...examplePO.items.map((item, i) => 
    `Item ${i + 1}: ${item.name}\n` +
    `Quantity: ${item.quantity}\n` +
    `Unit Cost: $${item.cost}\n` +
    `PO Number: ${item.poNo}\n` +
    `Total USD: $${item.usd}\n`
  ),
  '='.repeat(80),
  `TOTAL: $${examplePO.items.reduce((sum, item) => sum + item.usd, 0).toFixed(2)}`
].join('\n');

fs.writeFileSync(path.join(examplesDir, 'example-po.txt'), txt);

console.log('✅ Example PO documents generated in ./examples/');
console.log('   - example-po.csv');
console.log('   - example-po.txt');
