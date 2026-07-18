import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Customer } from "@/hooks/useCustomers";

interface Props {
  customers: Customer[];
  value: Customer | null;
  onSelect: (c: Customer | null) => void;
  onNew: () => void;
}

export function CustomerCombobox({ customers, value, onSelect, onNew }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {value ? `${value.name} — ${value.phone}` : "Select existing customer"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover z-50">
        <Command>
          <CommandInput placeholder="Search by name, phone, area..." />
          <CommandList>
            <CommandEmpty>
              <button
                type="button"
                onClick={() => { setOpen(false); onNew(); }}
                className="flex items-center gap-2 text-sm text-primary py-2 mx-auto"
              >
                <Plus className="h-4 w-4" /> Add new customer
              </button>
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__new__"
                onSelect={() => { setOpen(false); onNew(); }}
                className="text-primary"
              >
                <Plus className="mr-2 h-4 w-4" /> New Customer
              </CommandItem>
              {customers.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.phone} ${c.area || ""}`}
                  onSelect={() => { onSelect(c); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value?.id === c.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.phone} · {c.area || "—"}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
