/**
 * FreeLLM Hub — Fabric Patterns & Curated Engineering Prompt Library
 * Instant Ctrl+/ command palette access to structured engineering patterns.
 */

window.FABRIC_PATTERNS = [
  {
    id: "extract_wisdom",
    name: "Extract Wisdom (Fabric)",
    category: "analysis",
    icon: "💡",
    description: "Extract core ideas, surprising takeaways, quotes, and primary recommendations from articles, transcripts, or text.",
    template: `You are an expert analytical synthesizer. Analyze the following content and provide:
1. [SUMMARY]: A 2-3 sentence overview of the core argument.
2. [KEY IDEAS]: 5-8 primary takeaways explained clearly.
3. [SURPRISING INSIGHTS]: Non-obvious perspectives or contrarian points.
4. [MEMORABLE QUOTES]: Exact quotes worth retaining.
5. [ACTIONABLE HABITS]: Concrete recommendations derived from the material.

Content to analyze:
`
  },
  {
    id: "security_audit",
    name: "Code Security & Vulnerability Audit",
    category: "engineering",
    icon: "🛡️",
    description: "Perform a thorough security review for injection, authentication flaws, race conditions, and memory safety.",
    template: `You are a principal application security engineer. Conduct an exhaustive security audit of the provided code.
Evaluate against OWASP Top 10, CWE standards, and race conditions:
1. [VULNERABILITY MATRIX]: List each vulnerability with Severity (Critical/High/Medium/Low), Attack Vector, and Exploit Scenario.
2. [CONCRETE REMEDIATION]: Provide the exact drop-in corrected code snippets.
3. [HARDENING RECOMMENDATIONS]: Architecture-level defense-in-depth suggestions.

Code to audit:
`
  },
  {
    id: "create_artifact",
    name: "Interactive HTML/JS Canvas Widget",
    category: "creative",
    icon: "🎨",
    description: "Generate a standalone interactive web app, calculator, game, or dashboard in an <antArtifact> container.",
    template: `You are an expert full-stack creative designer.
Build a complete, standalone, single-file interactive application (HTML + Tailwind CSS CDN + Vanilla JavaScript).
Features:
- Sleek modern dark mode aesthetic with smooth animations.
- Complete working functionality with zero mock placeholders.
- Always output inside a single <antArtifact identifier="app" type="html" title="App Title"> container.

Application concept:
`
  },
  {
    id: "refactor_clean",
    name: "Clean Code & SOLID Refactor",
    category: "engineering",
    icon: "⚡",
    description: "Refactor legacy or messy code to clean, modular, testable architecture while preserving 100% backward compatibility.",
    template: `You are an elite software architect. Refactor the following code following SOLID principles, clean architecture, and DRY standards.
Requirements:
1. Maintain 100% backward compatibility with all existing callers.
2. Eliminate code duplication, deeply nested conditionals, and magic literals.
3. Improve type hints, documentation, and error boundaries.
4. Provide the complete refactored code without skipping any implementation details.

Code to refactor:
`
  },
  {
    id: "pr_review",
    name: "Senior GitHub PR Review",
    category: "engineering",
    icon: "🔍",
    description: "Review a pull request diff or feature implementation like a Staff Software Engineer.",
    template: `Act as a Staff Software Engineer reviewing this pull request.
Provide structured feedback:
1. [SUMMARY OF CHANGES]: Concise explanation of what is being modified.
2. [ARCHITECTURAL IMPACT]: Impact on performance, database scalability, and system state.
3. [LINE-BY-LINE CRITIQUE]: Specific lines that need refactoring or test coverage.
4. [VERDICT]: (APPROVE / REQUEST CHANGES) with clear justification.

Diff / Code:
`
  },
  {
    id: "sql_optimizer",
    name: "SQL Query Performance Optimizer",
    category: "database",
    icon: "🗄️",
    description: "Analyze slow SQL queries, suggest index strategies, partition keys, and optimized join structures.",
    template: `You are a principal database administrator. Optimize the following SQL query for PostgreSQL / MySQL:
1. [BOTTLENECK ANALYSIS]: Explain why the current query causes full table scans or high I/O.
2. [OPTIMIZED QUERY]: Provide the rewritten query with optimized CTEs, indexes, or joins.
3. [INDEX DEFINITIONS]: Provide exact DDL statements (e.g. CREATE INDEX ...) to support the query.

Query and schema:
`
  },
  {
    id: "dockerfile_production",
    name: "Production Multi-Stage Dockerfile",
    category: "devops",
    icon: "🐳",
    description: "Generate a hardened, minimal multi-stage Dockerfile and docker-compose.yml.",
    template: `Create an enterprise-grade multi-stage production Dockerfile for the following application:
- Non-root user execution with minimal Alpine / distroless runtime image.
- Build cache optimization (dependency caching before source copy).
- Proper signal handling (SIGTERM) and healthcheck instruction.
- Include a matching docker-compose.yml with resource limits.

Application specifications:
`
  },
  {
    id: "explain_senior",
    name: "Explain for Senior Engineers",
    category: "learning",
    icon: "🧠",
    description: "Deep technical, high-density explanation of a complex algorithm, protocol, or distributed systems concept.",
    template: `Explain the following topic with zero fluff, intended for a senior systems engineer.
Focus on:
1. [FIRST PRINCIPLES]: The fundamental engineering tradeoff this solves.
2. [MECHANICAL SYMPATHY]: Memory layout, cache lines, CPU branch prediction, or network packet serialization.
3. [EDGE CASES & FAILURE MODES]: Where this abstraction breaks under high load or network partitions.

Topic:
`
  }
];
