import { notFound } from "next/navigation";
import { requirePageSession } from "@/server/auth/session";
import { financeOptions } from "@/server/finance/queries";
import { importReview } from "@/server/imports/queries";
import { ProcessingState } from "@/features/imports/processing-state";
import { ReviewTable } from "@/features/imports/review-table";
import { Card, PageHeader } from "@/shared/ui/card";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePageSession(); const { id } = await params; const context = { userId: session.user.id };
  const [item, options] = await Promise.all([importReview(context, id), financeOptions(context)]); if (!item) notFound();
  const ready = item.status === "REVIEW_READY";
  return <div className="space-y-7"><PageHeader title={ready ? "Revise os lançamentos" : "Processamento da fatura"} description={`${item.creditCard.account.name} · ${item.displayName}`} /><Card>{ready ? <ReviewTable importId={item.id} categories={options.categories} drafts={item.drafts.map((draft) => ({ id: draft.id, included: draft.included, description: draft.description, transactionDate: draft.transactionDate.toISOString().slice(0, 10), amount: draft.amount.toFixed(2), categoryId: draft.categoryId, duplicateStatus: draft.duplicateStatus, kind: draft.kind }))} /> : <ProcessingState id={item.id} status={item.status} errorCode={item.errorCode} message={item.errorMessage} />}</Card></div>;
}
