import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as catalogService from '@/services/catalog.service'
import { useAuth } from '@/contexts/AuthContext'
import type { Catalog, PackageOption, PlanPackage } from '@/types/api'

const FALLBACK_PACKAGES: PackageOption[] = [
  { value: 'single', lessons: 1, price: 35, label: 'Aula avulsa' },
  { value: 'pack_4', lessons: 4, price: 130, label: 'Pacote mensal 1' },
  { value: 'pack_8', lessons: 8, price: 240, label: 'Pacote mensal 2' },
]

const FALLBACK: Catalog = {
  packages: FALLBACK_PACKAGES,
  lessonDurationMinutes: 60,
  creditValidityDays: 60,
  lowCreditThreshold: 1,
}

function fallbackOption(value: string): PackageOption {
  return {
    value,
    lessons: 0,
    price: 0,
    label: value || 'Pacote',
  }
}

type CatalogContextValue = Catalog & {
  loading: boolean
  reload: () => Promise<void>
  labelFor: (value: PlanPackage | null | undefined) => string
  optionFor: (value: PlanPackage) => PackageOption
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [catalog, setCatalog] = useState<Catalog>(FALLBACK)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setCatalog(FALLBACK)
      return
    }
    setLoading(true)
    try {
      setCatalog(await catalogService.getCatalog())
    } catch {
      setCatalog(FALLBACK)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void load()
  }, [load])

  const value = useMemo<CatalogContextValue>(() => {
    const map = new Map(catalog.packages.map((item) => [item.value, item]))
    return {
      ...catalog,
      loading,
      reload: load,
      labelFor: (value) => (value ? map.get(value)?.label ?? value : 'Pacote'),
      optionFor: (value) => map.get(value) ?? fallbackOption(value),
    }
  }, [catalog, loading, load])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const context = useContext(CatalogContext)
  if (!context) {
    throw new Error('useCatalog must be used within CatalogProvider')
  }
  return context
}
