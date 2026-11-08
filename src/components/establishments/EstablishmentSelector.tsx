import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useEstablishmentStore } from '@/stores/establishmentStore';
import { Building2, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { useTranslation } from 'react-i18next';
import { handleSupabaseError } from '@/lib/error-handler'

interface Establishment {
  id: string;
  name: string;
  status: 'active' | 'standby';
  logo_url?: string | null;
}

export function EstablishmentSelector() {
  const { t } = useTranslation();
  const { company, isLoading: isAuthLoading } = useAuthStore();
  const { selectedEstablishmentId, setSelectedEstablishment } = useEstablishmentStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch establishments
  const { data: establishments = [], isLoading: isQueryLoading } = useQuery({
    queryKey: ['establishments', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('establishments')
        .select('id, name, status, logo_url')
        .eq('company_id', company.id)
        .order('name');

      if (error) {


        const message = handleSupabaseError(error, {


          context: 'EstablishmentSelector',


          operation: 'query'


        });


        throw new Error(message);


      }
      return data as Establishment[];
    },
    enabled: !!company?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
  });

  // Filtrer uniquement les établissements actifs
  const activeEstablishments = establishments.filter(e => e.status === 'active');

  // Auto-select if only one establishment exists
  useEffect(() => {
    if (isQueryLoading) return; // Attendre que les données soient chargées
    if (activeEstablishments.length === 1 && !selectedEstablishmentId) {
      setSelectedEstablishment(activeEstablishments[0].id);
    }
  }, [activeEstablishments, selectedEstablishmentId, setSelectedEstablishment, isQueryLoading]);

  // Reset selectedEstablishmentId if it no longer exists in active establishments
  useEffect(() => {
    if (isQueryLoading) return; // Attendre que les données soient chargées
    if (selectedEstablishmentId && activeEstablishments.length > 0 && !activeEstablishments.find(e => e.id === selectedEstablishmentId)) {
      setSelectedEstablishment(null);
    }
  }, [selectedEstablishmentId, activeEstablishments, setSelectedEstablishment, isQueryLoading]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle loading state to prevent layout shift
  if (isAuthLoading || isQueryLoading) {
    return (
      <div className="w-full h-[34px] bg-muted/20 animate-pulse rounded-lg border border-transparent" />
    )
  }

  if (activeEstablishments.length === 0) {
    return null;
  }

  const selectedEstablishment = activeEstablishments.find(e => e.id === selectedEstablishmentId);
  const displayLabel = selectedEstablishment?.name || t('establishmentSelector.allEstablishments');

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors border border-border group"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-medium text-foreground truncate">
            {displayLabel}
          </span>
        </div>
        <ChevronDown className={cn(
          "w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-popover rounded-lg shadow-lg border border-border z-[100] max-h-60 overflow-y-auto">
          {activeEstablishments.length > 1 && (
            <button
              onClick={() => {
                setSelectedEstablishment(null);
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-xs hover:bg-muted/60 transition-colors flex items-center gap-2",
                !selectedEstablishmentId && "bg-primary/5 text-primary font-medium"
              )}
            >
              <Building2 className="w-3.5 h-3.5" />
              {t('establishmentSelector.allEstablishments')}
            </button>
          )}
          {activeEstablishments.map((estab) => (
            <button
              key={estab.id}
              onClick={() => {
                setSelectedEstablishment(estab.id);
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-xs hover:bg-muted/60 transition-colors flex items-center gap-2",
                selectedEstablishmentId === estab.id && "bg-primary/5 text-primary font-medium"
              )}
            >
              <Building2 className="w-3.5 h-3.5" />
              {estab.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
