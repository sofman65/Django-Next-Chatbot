"use client";

import React from "react";
import { EnhancedCodeBlock } from "./ui/enhanced-code-block";
import { Markdown } from "./ui/Markdown";

const CodeBlockDemo = () => {
    // Sample JavaScript code
    const jsCode = `// Example JavaScript function
function calculateTotal(items) {
  return items
    .filter(item => item.price > 0)
    .map(item => item.price * item.quantity)
    .reduce((total, price) => total + price, 0);
}

// Usage example
const cart = [
  { name: "Widget", price: 9.99, quantity: 2 },
  { name: "Gadget", price: 22.50, quantity: 1 },
  { name: "Doohickey", price: 5.00, quantity: 3 }
];

const total = calculateTotal(cart);
console.log(\`Total: $\${total.toFixed(2)}\`); // Total: $52.48`;

    // Sample Python code
    const pythonCode = `# Example Python function
def calculate_total(items):
    return sum(
        item["price"] * item["quantity"] 
        for item in items 
        if item["price"] > 0
    )

# Usage example
cart = [
    {"name": "Widget", "price": 9.99, "quantity": 2},
    {"name": "Gadget", "price": 22.50, "quantity": 1},
    {"name": "Doohickey", "price": 5.00, "quantity": 3}
]

total = calculate_total(cart)
print(f"Total: ${total:.2f
}")  # Total: $52.48`;

// Sample terminal commands
const bashCode = `# Install dependencies
npm install @project/core
npm install react-syntax-highlighter

# Start the development server
npm run dev

# Output should show server running
> Server started at http://localhost:3000
> Ready in 2.3s`;

// Sample markdown with a code block
const markdown = `
# Code Block Demo

Here's a sample Python code block using our enhanced markdown component:

\`\`\`python
import numpy as np
import pandas as pd

# Load dataset
df = pd.read_csv('data.csv')

# Basic statistics
print(df.describe())

# Plot results
import matplotlib.pyplot as plt
plt.figure(figsize=(10, 6))
df['value'].hist(bins=20)
plt.title('Distribution of Values')
plt.show()
\`\`\`

The code above demonstrates how to analyze data with pandas.

## Terminal Example

\`\`\`bash
# Deploy the application
docker build -t dochat-app .
docker run -p 3000:3000 dochat-app
\`\`\`

## Tabs Example

The code block below uses tabs to organize different code samples.
`;

return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent mb-4">
                DoChat.ai Enhanced Code Blocks
            </h1>
            <p className="text-gray-300 max-w-2xl mx-auto">
                The following examples showcase the enhanced code block styling that matches the DoChat.ai branding.
            </p>
        </div>

        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-semibold text-white mb-4">JavaScript Example</h2>
                <EnhancedCodeBlock
                    language="javascript"
                    filename="cart.js"
                    code={jsCode}
                    highlightLines={[2, 3, 4, 5]}
                />
            </div>

            <div>
                <h2 className="text-xl font-semibold text-white mb-4">Python Example</h2>
                <EnhancedCodeBlock
                    language="python"
                    filename="cart.py"
                    code={pythonCode}
                    highlightLines={[2, 3, 4, 5, 6]}
                />
            </div>

            <div>
                <h2 className="text-xl font-semibold text-white mb-4">Terminal Example</h2>
                <EnhancedCodeBlock
                    language="bash"
                    filename="Terminal"
                    code={bashCode}
                />
            </div>

            <div>
                <h2 className="text-xl font-semibold text-white mb-4">Tabs Example</h2>
                <EnhancedCodeBlock
                    language="javascript"
                    filename="Multiple Files"
                    tabs={[
                        {
                            name: "JavaScript",
                            code: jsCode,
                            language: "javascript",
                            highlightLines: [2, 8]
                        },
                        {
                            name: "Python",
                            code: pythonCode,
                            language: "python",
                            highlightLines: [2]
                        },
                        {
                            name: "Terminal",
                            code: bashCode,
                            language: "bash"
                        }
                    ]}
                />
            </div>

            <div>
                <h2 className="text-xl font-semibold text-white mb-4">Markdown with Code Blocks</h2>
                <div className="bg-gray-900/60 rounded-lg p-6 shadow-md">
                    <Markdown>{markdown}</Markdown>
                </div>
            </div>
        </div>
    </div>
);
};

export default CodeBlockDemo;

export default CodeBlockDemo;
