# Dhaba AI Ticket Triage

An AI-powered backend service that analyses customer support tickets and generates structured triage results.

It classifies tickets, identifies severity, drafts customer replies, and handles refund decisions through an independent backend safety check.

Built as part of the Propel Full Stack AI Engineer take-home assignment.

## 1. Tech Stack

- Node.js
- Express.js
- JavaScript (ES Modules)
- MongoDB
- Zod
- Groq API

## 2. Architecture

The application follows a layered monolithic architecture.

**Request Flow:**

`Client → Express Route → Validation Middleware → Controller → Triage Service`

The Triage Service coordinates:

- AI Service
- Refund Safety Service
- Idempotency Service

MongoDB stores ticket processing results.

## 3. Features

- AI-based ticket classification and severity detection.
- Customer reply generation in the user's language.
- Structured AI output validation using Zod.
- Retry mechanism with fallback handling.
- Independent backend refund safety checks.
- MongoDB-based ticket idempotency.
- Fixture mode for testing without an API key.
- Structured logging across the request lifecycle.

## 4. Setup and Installation

### Prerequisites

- Node.js 18+
- MongoDB

### Clone the repository
git clone https://github.com/mayank1327/dhaba-ai-triage.git
cd dhaba-ai-triage

### Install dependencies

```bash
npm install
```

### Start the server

```bash
npm run dev
```

## 5. Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
MONGODB_URI=mongodb://127.0.0.1:27017
AI_MODE=fixture
```

Use `AI_MODE=fixture` to run without an API key, or `AI_MODE=live` to use the Groq API.

Keep your `.env` file private. Use `.env.example` to share the required variable names.

## 6. API Documentation

### POST /triage

Processes a customer support ticket and returns a structured triage result.

**Request Body:** A ticket object matching the provided ticket schema.

**Response includes:**

- `ticketId`
- `category`
- `severity`
- `refund`
- `reply_draft`
- `needs_human`
- `confidence`
- `refund_decision`
- `processing_status` (when degraded)

## 7. Task 2: Make It Not Lie

### 7.1 Results of All 12 Tickets

I ran all 12 tickets in live mode using the Groq API.

| Ticket | Category | Severity | Refund Decision | Human Review |
|---|---|---|---|---|
| T-1001 | Billing | High | Human Review | Yes |
| T-1002 | Technical Issue | High | Not Eligible | No |
| T-1003 | Technical Issue | Medium | Human Review | No |
| T-1004 | Cancellation | Medium | Not Eligible | No |
| T-1005 | Billing | Medium | Not Eligible | No |
| T-1006 | Billing | High | Human Review | No |
| T-1007 | Feature Request | Low | Not Eligible | No |
| T-1008 | Fraud | Critical | Human Review | Yes |
| T-1009 | Billing | Medium | Not Eligible | No |
| T-1010 | Billing | Low | Not Eligible | No |
| T-1011 | Product Question | Low | Not Eligible | No |
| T-1012 | Billing | Medium | Human Review | No |

**Important:** The AI suggests a refund, but the backend independently evaluates refund eligibility. The AI cannot directly approve a refund.

### 7.2 Ambiguous Tickets

Some tickets need additional investigation before a refund decision can be made.

- **T-1001:** Unexpected renewal. Sent for human review.
- **T-1003:** Missing order history after a phone change. Backend requires investigation.
- **T-1005:** Payment is still initiated and not confirmed successful. No refund approved.
- **T-1006:** Autopay dispute. Sent for human review.
- **T-1008:** Suspected unauthorized payments. Human investigation required.
- **T-1012:** Refund request involving an app malfunction. Sent for human review.

When the available information is insufficient, the backend does not automatically approve a refund.

### 7.3 Prompt Injection

The two prompt-injection tickets are T-1003 and T-1011.

I tested both using live AI responses.

**T-1003**

The model classified the issue as `technical_issue` and drafted a response about investigating missing order history.

The backend independently returned `human_review`.

**T-1011**

The model generated an unsupported product claim:

> The Premium plan does support offline usage.

This response shows that the model can still be influenced by instructions inside customer messages and may generate unverified product information.

This is a limitation of the current implementation and an area for improvement.

### 7.4 Independent Refund Safety

One important observation from the live runs was that the AI sometimes recommended refunds without sufficient evidence.

| Ticket | AI Suggested Refund | Backend Decision |
|---|---:|---|
| T-1006 | ₹1,499 | Human Review |
| T-1008 | ₹499 | Human Review |
| T-1012 | ₹250 | Human Review |

In all three cases, the backend approved amount remained ₹0.

This demonstrates why financial decisions should not depend entirely on an AI-generated response.

### 7.5 Dashboard Metric

**Human Review Rate**

This measures how many tickets the AI marks for human attention.

From the 12 live runs:

`2 / 12 × 100 = 16.67%`

Human Review Rate: **16.67%**

Backend refund escalations are handled separately through the refund safety gate.

## 8. Task 3: Backend Track

### 8.1 Handling 50 Tickets Per Second

If 50 tickets arrive per second during an outage, I would move from synchronous processing to an asynchronous queue-based architecture.

**Proposed flow:**

`Client → API → MongoDB → Message Queue → AI Workers → MongoDB`

Changes:

- Validate incoming tickets and check idempotency.
- Store tickets and push their IDs into a durable message queue.
- Process tickets using workers with controlled concurrency.
- Use bounded retries with exponential backoff.
- Use a circuit breaker when the AI provider becomes unavailable.

**Degraded experience:**

The API returns `202 Accepted` with the ticket ID and `pending` status.

The support tool shows that the ticket has been received but automated processing is temporarily delayed. The ticket remains stored and can be processed when the provider recovers.

### 8.2 Storage Design

I would use MongoDB with two collections.

**tickets**

- ticketId (unique)
- ticketData
- status (pending, processing, completed, failed)
- attempts
- createdAt
- updatedAt

**ticketResults**

- ticketId
- category
- severity
- refundDecision
- replyDraft
- needsHuman
- confidence
- processedAt

The queue message contains only the ticket ID. MongoDB remains the durable source of truth.

### 8.3 3 AM Debugging

I would use correlation IDs across the complete request lifecycle.

Each log entry should include:

- Request ID
- Ticket ID
- Event
- Processing attempt
- Duration
- Safe error information

This helps trace a ticket from API reception to AI processing and final result.

Customer messages, payment details and other sensitive information must never appear in logs.

**Note:** This is a proposed production design. The current implementation uses synchronous processing and MongoDB-based idempotency.

## 9. Task 4: AI Usage

### 9.1 AI Agents Used

I primarily used ChatGPT during this assignment.

I used it for understanding requirements, discussing architecture, implementation guidance, code review and debugging.

Approximate code contribution:

 - ChatGPT: Approximately 70-80%
- My own implementation: Approximately 20-30%

#### 9.2 Best Prompt

My approach was to understand the requirements and design the solution before implementation.

One prompt I used:

"Before implementing anything, let's understand the requirements and divide the responsibilities properly. Design the solution first, define what each component is responsible for, and keep responsibilities separate. We should work on one component at a time. Don't introduce unnecessary complexity or additional technologies. Explain the reasoning before suggesting implementation."

### 9.3 One Thing AI Got Wrong

During refund safety implementation, AI suggested an incorrect test expectation for unknown payment IDs.

It expected `not_eligible`, but the correct behaviour in my implementation was `human_review`.

I caught this by checking the actual refund safety logic and corrected the test expectation.

### 9.4 What I Implemented Myself

I implemented structured logging across the backend services.

I added logs for request handling, validation, AI retries, fallback, idempotency and refund decisions.

I chose to implement this myself because the architecture and logging points were already clear. Writing it directly was faster than explaining every small change to an AI agent.