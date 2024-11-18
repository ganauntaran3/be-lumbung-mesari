---
# Configuration for the Jekyll template "Just the Docs"
parent: Decisions
nav_order: 101
title: ADR Template
# status: "accepted"
# date: 2024-11-17
# decision-makers: "Development Team"
# consulted: "Architects, Senior Backend Developers"
# informed: "Management Team, Stakeholders"
---

# TypeORM as ORM

## Context and Problem Statement

Our project requires an Object-Relational Mapping (ORM) tool to streamline database interactions, minimize boilerplate code, and enable scalability as the application grows. The ORM must integrate seamlessly with our NestJS framework, provide strong TypeScript support, and support complex data models and relationships.

## Decision Drivers

- Seamless integration with NestJS to ensure a cohesive developer experience.
- Strong TypeScript support for type safety and productivity.
- Ease of use with features like auto-generated migrations and repository patterns.
- Support for advanced querying and complex relationships (e.g., joins, cascading).
- Active community support and documentation for learning and troubleshooting.

## Considered Options

- TypeORM
- Prisma
- Sequelize

## Decision Outcome

Chosen option: **TypeORM**, because it provides a native and seamless integration with NestJS, supports advanced database features like lazy loading and complex relationships, and aligns well with our project’s structure and goals.

### Consequences

- **Good**, because TypeORM works seamlessly with NestJS, reducing the need for additional configuration.
- **Good**, because it offers rich features like custom repositories, eager/lazy loading, and transaction management.
- **Bad**, because its learning curve can be steep for developers unfamiliar with database design.
- **Bad**, because managing migrations and debugging can be complex in certain scenarios.

### Confirmation

The decision will be confirmed by implementing a pilot feature using TypeORM to validate its integration with NestJS, its support for required database operations, and its performance in real-world scenarios.

## Pros and Cons of the Options

### TypeORM

- **Good**, because it natively integrates with NestJS and follows its module-based architecture.
- **Good**, because it provides strong TypeScript support, including decorators for entity definitions.
- **Good**, because it supports complex relationships, cascading, and lazy loading for advanced use cases.
- **Neutral**, because its runtime metadata system can introduce slight overhead.
- **Bad**, because migrations can become challenging to manage in large teams without strict discipline.

### Prisma

- **Good**, because it offers an intuitive schema-based approach to defining models.
- **Good**, because it provides excellent TypeScript support with auto-generated types for queries.
- **Neutral**, because it prioritizes simplicity over ORM-like features (e.g., no lazy loading).
- **Bad**, because it lacks support for some advanced features like custom repositories and intricate query optimizations.
- **Bad**, because it introduces limitations for highly customized SQL queries.

### Sequelize

- **Good**, because it is simple and has been widely adopted in the Node.js ecosystem.
- **Good**, because it allows writing raw SQL queries directly when needed.
- **Neutral**, because it provides only limited TypeScript support compared to TypeORM or Prisma.
- **Bad**, because its flexibility can lead to inconsistencies in large team environments.
- **Bad**, because managing complex relationships is less intuitive.

## More Information

The decision to use TypeORM will be periodically reviewed as the project scales, particularly to address migration challenges and optimize performance. The team will also evaluate the community and ecosystem for TypeORM to ensure continued support. For more information, refer to TypeORM’s official documentation and NestJS integration guides.
