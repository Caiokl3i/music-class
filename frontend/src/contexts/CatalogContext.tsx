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
import type { PackageOption, PlanPackage } from '@/types/api'

const FALLBACK: PackageOption[] = [
  { value: 'single', lessons: 1, price: 35, label: 'Aula avulsa' },
  { value: 'pack_4', lessons: 4, price: 130, label: 'Pacote mensal 1' },
  { value: 'pack_8', lessons: 8, price: 240, label: 'Pacote mensal 2' },
]

type CatalogContextValue = {
  packages: PackageOption[]
  loading: boolean
  labelFor: (value: PlanPackage | null | undefined) => string
  optionFor: (value: PlanPackage) => PackageOption
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [packages, setPackages] = useState<PackageOption[]>(FALLBACK)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setPackages(FALLBACK)
      return
    }
    setLoading(true)
    try {
      setPackages(await catalogService.listPackages())
    } catch {
      setPackages(FALLBACK)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void load()
  }, [load])

  const value = useMemo<CatalogContextValue>(() => {
    const map = new Map(packages.map((item) => [item.value, item]))
    return {
      packages,
      loading,
      labelFor: (value) => (value ? map.get(value)?.label ?? value : 'Pacote'),
      optionFor: (value) => map.get(value) ?? FALLBACK.find((item) => item.value === value)!,
    }
  }, [packages, loading])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const context = useContext(CatalogContext)
  if (!context) {
    throw new Error('useCatalog must be used within CatalogProvider')
  }
  return context
}
