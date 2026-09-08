"use client";

import { Button } from "@/shared/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="grid min-h-[60vh] place-items-center text-center"><div><h2 className="text-2xl font-bold">Não foi possível carregar esta página</h2><p className="muted mt-2">Tente novamente. Se o problema continuar, consulte os logs usando o identificador exibido.</p><Button className="mt-6" onClick={reset}>Tentar novamente</Button></div></div>;
}
