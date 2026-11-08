import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';
import { Upload, X, AlertCircle, CheckCircle, FileText, Download, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Select } from '@/components/ui/Select';
import { detectDelimiter, mapColumns, parseCSVLine, type MappingResult } from '@/utils/csvSmartMapper';

interface CsvRow {
  first_name: string;
  last_name: string;
  email: string;
  establishment_id?: string;
  verified_hourly_rate?: number;
  isValid: boolean;
  errors: string[];
}

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  establishments: Array<{ id: string; name: string }>;
}

export function CsvImportDialog({ open, onOpenChange, establishments }: CsvImportDialogProps) {
  const { t } = useTranslation();
  const { company } = useAuthStore();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CsvRow[]>([]);
  const [defaultEstablishment, setDefaultEstablishment] = useState<string>('');
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [mappingResult, setMappingResult] = useState<MappingResult | null>(null);
  const [importStep, setImportStep] = useState(0);

  const parseCSV = useCallback((text: string): CsvRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Limit to 500 rows max (+ 1 for header)
    if (lines.length > 501) {
      toast.error(t('employees.csv.tooManyRows', { max: 500 }));
      return [];
    }

    // Auto-select establishment if only one exists
    if (establishments.length === 1 && !defaultEstablishment) {
      setDefaultEstablishment(establishments[0].id);
    }

    // Auto-detect delimiter
    const delimiter = detectDelimiter(text);

    // Parse header with detected delimiter
    const headerValues = parseCSVLine(lines[0], delimiter);

    // Smart mapping of columns
    const mapping = mapColumns(headerValues);
    setMappingResult(mapping);

    // Check if we have required fields
    if (mapping.firstName === null || mapping.lastName === null || mapping.email === null) {
      toast.error(t('employees.csv.missingRequiredColumns'));
      return [];
    }

    // Show confidence warning if low
    if (mapping.confidence < 0.8) {
      toast.warning(
        t('employees.csv.lowConfidence', {
          confidence: Math.round(mapping.confidence * 100)
        })
      );
    }

    // Show suggestions for renamed columns
    if (Object.keys(mapping.suggestions).length > 0) {
      const suggestionsText = Object.entries(mapping.suggestions)
        .map(([original, suggested]) => `"${original}" → ${suggested}`)
        .join(', ');
      toast.info(t('employees.csv.columnsMapped', { mappings: suggestionsText }));
    }

    // Parse data rows
    const rows: CsvRow[] = [];
    const emailsSeen = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = parseCSVLine(line, delimiter);

      const first_name = values[mapping.firstName]?.trim() || '';
      const last_name = values[mapping.lastName]?.trim() || '';
      const email = values[mapping.email]?.trim().toLowerCase() || '';
      const establishment = mapping.establishment !== null ? values[mapping.establishment]?.trim() : '';
      const hourlyRateStr = mapping.hourlyRate !== null ? values[mapping.hourlyRate]?.trim() : '';

      const errors: string[] = [];

      // Validate required fields
      if (!first_name) errors.push(t('employees.csv.missingFirstName'));
      if (!last_name) errors.push(t('employees.csv.missingLastName'));
      if (!email) {
        errors.push(t('employees.csv.missingEmail'));
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(t('employees.csv.invalidEmail'));
      } else if (emailsSeen.has(email)) {
        errors.push(t('employees.csv.duplicateEmail'));
      } else {
        emailsSeen.add(email);
      }

      // Find establishment by name if provided
      let establishment_id: string | undefined;
      if (establishment) {
        const found = establishments.find(e =>
          e.name.toLowerCase() === establishment.toLowerCase()
        );
        if (found) {
          establishment_id = found.id;
        } else {
          errors.push(t('employees.csv.establishmentNotFound', { name: establishment }));
        }
      }

      // Parse and validate hourly rate
      let verified_hourly_rate: number | undefined;
      if (hourlyRateStr) {
        const rate = parseFloat(hourlyRateStr);
        if (isNaN(rate)) {
          errors.push(t('employees.csv.invalidHourlyRate'));
        } else if (rate < 0) {
          errors.push(t('employees.csv.negativeHourlyRate'));
        } else {
          verified_hourly_rate = rate;
        }
      }

      rows.push({
        first_name,
        last_name,
        email,
        establishment_id,
        verified_hourly_rate,
        isValid: errors.length === 0,
        errors,
      });
    }

    return rows;
  }, [establishments, t]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error(t('employees.csv.invalidFileType'));
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setParsedData(parsed);
      if (parsed.length > 0) {
        setStep('preview');
      }
    };
    reader.readAsText(selectedFile);
  }, [parseCSV, t]);

  const importMutation = useMutation({
    mutationFn: async (rows: CsvRow[]) => {
      if (!company?.id) throw new Error('No company ID');

      // Step 1: Preparing data
      setImportStep(1);
      const validRows = rows.filter(r => r.isValid);

      const employees = validRows.map(row => ({
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        establishment_id: row.establishment_id || defaultEstablishment || null,
        verified_hourly_rate: row.verified_hourly_rate || null,
      }));

      // Step 2: Importing employees
      setImportStep(2);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/csv-import-employees`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            employees,
            company_id: company.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Import failed');
      }

      // Step 3: Finalizing
      setImportStep(3);

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(t('employees.csv.importSuccess', { count: data?.imported || 0 }));
      if (data?.failed > 0) {
        toast.warning(t('employees.csv.importWarning', { count: data.failed }));
      }
      resetDialog();
    },
    onError: (error) => {
      console.error('Import error:', error);
      toast.error(t('employees.csv.importError'));
      setImportStep(0);
    },
  });

  const resetDialog = () => {
    setFile(null);
    setParsedData([]);
    setDefaultEstablishment('');
    setStep('upload');
    setMappingResult(null);
    setImportStep(0);
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const template = 'first_name,last_name,email,establishment,hourly_rate\nJohn,Doe,john@example.com,,25.50\nJane,Smith,jane@example.com,,30.00';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'employee_import_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleImport = () => {
    if (parsedData.length === 0) return;

    const validRows = parsedData.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error(t('employees.csv.noValidRows'));
      return;
    }

    // Check if some rows don't have establishment and no default is selected
    const rowsWithoutEstablishment = validRows.filter(r => !r.establishment_id);
    if (rowsWithoutEstablishment.length > 0 && !defaultEstablishment) {
      toast.error(t('employees.csv.selectDefaultEstablishment'));
      return;
    }

    importMutation.mutate(parsedData);
  };

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('employees.csv.title')}</DialogTitle>
          <DialogDescription>
            {step === 'upload'
              ? t('employees.csv.description')
              : t('employees.csv.previewDescription', { total: parsedData.length, valid: validCount, invalid: invalidCount })
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            {/* File upload area */}
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <div className="flex flex-col items-center gap-4">
                <Upload className="w-12 h-12 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('employees.csv.uploadPrompt')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('employees.csv.uploadHint')}
                  </p>
                </div>
                <label
                  htmlFor="csv-upload"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4 cursor-pointer"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {t('employees.csv.selectFile')}
                </label>
              </div>
            </div>

            {/* CSV Format instructions */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{t('employees.csv.formatTitle')}</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('employees.csv.downloadTemplate')}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('employees.csv.formatDescription')}
              </p>
              <div className="bg-background rounded border p-3 mt-2 font-mono text-xs overflow-x-auto whitespace-pre-line">
                {t('employees.csv.formatExample')}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t('employees.csv.formatNote')}
              </p>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">{validCount} {t('employees.csv.validRows')}</span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">{invalidCount} {t('employees.csv.invalidRows')}</span>
                </div>
              )}
            </div>

            {/* Establishment selector for import */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('employees.csv.importToEstablishment')}
              </label>
              <Select
                value={defaultEstablishment}
                onChange={(e) => setDefaultEstablishment(e.target.value)}
                options={[
                  { value: '', label: t('employees.csv.selectEstablishment') },
                  ...establishments.map(e => ({ value: e.id, label: e.name })),
                ]}
              />
              <p className="text-xs text-muted-foreground">
                {t('employees.csv.importToEstablishmentHint')}
              </p>
            </div>

            {/* Data preview table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">{t('employees.csv.status')}</th>
                      <th className="text-left p-2 font-medium">{t('employees.firstName')}</th>
                      <th className="text-left p-2 font-medium">{t('employees.lastName')}</th>
                      <th className="text-left p-2 font-medium">{t('employees.email')}</th>
                      <th className="text-left p-2 font-medium">{t('employees.hourlyRate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((row, index) => (
                      <tr
                        key={index}
                        className={`border-t ${!row.isValid ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}
                      >
                        <td className="p-2">
                          {row.isValid ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <div className="flex items-center gap-1 group relative">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <div className="hidden group-hover:block absolute left-6 top-0 z-10 bg-popover border rounded p-2 shadow-lg whitespace-nowrap">
                                <ul className="text-xs text-red-600 space-y-1">
                                  {row.errors.map((error, i) => (
                                    <li key={i}>• {error}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-2">{row.first_name || '-'}</td>
                        <td className="p-2">{row.last_name || '-'}</td>
                        <td className="p-2">{row.email || '-'}</td>
                        <td className="p-2">
                          {row.verified_hourly_rate ? `${row.verified_hourly_rate.toFixed(2)} $` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setParsedData([]);
                }}
              >
                {t('common.back')}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetDialog}>
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={validCount === 0 || importMutation.isPending}
                >
                  {importMutation.isPending
                    ? t('employees.csv.importing')
                    : t('employees.csv.importButton', { count: validCount })
                  }
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Loading Modal */}
    <Dialog open={importMutation.isPending} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideClose>
        <DialogHeader>
          <DialogTitle className="text-center">
            {t('employees.csv.importingTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-6">
          {/* Step 1: Preparing */}
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              importStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {importStep > 1 ? (
                <Check className="w-4 h-4" />
              ) : importStep === 1 ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                '1'
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${importStep >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                {t('employees.csv.importStep1')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('employees.csv.importStep1Description')}
              </p>
            </div>
          </div>

          {/* Step 2: Importing */}
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              importStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {importStep > 2 ? (
                <Check className="w-4 h-4" />
              ) : importStep === 2 ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                '2'
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${importStep >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                {t('employees.csv.importStep2')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('employees.csv.importStep2Description')}
              </p>
            </div>
          </div>

          {/* Step 3: Finalizing */}
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              importStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {importStep > 3 ? (
                <Check className="w-4 h-4" />
              ) : importStep === 3 ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                '3'
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${importStep >= 3 ? 'text-foreground' : 'text-muted-foreground'}`}>
                {t('employees.csv.importStep3')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('employees.csv.importStep3Description')}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
