
import logger from "../utils/logger.js";

const hasRefundRequest = (text) =>
  /\b(refund|reimburse|reverse|money back|double charge|charged twice|charged two times|deducted twice)\b/i.test(text);

const hasFraudClaim = (text) =>
  /\b(fraud|unauthorized|never installed|never subscribed|not authorized)\b/i.test(text);

const hasUnexpectedRenewalClaim = (text) =>
  /\b(unexpected renewal|without telling me|did not agree|didn't agree|autopay.*off|turned off autopay|wanted to stop|stop.*renewal)\b/i.test(text);

const hasActivationIssue = (text) =>
  /\b(plan.*not activated|not activated.*plan|still.*free version|paid.*but.*free)\b/i.test(text);

const hasTechnicalIssue = (text) =>
  /\b(app.*crash|crashes|does not work|doesn't work|useless|not working)\b/i.test(text);

const humanReview = (reason) => ({
  status: "human_review",
  approved_amount_inr: 0,
  payment_ids: [],
  reason
});

const notEligible = (reason) => ({
  status: "not_eligible",
  approved_amount_inr: 0,
  payment_ids: [],
  reason
});

// Centralized refund decision logging.
const logRefundDecision = (ticket, result) => {
  logger.info("refund_safety_decision", {
    ticketId: ticket.id,
    decision: result.status,
  });

  if (result.status === "human_review") {
    logger.warn("refund_human_review_required", {
      ticketId: ticket.id,
    });
  }

  return result;
};

// Find repeated successful renewals with the same amount on the same date.
const findDuplicateRenewals = (purchases) => {
  const groups = new Map();

  for (const payment of purchases) {
    if (
      payment.type !== "renewal" ||
      payment.status !== "successful"
    ) {
      continue;
    }

    const date = payment.at.slice(0, 10);
    const key = `${payment.type}-${payment.amount_inr}-${date}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(payment);
  }

  // Keep the first payment; the additional successful payments
  // are potential duplicate charges.
  return [...groups.values()].flatMap((group) =>
    group.length > 1
      ? group.sort((a, b) => new Date(a.at) - new Date(b.at)).slice(1)
      : []
  );
};

export const evaluateRefund = (ticket, aiRefund, triageResult) => {
  logger.info("refund_safety_check_started", {
    ticketId: ticket.id,
  });

  const message = `${ticket.subject} ${ticket.body}`;

  const refundRequested =
    aiRefund.requested || hasRefundRequest(message);

  // No refund request: cancellation or general support only.
  if (!refundRequested) {
    return logRefundDecision(
      ticket,
      notEligible("No refund request identified.")
    );
  }

  // Suspected fraud always requires human investigation.
  if (
    triageResult.category === "fraud" ||
    hasFraudClaim(message)
  ) {
    return logRefundDecision(
      ticket,
      humanReview("Suspected unauthorized payment requires investigation.")
    );
  }

  // Unexpected renewal claims require checking consent and billing details.
  if (hasUnexpectedRenewalClaim(message)) {
    return logRefundDecision(
      ticket,
      humanReview("Unexpected renewal claim requires human review.")
    );
  }

  // Technical complaints need investigation before refund eligibility.
  if (
    triageResult.category === "technical_issue" ||
    hasTechnicalIssue(message)
  ) {
    return logRefundDecision(
      ticket,
      humanReview("Technical issue requires investigation before refund.")
    );
  }

  // The ticket schema does not contain subscription activation status.
  if (hasActivationIssue(message)) {
    const successfulRenewal = ticket.purchases.some(
      (payment) =>
        payment.type === "renewal" &&
        payment.status === "successful"
    );

    if (successfulRenewal) {
      return logRefundDecision(
        ticket,
        humanReview(
          "Payment is successful, but subscription activation cannot be verified from the available records."
        )
      );
    }

    return logRefundDecision(
      ticket,
      notEligible("No successful renewal payment is available to verify.")
    );
  }

  // A duplicate refund is eligible only when extra successful payments
  // are independently visible in the purchase records.
  const duplicatePayments = findDuplicateRenewals(ticket.purchases);

  if (duplicatePayments.length > 0) {
    return logRefundDecision(ticket, {
      status: "eligible",
      approved_amount_inr: duplicatePayments.reduce(
        (total, payment) => total + payment.amount_inr,
        0
      ),
      payment_ids: duplicatePayments.map((payment) => payment.id),
      reason: "Additional successful renewal payments were found on the same date."
    });
  }

  // No duplicate payment or other automatically eligible case was verified.
  if (aiRefund.requested) {
    const recommendedPayments = ticket.purchases.filter((payment) =>
      aiRefund.payment_ids.includes(payment.id)
    );

    if (recommendedPayments.length !== aiRefund.payment_ids.length) {
      return logRefundDecision(
        ticket,
        humanReview("AI recommended unknown payment IDs.")
      );
    }

    if (
      recommendedPayments.some(
        (payment) => payment.status !== "successful"
      )
    ) {
      return logRefundDecision(
        ticket,
        notEligible("Only successful payments can be considered for refunds.")
      );
    }
  }

  return logRefundDecision(
    ticket,
    notEligible(
      "No refund eligibility condition was verified from the available purchase records."
    )
  );
};
