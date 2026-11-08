import { useState, useEffect, useRef, useCallback } from 'react'
import { searchAddresses, GeocodingResult } from '@/utils/geocoding'
import { MapPin, Loader2, X, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface AddressAutocompleteProps {
  label?: string
  placeholder?: string
  selectedAddress: GeocodingResult | null
  onSelect: (result: GeocodingResult | null) => void
  error?: string
  className?: string
  required?: boolean
  /** 'address' = full addresses only (excludes cities), 'city' = cities only, undefined = all */
  mode?: 'address' | 'city'
}

export function AddressAutocomplete({
  label,
  placeholder,
  selectedAddress,
  onSelect,
  error,
  className,
  required = false,
  mode,
}: AddressAutocompleteProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced search
  const searchDebounced = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!searchQuery || searchQuery.length < 3) {
      setSuggestions([])
      setIsOpen(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchAddresses(searchQuery, mode === 'address' ? 10 : 5)
        // Filter based on mode
        let filtered = results
        if (mode === 'address') {
          filtered = results.filter(r => r.resultType !== 'municipality')
        } else if (mode === 'city') {
          filtered = results.filter(r => r.resultType === 'municipality')
        }
        setSuggestions(filtered)
        setIsOpen(filtered.length > 0)
        setHighlightedIndex(-1)
      } catch (err) {
        console.error('Address search error:', err)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 300)
  }, [mode])

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setQuery(newValue)
    searchDebounced(newValue)
  }

  // Handle suggestion selection
  const handleSelect = (result: GeocodingResult) => {
    onSelect(result)
    setQuery('')
    setSuggestions([])
    setIsOpen(false)
  }

  // Clear selection
  const handleClear = () => {
    onSelect(null)
    setQuery('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const defaultPlaceholder = t('establishments.searchAddressPlaceholder', { defaultValue: 'Tapez une adresse...' })

  // If address is selected, show the confirmed address
  if (selectedAddress) {
    return (
      <div className={cn('space-y-2', className)}>
        {label && (
          <label className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-emerald-900 dark:text-emerald-100 truncate">
              {selectedAddress.formattedAddress}
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-300">
              {selectedAddress.city}{selectedAddress.postalCode ? ` (${selectedAddress.postalCode})` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded transition-colors"
            title={t('common.edit')}
          >
            <X className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      </div>
    )
  }

  // Show search input
  return (
    <div ref={wrapperRef} className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <MapPin className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder || defaultPlaceholder}
          autoComplete="off"
          className={cn(
            'w-full pl-10 pr-4 py-2 border rounded-md text-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'bg-background',
            error && 'border-red-500 focus:ring-red-500'
          )}
        />

        {/* Suggestions dropdown - positioned relative to input container */}
        {isOpen && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-[100] mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
                type="button"
                className={cn(
                  'w-full px-3 py-2.5 text-left text-sm flex items-start gap-3 hover:bg-accent transition-colors border-b last:border-b-0',
                  highlightedIndex === index && 'bg-accent'
                )}
                onClick={() => handleSelect(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {suggestion.formattedAddress}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {suggestion.city}{suggestion.postalCode ? ` - ${suggestion.postalCode}` : ''} • {suggestion.country || 'France'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {isOpen && query.length >= 3 && suggestions.length === 0 && !isLoading && (
          <div className="absolute left-0 right-0 top-full z-[100] mt-1 bg-background border rounded-md shadow-lg p-3 text-sm text-muted-foreground text-center">
            {t('establishments.noAddressFound', { defaultValue: 'Aucune adresse trouvée' })}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
