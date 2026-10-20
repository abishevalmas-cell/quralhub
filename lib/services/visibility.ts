import type { offers, requestMessages } from "@/lib/db/schema";

type Offer = typeof offers.$inferSelect;
type Message = typeof requestMessages.$inferSelect;

// The only way offers leave the server for customers: supplier, yuan price, cost and internal notes are dropped.
export function customerOffer(offer: Offer) {
  return {
    id: offer.id,
    requestId: offer.requestId,
    status: offer.status,
    title: offer.title,
    oe: offer.oe,
    manufacturer: offer.manufacturer,
    kind: offer.kind,
    condition: offer.condition,
    qty: offer.qty,
    priceKzt: offer.priceKzt,
    leadDaysMin: offer.leadDaysMin,
    leadDaysMax: offer.leadDaysMax,
    fitment: offer.fitment,
    note: offer.note,
    validUntil: offer.validUntil,
    createdAt: offer.createdAt,
  };
}
export type CustomerOffer = ReturnType<typeof customerOffer>;

export const customerVisibleOfferStatuses = new Set<Offer["status"]>(["published", "accepted", "rejected"]);

export function customerMessages(messages: Message[]) {
  return messages
    .filter((m) => !m.internal)
    .map((m) => ({ id: m.id, kind: m.kind, body: m.body, authorId: m.authorId, createdAt: m.createdAt }));
}
