export const SELLABLE_ITEM_FORM_ID = 'sellable-item-form'

export type NavbarActions = {
  showDelete: boolean
  deleting: boolean
  busy: boolean
  onDelete: () => void
  primaryLabel: string
  primaryLoading: boolean
  primaryForm: string | null
  onPrimary: (() => void) | null
}

type NavbarActionStore = {
  owner: number
  current: NavbarActions | null
}

let nextOwner = 1

export function useNavbarActions() {
  return useState<NavbarActionStore>('candor-navbar-actions', () => ({
    owner: 0,
    current: null
  }))
}

export function bindNavbarActions() {
  const store = useNavbarActions()
  const owner = nextOwner++

  function set(current: NavbarActions | null) {
    store.value = { owner, current }
  }

  onScopeDispose(() => {
    if (store.value.owner === owner) {
      store.value = { owner: 0, current: null }
    }
  })

  return { set }
}
