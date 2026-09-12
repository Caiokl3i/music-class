import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import * as catalogService from '@/services/catalog.service'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/utils/errors'
import type { Catalog, PackageOption, PlanPackage } from '@/types/api'

const EMPTY_CATALOG: Catalog = {
  packages: [],
  lessonDurationMinutes: 60,
  creditValidityDays: 60,
  lowCreditThreshold: 1,
}

function unknownPackage(value: string): PackageOption {
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
  const toast = useToast()
  const [catalog, setCatalog] = useState<Catalog>(EMPTY_CATALOG)
  const [loading, setLoading] = useState(false)
  const loadedOnce = useRef(false)

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setCatalog(EMPTY_CATALOG)
      loadedOnce.current = false
      return
    }
    setLoading(true)
    try {
      setCatalog(await catalogService.getCatalog())
      loadedOnce.current = true
    } catch (error) {
      toast.error(getErrorMessage(error))
      if (!loadedOnce.current) {
        setCatalog(EMPTY_CATALOG)
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, toast])

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
      optionFor: (value) => map.get(value) ?? unknownPackage(value),
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
