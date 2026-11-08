# Tests Web - Shift Express

## ✅ Infrastructure Setup Complete

L'infrastructure de tests est maintenant fonctionnelle!

### Setup Effectué

- **Vitest 3.2.4** configuré avec coverage V8
- **Testing Library React 16.3** pour tests composants
- **jsdom/happy-dom** pour environnement navigateur simulé
- **Test helpers** avec providers (React Query, React Router)
- **Mocks Supabase** pour tests d'intégration

### Scripts Disponibles

```bash
# Lancer tous les tests
npm test

# Mode watch (auto-reload)
npm run test:watch

# Interface UI
npm run test:ui

# Coverage report
npm run test:coverage

# Run once (CI)
npm run test:run
```

### Structure

```
src/tests/
├── setup.ts                    # Configuration globale
├── helpers/
│   ├── test-utils.tsx         # Render avec providers
│   └── supabase-mock.ts       # Mocks Supabase
├── stores/                     # Tests Zustand stores
├── components/                 # Tests composants UI
├── hooks/                      # Tests custom hooks
└── integration/                # Tests d'intégration
```

### Tests Existants

#### ✅ Tests Simples (5 tests)
- `simple.test.ts` - Validation de l'infrastructure

### Prochaines Étapes

1. **Stores** (Priorité HAUTE)
   - `authStore` - Login, logout, session, signup
   - `establishmentStore` - Persistance localStorage

2. **Composants UI** (Priorité HAUTE)
   - `Button` - Variants, sizes, interactions, a11y
   - `Input` - States, validation, error messages, a11y
   - `Card`, `Dialog`, `Select`, etc.

3. **Custom Hooks** (Priorité MOYENNE)
   - `useNotificationSound`
   - Hooks React Query

4. **Tests d'Intégration** (Priorité MOYENNE)
   - Auth flow complet
   - Navigation protégée
   - CRUD operations

5. **E2E avec Playwright** (Priorité BASSE)
   - User journeys critiques
   - Cross-browser testing

### Objectif Coverage

- **Seuil minimum**: 60%
- **Objectif**: 80%+
- **Priorité**: Stores > Composants > Hooks > Integration

### Notes Techniques

**Problème actuel**: Conflit de version React entre Testing Library et le projet.
**Solution temporaire**: Tests simples fonctionnent, tests composants à résoudre.
**Ticket**: Investiguer compatibilité React 18.2 avec @testing-library/react 16.3

### Bonnes Pratiques

1. **Isoler les tests**: Un test = une assertion
2. **Nommer clairement**: `should login successfully with valid credentials`
3. **AAA Pattern**: Arrange → Act → Assert
4. **Mocks**: Utiliser les helpers fournis
5. **Cleanup**: Automatic via setup.ts

### Exemples

**Test Store:**
```typescript
describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, company: null })
  })

  it('should set user in store', () => {
    const { setUser } = useAuthStore.getState()
    setUser(mockUser)
    expect(useAuthStore.getState().user).toEqual(mockUser)
  })
})
```

**Test Composant:**
```typescript
describe('Button', () => {
  it('should render with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

**Test Hook:**
```typescript
describe('useCustomHook', () => {
  it('should return expected value', () => {
    const { result } = renderHook(() => useCustomHook())
    expect(result.current.value).toBe('expected')
  })
})
```

---

**Créé le**: 2025-10-12
**Status**: ✅ Infrastructure prête, tests à compléter
**Coverage actuel**: 0% → Objectif 60%+
