# Lumbung Mesari - Savings and Loans Cooperative System Requirements

## 1. System Overview

The Lumbung Mesari system is a REST API backend service for a savings and loans cooperative. The system will handle member management, savings operations, loan management, and various financial transactions.

## 2. User Management

### 2.1 User Types

- **Administrator**: Manages all cooperative operations
- **Members**: Regular cooperative members who can save and request loans

### 2.2 Authentication & Security

- JWT-based authentication
- Two-Factor Authentication (2FA) via email
- Password Requirements:
  - Minimum 8 characters
  - Must contain numbers
  - Must contain special characters
- Session Management:
  - Auto logout on inactivity
  - Token expiration handling
  - Session tracking

## 3. Member Management

### 3.1 Member Registration

- Required Information:
  - Username
  - Full Name
  - Email
  - Password
  - ID Card Image
  - Selfie Image
- Status tracking (Pending, Approved, Rejected)
- Admin approval workflow
- Email notifications for status changes

### 3.2 Member Profile

- Profile management
- Account status viewing
- Transaction history
- Current balance viewing
- Active loans overview

## 4. Savings Management

### 4.1 Features

- Minimum balance: 100,000 IDR
- Configurable interest rate
- Transaction types:
  - Deposits
  - Withdrawals
- Balance tracking
- Transaction history

### 4.2 Transaction Processing

- Integration with Midtrans payment gateway
  - Bank transfer support
  - E-wallet support
- Transaction status tracking
- Admin approval workflow
- Email notifications

## 5. Loan Management

### 5.1 Loan Features

- Flexible loan amounts (no maximum limit)
- Installment periods:
  - 6 months
  - 12 months
  - 18 months
- Variable interest rates based on duration
- Late payment penalties (0.5% additional interest)

### 5.2 Loan Processing

- Loan application workflow
- Admin approval process
- Installment scheduling
- Automatic installment calculations
- Late payment handling
- Email notifications for:
  - Loan approval/rejection
  - Upcoming payments
  - Late payments

## 6. Reporting System

### 6.1 Member Reports

- Monthly account statements
- Savings balance reports
- Loan status reports
- Payment history

### 6.2 Administrative Reports

- Monthly transaction summaries
- Member status reports
- Loan performance reports
- System audit trails
- Financial statements

## 7. Technical Requirements

### 7.1 Database

- PostgreSQL database
- Implementation of database locking for financial transactions
- Concurrent transaction handling
- Data integrity measures

### 7.2 Performance Requirements

- Support for 70+ concurrent users
- Minimum 18 hours daily uptime
- Optimized query performance
- Caching implementation where appropriate

### 7.3 Backup and Recovery

- Daily automated backups
- Point-in-time recovery capability
- Backup encryption
- Regular backup testing
- Recovery procedures documentation

### 7.4 Security Measures

- Data encryption at rest
- SSL/TLS encryption for data in transit
- Regular security audits
- Input validation
- XSS protection
- SQL injection prevention
- CORS configuration
- Rate limiting

### 7.5 Audit Trail

- Logging of all administrative actions
- Transaction logging
- User activity logging
- System event logging

## 8. Integration Requirements

### 8.1 Payment Gateway

- Midtrans integration
  - Bank transfer implementation
  - E-wallet implementation
- Transaction status synchronization
- Error handling
- Payment reconciliation

### 8.2 Email System

- Transactional email service integration
- Email templates for:
  - Registration confirmation
  - Account approval
  - Transaction notifications
  - Loan notifications
  - Monthly statements
  - 2FA codes

## 9. Non-functional Requirements

### 9.1 Scalability

- Horizontal scaling capability
- Load balancing support
- Database replication support

### 9.2 Maintainability

- Code documentation
- API documentation
- Logging standards
- Error handling standards
- Deployment documentation

### 9.3 Monitoring

- System health monitoring
- Performance monitoring
- Error tracking
- User activity monitoring
- Transaction monitoring

## 10. Development Guidelines

### 10.1 API Standards

- RESTful API design
- JSON response format
- Proper HTTP status codes
- API versioning
- Request/Response validation

### 10.2 Code Quality

- TypeScript/NestJS best practices
- Unit testing requirements
- Integration testing requirements
- Code review process
- Code style guide

## Implementation Phase

Based on the project structure and the implementation roadmap from requirements.md, here's where we stand:

Phase 1: Project Setup & Infrastructure ✓ (Partially Complete)

- [x] PostgreSQL container setup (docker-compose-dev.yml exists)
- [x] Basic project structure setup (NestJS structure is in place)
- [x] Environment configuration (.gitignore suggests .env usage)
- [x] API Documentation Setup (OpenAPI/Swagger)

Phase 2: Database Design & Setup 🚧 (In Progress)

- [ ] Database migrations implementation (Started with users table)
- [ ] Knex query builder setup (knexfile.ts exists)
- [ ] Most of the required tables still need to be created

Phase 3: Authentication & Authorization 🚧 (Early Stages)

- [ ] Started users module implementation
- [ ] Most authentication features
- [ ] Two-Factor Authentication
- [ ] Role-based authorization

Phases 4-7: Not Started Yet

- Core Modules Implementation (Savings, Loans, etc.)
- Integration & Features
- Testing & Security
- Documentation & Deployment

Summary of Current State:
The project is in its early stages, primarily in Phase 1 and beginning of Phase 2
Basic infrastructure is set up with:
NestJS framework
PostgreSQL database configuration
Basic project structure
Initial database migration setup
Next immediate steps should be:
Complete the database migrations for all required tables
Implement the authentication system
Set up API documentation with Swagger
Begin implementing core modules (Members, Savings, Loans)
