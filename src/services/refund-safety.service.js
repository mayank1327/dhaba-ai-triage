
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
  const message = `${ticket.subject} ${ticket.body}`;

  const refundRequested =
    aiRefund.requested || hasRefundRequest(message);

  // No refund request: cancellation or general support only.
  if (!refundRequested) {
    return notEligible("No refund request identified.");
  }

  // Suspected fraud always requires human investigation.
  if (
    triageResult.category === "fraud" ||
    hasFraudClaim(message)
  ) {
    return humanReview("Suspected unauthorized payment requires investigation.");
  }

  // Unexpected renewal claims require checking consent and billing details.
  if (hasUnexpectedRenewalClaim(message)) {
    return humanReview("Unexpected renewal claim requires human review.");
  }

  // Technical complaints need investigation before refund eligibility.
  if (
    triageResult.category === "technical_issue" ||
    hasTechnicalIssue(message)
  ) {
    return humanReview("Technical issue requires investigation before refund.");
  }

  // The ticket schema does not contain subscription activation status.
  if (hasActivationIssue(message)) {
    const successfulRenewal = ticket.purchases.some(
      (payment) =>
        payment.type === "renewal" &&
        payment.status === "successful"
    );

    if (successfulRenewal) {
      return humanReview(
        "Payment is successful, but subscription activation cannot be verified from the available records."
      );
    }

    return notEligible(
      "No successful renewal payment is available to verify."
    );
  }

  // A duplicate refund is eligible only when extra successful payments
  // are independently visible in the purchase records.
  const duplicatePayments = findDuplicateRenewals(ticket.purchases);

  if (duplicatePayments.length > 0) {
    return {
      status: "eligible",
      approved_amount_inr: duplicatePayments.reduce(
        (total, payment) => total + payment.amount_inr,
        0
      ),
      payment_ids: duplicatePayments.map((payment) => payment.id),
      reason: "Additional successful renewal payments were found on the same date."
    };
  }

  // No duplicate payment or other automatically eligible case was verified.
  if (aiRefund.requested) {
    const recommendedPayments = ticket.purchases.filter((payment) =>
      aiRefund.payment_ids.includes(payment.id)
    );

    if (recommendedPayments.length !== aiRefund.payment_ids.length) {
      return humanReview("AI recommended unknown payment IDs.");
    }

    if (
      recommendedPayments.some(
        (payment) => payment.status !== "successful"
      )
    ) {
      return notEligible(
        "Only successful payments can be considered for refunds."
      );
    }
  }

  return notEligible(
    "No refund eligibility condition was verified from the available purchase records."
  );
};
