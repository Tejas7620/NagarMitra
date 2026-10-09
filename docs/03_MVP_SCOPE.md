Read:

docs/01_PS_ANALYSIS.md
docs/02_WOW_FEATURES.md
docs/03_MVP_SCOPE.md

Do not modify them.

Do not begin coding.

Create the complete technical implementation plan.

==================================================

1. PRODUCT ARCHITECTURE
   ==================================================

Define:

Frontend
Backend
Database
AI/ML
External APIs
Storage
Authentication
Deployment

Choose the simplest reliable architecture.

==================================================
2. SYSTEM FLOW
==============

Create the full data flow:

USER
→ FRONTEND
→ API
→ BACKEND
→ AI/ML / DATABASE / EXTERNAL SERVICE
→ RESPONSE
→ FRONTEND
→ USER ACTION

Explain each step.

==================================================
3. FRONTEND PLAN
================

Define:

Routes/pages
Components
Reusable components
Forms
Inputs
Tables
Cards
Charts
Dashboards
Modals
Navigation
Loading states
Error states
Empty states

For every page specify:

PURPOSE
INPUTS
OUTPUTS
ACTIONS
API DEPENDENCIES

==================================================
4. DATABASE PLAN
================

Define all required tables.

For every table:

* columns
* type
* primary key
* foreign keys
* required/optional
* indexes if needed
* relationships

Keep the database minimal.

==================================================
5. API PLAN
===========

For each endpoint define:

METHOD
ROUTE
INPUT
VALIDATION
PROCESS
DATABASE/AI CALL
OUTPUT
ERROR RESPONSE

==================================================
6. AI/ML PLAN
=============

For every AI/ML function specify:

Input
Processing
Model/API
Prompt or algorithm
Expected output
Confidence handling
Fallback behavior
Error handling

Do not use AI merely as decoration.

==================================================
7. WOW FEATURES
===============

For every WOW feature define its exact technical implementation.

==================================================
8. SECURITY
===========

Define:

* secret handling
* API key handling
* validation
* authentication
* authorization
* database security

Only implement security appropriate for the hackathon scope.

==================================================
9. ERROR STRATEGY
=================

Define behavior for:

* invalid input
* empty input
* API failure
* AI failure
* database failure
* network failure
* timeout
* missing data

==================================================
10. FEATURE → IMPLEMENTATION MATRIX
===================================

Create a table:

Feature
→ Page/component
→ API
→ Backend
→ Database/AI
→ Expected result

Every MUST BUILD and WOW feature must appear.

==================================================
11. DEVELOPMENT ORDER
=====================

Provide the exact implementation sequence.

Example:

1. App shell
2. Core page
3. Primary workflow
4. Database
5. Backend API
6. AI
7. Integration
8. Dashboard
9. WOW Feature 1
10. WOW Feature 2
11. QA
12. Polish

==================================================
12. FIVE-HOUR PLAN
==================

Divide the work into:

Hour 1
Hour 2
Hour 3
Hour 4
Hour 5

Include checkpoints.

==================================================
13. RISKS
=========

Identify anything likely to consume excessive time.

For each risk provide:

* primary approach
* fallback approach

==================================================
14. DEFINITION OF DONE
======================

Define exactly what must be true before the project is considered complete.

==================================================
OUTPUT
======

Create:

docs/04_IMPLEMENTATION_PLAN.md

This is the master engineering plan.

Do not code.

Do not redesign.

Do not add features.

STOP after creating the plan.
