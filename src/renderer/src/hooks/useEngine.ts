import { useEffect, useState } from 'react'
import type { EngineState } from '../../../shared/ipc'
import { setServerUrl } from '../api/client'

export function useEngine(): EngineState {
  const [state, setState] = useState<EngineState>({ status: 'starting' })
  useEffect(() => {
    const apply = (s: EngineState): void => {
      if (s.status === 'ready') setServerUrl(s.url)
      setState(s)
    }
    void window.api.engine.getState().then(apply)
    return window.api.engine.onState(apply)
  }, [])
  return state
}
