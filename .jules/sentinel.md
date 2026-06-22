## 2023-10-24 - Dynamic PostgREST .or() Syntax Injection
 **Vulnerability:** An SQL/syntax injection vulnerability existed where user inputs (`cleanQuery`, `userInterests`) were directly interpolated into PostgREST `.or()` filter strings in Supabase without escaping.
 **Learning:** Because `queryBuilder.or()` takes a comma-separated string that parses commas and quotes to define filtering conditions, unescaped commas allow attackers to break out of the intended condition and inject arbitrary clauses.
 **Prevention:** Whenever using string interpolation inside PostgREST filter builders like `.or()`, wrap dynamic user values in double quotes and escape internal double quotes by doubling them (`""`).
