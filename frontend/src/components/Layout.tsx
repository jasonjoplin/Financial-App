import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'
import GlobalSearch from './GlobalSearch'
import AIAssistant from './AIAssistant'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  useTheme,
  useMediaQuery,
  Chip
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  SmartToy as AIIcon,
  AccountBalance as AccountsIcon,
  Receipt as TransactionIcon,
  Assessment as ReportsIcon,
  People as ContactsIcon,
  Payment as PaymentIcon,
  Description as InvoiceIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Home as HomeIcon,
  PhotoCamera as OCRIcon,
  Search as SearchIcon,
  Notifications as NotificationIcon
} from '@mui/icons-material'

const drawerWidth = 280

interface LayoutProps {
  children: React.ReactNode
  title?: string
}

export default function Layout({ children, title = 'Financial AI' }: LayoutProps) {
  const { user, company, logout } = useAuth()
  const router = useRouter()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  // Global keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const navigationItems = [
    { 
      label: 'Home', 
      icon: <HomeIcon />, 
      path: '/', 
      description: 'AI Analysis Dashboard' 
    },
    { 
      label: 'Dashboard', 
      icon: <DashboardIcon />, 
      path: '/dashboard', 
      description: 'Financial Overview' 
    },
    { 
      label: 'Chart of Accounts', 
      icon: <AccountsIcon />, 
      path: '/accounts', 
      description: 'Manage Account Structure' 
    },
    { 
      label: 'Transactions', 
      icon: <TransactionIcon />, 
      path: '/transactions', 
      description: 'Journal Entries & Ledger' 
    },
    { 
      label: 'Financial Reports', 
      icon: <ReportsIcon />, 
      path: '/reports', 
      description: 'P&L, Balance Sheet, Trial Balance' 
    },
    { 
      label: 'Customers & Vendors', 
      icon: <ContactsIcon />, 
      path: '/contacts', 
      description: 'Contact Management' 
    },
    { 
      label: 'Invoices & Bills', 
      icon: <InvoiceIcon />, 
      path: '/invoices', 
      description: 'Invoice & Bill Management' 
    },
    { 
      label: 'Payments', 
      icon: <PaymentIcon />, 
      path: '/payments', 
      description: 'Payment Tracking & Reconciliation' 
    },
    { 
      label: 'OCR Processing', 
      icon: <OCRIcon />, 
      path: '/ocr', 
      description: 'Document Processing' 
    },
    { 
      label: 'AI Settings', 
      icon: <SettingsIcon />, 
      path: '/settings', 
      description: 'AI Provider Configuration' 
    }
  ]

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget)
  }

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null)
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  const handleLogout = () => {
    logout()
    handleUserMenuClose()
    router.push('/')
  }

  const drawer = (
    <Box sx={{ height: '100%', background: 'linear-gradient(180deg, #0a0e1a 0%, #1a1f35 100%)' }}>
      {/* Logo & Company */}
      <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="h6" className="gradient-text" gutterBottom>
          Financial AI
        </Typography>
        {company && (
          <Typography variant="body2" color="text.secondary">
            {company.name}
          </Typography>
        )}
        <Chip 
          label="GAAP Compliant" 
          size="small" 
          color="primary" 
          sx={{ mt: 1 }}
        />
      </Box>

      {/* Navigation Menu */}
      <List sx={{ px: 2, py: 1 }}>
        {navigationItems.map((item) => {
          const isActive = router.pathname === item.path
          return (
            <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: 2,
                  minHeight: 48,
                  backgroundColor: isActive ? 'rgba(0, 245, 255, 0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(0, 245, 255, 0.3)' : '1px solid transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 245, 255, 0.05)',
                    border: '1px solid rgba(0, 245, 255, 0.2)'
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  color: isActive ? '#00f5ff' : 'text.secondary',
                  minWidth: 40 
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  secondary={item.description}
                  sx={{
                    '& .MuiListItemText-primary': {
                      color: isActive ? '#00f5ff' : 'text.primary',
                      fontWeight: isActive ? 600 : 400,
                      fontSize: '0.9rem'
                    },
                    '& .MuiListItemText-secondary': {
                      fontSize: '0.75rem',
                      color: 'text.secondary'
                    }
                  }}
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      {/* Quick Stats */}
      <Box sx={{ p: 2, mt: 'auto' }}>
        <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip 
            label="AI: Online" 
            size="small" 
            icon={<AIIcon />}
            sx={{ 
              backgroundColor: 'rgba(0, 230, 118, 0.2)',
              color: '#00e676',
              borderColor: '#00e676'
            }}
            variant="outlined"
          />
          <Chip 
            label="Real-time" 
            size="small" 
            sx={{ 
              backgroundColor: 'rgba(124, 77, 255, 0.2)',
              color: '#7c4dff',
              borderColor: '#7c4dff'
            }}
            variant="outlined"
          />
        </Box>
      </Box>
    </Box>
  )

  if (!user) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f35 100%)'
      }}>
        {children}
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          background: 'rgba(10, 14, 26, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
        elevation={0}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>

          <Box display="flex" alignItems="center" gap={2}>
            {/* Quick Actions */}
            <IconButton color="inherit" size="small">
              <Badge badgeContent={3} color="error">
                <NotificationIcon />
              </Badge>
            </IconButton>
            
            <IconButton 
              color="inherit" 
              size="small"
              onClick={() => setSearchOpen(true)}
              sx={{ 
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 1,
                px: 1,
                gap: 1
              }}
            >
              <SearchIcon />
              <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>
                Search (⌘K)
              </Typography>
            </IconButton>

            {/* User Menu */}
            <IconButton onClick={handleUserMenuOpen} size="small">
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32,
                  background: 'linear-gradient(45deg, #00f5ff, #7c4dff)'
                }}
              >
                {user.first_name?.[0]?.toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(20, 27, 45, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      >
        <Box sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="subtitle1">{user.first_name} {user.last_name}</Typography>
          <Typography variant="body2" color="text.secondary">{user.email}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => handleNavigation('/settings')}>
          <SettingsIcon sx={{ mr: 2 }} />
          Settings
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 2 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              border: 'none'
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              border: 'none'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f35 100%)'
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        {children}
      </Box>

      {/* Global Search Dialog */}
      <GlobalSearch 
        open={searchOpen} 
        onClose={() => setSearchOpen(false)} 
      />
      
      {/* AI Assistant - temporarily disabled */}
      {/* <AIAssistant /> */}
    </Box>
  )
}