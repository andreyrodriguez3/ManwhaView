import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/** Evita la pantalla en blanco si una pantalla falla al dibujarse. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div className="center">
        <h2>Algo salió mal</h2>
        <p className="error small">{this.state.error.message}</p>
        <button onClick={() => this.setState({ error: null })}>Reintentar</button>
      </div>
    )
  }
}
