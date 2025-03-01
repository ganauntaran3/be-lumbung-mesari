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

## 11. Implementation Roadmap

### Phase 1: Project Setup & Infrastructure

- ✓ PostgreSQL container setup
- API Documentation Setup
  - OpenAPI/Swagger configuration
  - API endpoints documentation structure
  - Response/Request schema documentation
- Environment variables configuration (.env)
  - Database credentials
  - JWT secrets
  - Email service credentials
  - Midtrans credentials
  - Environment-specific configurations
- Basic project structure setup
- Security middleware configuration
  - Helmet for HTTP headers
  - Compression for response optimization
  - Rate limiting for API protection

### Phase 2: Database Design & Setup

- Database migrations implementation:
  - Users/Members table (authentication & basic info)
  - Member profiles table (KYC information)
  - Savings accounts table
  - Loans table
  - Loan installments table
  - Transactions table
  - Audit logs table
- Knex query builder setup
  - Connection pool configuration
  - Migration configuration
  - Database locking mechanisms for financial transactions

### Phase 3: Authentication & Authorization

- JWT authentication implementation
- Two-Factor Authentication with email
- Role-based authorization guards
  - Member routes protection
  - Admin routes protection
- Password security with bcrypt
- Session management implementation

### Phase 4: Core Modules Implementation

1. Member Management Module

   - Registration system with document upload
   - Profile management features
   - Admin approval workflow
   - Member status management

2. Savings Module

   - Account creation and management
   - Deposit processing workflow
   - Withdrawal request handling
   - Balance tracking system
   - Interest calculation implementation

3. Loan Module
   - Loan application system
   - Installment calculation engine
   - Payment processing
   - Late payment handling
   - Interest calculation system

### Phase 5: Integration & Features

1. Payment Integration

   - Midtrans gateway integration
   - Payment webhook handling
   - Transaction reconciliation system

2. Notification System

   - Email service configuration
   - Notification template creation
   - Event-driven notification system

3. Reporting System
   - Member statement generation
   - Administrative report generation
   - Financial report creation
   - Audit log system

### Phase 6: Testing & Security

- Unit test implementation
- Integration test setup
- Security testing
  - Penetration testing
  - Security audit
- Performance testing
  - Load testing
  - Stress testing
  - Concurrent user testing

### Phase 7: Documentation & Deployment

- System architecture documentation
- Deployment procedures
- Monitoring setup
- Backup procedures
- Maintenance documentation
