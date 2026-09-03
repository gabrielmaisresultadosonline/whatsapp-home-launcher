import React, { useState } from "react";
import TemplateVariablesDialog from "@/components/whatsapp/TemplateVariablesDialog";
import { TemplateVariablesGuide } from "@/components/whatsapp/TemplateVariablesGuide";
import { Button } from "@/components/ui/button";

// Página temporária de verificação visual (removida após o teste).
const sampleTemplate = {
  id: "tpl_teste",
  name: "pedido_confirmado",
  language: "pt_BR",
  status: "APPROVED",
  components: [
    { type: "HEADER", format: "IMAGE", example: { header_handle: ["https://example.com/x.jpg"] } },
    { type: "BODY", text: "Olá {{1}}, seu pedido {{2}} foi confirmado. Código: {{3}}." },
    { type: "FOOTER", text: "Equipe MRO" },
    { type: "BUTTONS", buttons: [
      { type: "QUICK_REPLY", text: "Falar com humano" },
      { type: "URL", text: "Ver pedido", url: "https://loja.com/pedido/{{1}}", example: ["123"] },
    ] },
  ],
};

export default function TemplateVarsPreview() {
  const [open, setOpen] = useState(true);
  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <Button onClick={() => setOpen(true)}>Abrir editor</Button>
      <TemplateVariablesDialog
        open={open}
        onOpenChange={setOpen}
        template={sampleTemplate}
        contacts={[{ id: "c1", name: "Maria", wa_id: "5511999999999", metadata: { pedido: "#4521" } }]}
        onApply={() => setOpen(false)}
      />
      <TemplateVariablesGuide />
    </div>
  );
}
