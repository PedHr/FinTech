import { requirePageSession } from "@/server/auth/session";
import { financeOptions } from "@/server/finance/queries";
import { env } from "@/shared/lib/env";
import { UploadForm } from "@/features/imports/upload-form";
import { Card, PageHeader } from "@/shared/ui/card";

export default async function NewImportPage() {
  const session = await requirePageSession(); const options = await financeOptions({ userId: session.user.id });
  return <div className="mx-auto max-w-3xl space-y-7"><PageHeader title="Importar fatura" description="Primeiro escolha o cartão; depois revise cada lançamento encontrado." /><Card><UploadForm cards={options.cards.map((card) => ({ id: card.id, name: `${card.account.name}` }))} storageDriver={env().STORAGE_DRIVER} /></Card></div>;
}
