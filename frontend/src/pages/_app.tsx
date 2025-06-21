import type { AppProps } from 'next/app'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '../contexts/AuthContext'
import '../styles/globals.css'

// Create a futuristic dark theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00f5ff', // Cyan
      light: '#5ddef4',
      dark: '#00bcd4',
    },
    secondary: {
      main: '#7c4dff', // Purple
      light: '#b47cff',
      dark: '#3f1dcb',
    },
    background: {
      default: '#0a0e1a',
      paper: '#141b2d',
    },
    text: {
      primary: '#ffffff',
      secondary: '#8b9dc3',
    },
    success: {
      main: '#00e676',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      background: 'linear-gradient(45deg, #00f5ff, #7c4dff)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, rgba(20, 27, 45, 0.9), rgba(20, 27, 45, 0.7))',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 245, 255, 0.1)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 245, 255, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '12px 24px',
        },
        contained: {
          background: 'linear-gradient(45deg, #00f5ff, #7c4dff)',
          boxShadow: '0 4px 20px rgba(0, 245, 255, 0.3)',
          '&:hover': {
            background: 'linear-gradient(45deg, #5ddef4, #b47cff)',
            boxShadow: '0 6px 25px rgba(0, 245, 255, 0.4)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '&.Mui-focused fieldset': {
              borderColor: '#00f5ff',
              boxShadow: '0 0 10px rgba(0, 245, 255, 0.3)',
            },
          },
        },
      },
    },
  },
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Component {...pageProps} />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#141b2d',
                color: '#ffffff',
                border: '1px solid rgba(0, 245, 255, 0.3)',
                borderRadius: '12px',
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}