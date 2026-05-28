const fs = require('fs');
let code = fs.readFileSync('database.sql', 'utf8');

// Replace CREATE POLICY with DROP POLICY IF EXISTS ...; \n CREATE POLICY ...
code = code.replace(/CREATE POLICY \"([^\"]+)\" ON ([a-zA-Z0-9_\.]+)[^;]+;/g, (match, policyName, tableName) => {
  return `DROP POLICY IF EXISTS "${policyName}" ON ${tableName};\n${match}`;
});

fs.writeFileSync('database-safe.sql', code);
