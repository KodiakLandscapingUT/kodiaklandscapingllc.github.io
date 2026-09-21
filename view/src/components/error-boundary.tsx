import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function DefaultFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <Box sx={{ minHeight: '100vh', width: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 3 }}>
      <Paper variant="outlined" sx={{ maxWidth: 512, width: 1, p: 4, textAlign: 'center' }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          Something went wrong
        </Typography>
        <Typography sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
          This part of the app hit an error. The rest of the app is still
          running.
        </Typography>
        {/* Dev only: messages can carry API responses and other internals. */}
        {import.meta.env.DEV ? (
          <Box component="pre" sx={{ mt: 2, overflowX: 'auto', borderRadius: 1, bgcolor: 'action.hover', p: 1.5, textAlign: 'left', fontSize: '0.75rem', color: 'text.primary' }}>
            {error.message || String(error)}
          </Box>
        ) : null}
        <Button variant="contained" onClick={resetError} sx={{ mt: 2 }}>
          Try again
        </Button>
      </Paper>
    </Box>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      'ErrorBoundary caught an error:',
      toError(error),
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return <Fallback error={error} resetError={this.resetError} />;
  }
}
