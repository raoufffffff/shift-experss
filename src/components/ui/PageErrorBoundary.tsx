import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import i18n from '@/i18n/config'

interface Props {
  children: ReactNode
  pageName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PageErrorBoundary caught error:', error, errorInfo.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const t = (key: string, fallback: string) => i18n.t(key, { defaultValue: fallback })

      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4 max-w-md px-6">
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">
                {t('errors.pageError', 'Une erreur est survenue sur cette page')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('errors.pageErrorDescription', 'L\'erreur a été signalée automatiquement. Vous pouvez réessayer ou revenir à l\'accueil.')}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {t('common.retry', 'Réessayer')}
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted text-sm font-medium transition-colors"
              >
                {t('errors.backToHome', 'Retour à l\'accueil')}
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
