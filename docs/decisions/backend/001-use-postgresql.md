---
# Configuration for the Jekyll template "Just the Docs"
parent: Decisions
nav_order: 100
title: Use PostgreSQL as Database
# These are optional elements. Feel free to remove any of them.
# status: "{proposed | rejected | accepted | deprecated | … | superseded by ADR-0123"
# date: {YYYY-MM-DD when the decision was last updated}
# decision-makers: {list everyone involved in the decision}
# consulted: {list everyone whose opinions are sought (typically subject-matter experts); and with whom there is a two-way communication}
# informed: {list everyone who is kept up-to-date on progress; and with whom there is a one-way communication}
---

<!-- we need to disable MD025, because we use the different heading "ADR Template" in the homepage (see above) than it is foreseen in the template -->
<!-- markdownlint-disable-next-line MD025 -->

# PostgreSQL as Database

## Context and Problem Statement

Our application requires a robust, scalable, and feature-rich database management system to handle transactional data and analytical queries. The system must support ACID compliance, advanced querying capabilities, and extensibility while being cost-effective and open-source. This decision evaluates whether PostgreSQL is the best fit for our needs.

## Decision Drivers

- The need for an open-source solution to avoid licensing costs.
- Requirements for ACID compliance to ensure transactional integrity.
- The ability to handle complex queries, including analytical workloads.
- Native support for structured and semi-structured data (e.g., JSONB).
- Community support and ecosystem maturity for extensions and tooling.

## Considered Options

- PostgreSQL
- MySQL
- MongoDB

## Decision Outcome

Chosen option: **PostgreSQL**, because it meets all key requirements, including ACID compliance, rich query capabilities, and support for both structured and semi-structured data. It also has strong community backing and extensibility options.

### Consequences

- **Good**, because PostgreSQL provides advanced features like window functions, full-text search, and JSONB, which streamline development and reduce reliance on external tools.
- **Good**, because it ensures data integrity and supports high concurrency for transactional operations.
- **Bad**, because it may have a steeper learning curve for team members unfamiliar with its advanced features and configurations.

### Confirmation

The decision will be confirmed by implementing a prototype using PostgreSQL and evaluating its performance, reliability, and suitability for the application's needs during the development phase.

## Pros and Cons of the Options

### PostgreSQL

- **Good**, because it supports ACID transactions, ensuring data integrity.
- **Good**, because it has advanced querying capabilities (CTEs, window functions).
- **Good**, because of its support for JSONB, enabling hybrid relational and NoSQL use cases.
- **Neutral**, because it requires more fine-tuning for optimal performance at scale.
- **Bad**, because it has a steeper learning curve for complex configurations.

### MySQL

- **Good**, because it is simple and fast for basic CRUD operations.
- **Good**, because it has broad community support and a familiar syntax.
- **Neutral**, because its JSON support is less robust compared to PostgreSQL.
- **Bad**, because it lacks advanced features like window functions and CTEs.
- **Bad**, because replication and clustering can be less flexible.

### MongoDB

- **Good**, because it excels at handling unstructured data.
- **Good**, because it provides a flexible schema, making it easy to adapt to changing requirements.
- **Neutral**, because it is better suited for NoSQL workloads than transactional use cases.
- **Bad**, because it is not fully ACID-compliant for multi-document transactions.
- **Bad**, because it may require additional effort to integrate with relational data needs.

## More Information

The team will monitor PostgreSQL performance in staging environments and benchmark it against typical use cases. Feedback from database architects and DevOps teams will validate the choice, and adjustments will be made if scalability or performance issues arise. For further details, refer to the PostgreSQL documentation and internal benchmarks.
