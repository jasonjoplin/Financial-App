import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
} from '@mui/material'
import {
  AccountBalance as AccountIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as ReportIcon,
  SmartToy as AIIcon,
  Speed as SpeedIcon,
  MonetizationOn as MoneyIcon,
} from '@mui/icons-material'
import { toast } from 'react-hot-toast'

interface ChartOfAccounts {
  message: string
  chart_of_accounts: {
    [key: string]: {
      type: string
      normal_balance: string
      accounts: Array<{
        code: string
        name: string
        balance: number
      }>
    }
  }
  account_types_count: number
}

export default function Dashboard() {
  const { user, company, token, logout } = useAuth()
  const [chartData, setChartData] = useState<ChartOfAccounts | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchChartOfAccounts()
    }
  }, [token])

  const fetchChartOfAccounts = async () => {
    if (!token) {
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch('http://localhost:3001/api/v1/accounts/chart', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setChartData(data)
      } else {
        toast.error('Failed to load chart of accounts')
      }
    } catch (error) {
      toast.error('Connection error')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography variant="h5">Please login to access dashboard</Typography>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} sx={{ color: '#00f5ff' }} />
      </Box>
    )
  }

  // Calculate totals
  const calculateTotals = () => {
    if (!chartData) return { assets: 0, liabilities: 0, equity: 0, revenue: 0, expenses: 0 }
    
    const totals = {
      assets: 0,
      liabilities: 0,
      equity: 0,
      revenue: 0,
      expenses: 0,
    }

    Object.entries(chartData.chart_of_accounts).forEach(([key, group]) => {
      const total = group.accounts.reduce((sum, account) => sum + account.balance, 0)
      if (key === 'assets') totals.assets = total
      if (key === 'liabilities') totals.liabilities = total
      if (key === 'equity') totals.equity = total
      if (key === 'revenue') totals.revenue = total
      if (key === 'expenses') totals.expenses = total
    })

    return totals
  }

  const totals = calculateTotals()
  const netIncome = totals.revenue - totals.expenses

  return (
    <Layout title="Financial Dashboard">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" className="gradient-text" gutterBottom>
              📊 Financial Dashboard
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {company?.name} • Welcome back, {user.first_name}!
            </Typography>
          </Box>
          <Button variant="outlined" onClick={logout}>
            Logout
          </Button>
        </Box>

        {/* Key Metrics Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between">
                  <Box>
                    <Typography variant="h4" className="neon-text">
                      ${totals.assets.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Assets
                    </Typography>
                  </Box>
                  <AccountIcon sx={{ color: '#00e676', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between">
                  <Box>
                    <Typography variant="h4" sx={{ color: '#ff9800' }}>
                      ${totals.liabilities.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Liabilities
                    </Typography>
                  </Box>
                  <TrendingDownIcon sx={{ color: '#ff9800', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between">
                  <Box>
                    <Typography variant="h4" sx={{ color: '#7c4dff' }}>
                      ${totals.equity.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Owner's Equity
                    </Typography>
                  </Box>
                  <MoneyIcon sx={{ color: '#7c4dff', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between">
                  <Box>
                    <Typography 
                      variant="h4" 
                      sx={{ color: netIncome >= 0 ? '#00e676' : '#f44336' }}
                    >
                      ${netIncome.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Net Income
                    </Typography>
                  </Box>
                  {netIncome >= 0 ? (
                    <TrendingUpIcon sx={{ color: '#00e676', fontSize: 40 }} />
                  ) : (
                    <TrendingDownIcon sx={{ color: '#f44336', fontSize: 40 }} />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={4}>
          {/* Chart of Accounts */}
          <Grid item xs={12} lg={8}>
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h6" className="gradient-text" gutterBottom>
                  📋 Chart of Accounts
                </Typography>
                
                {chartData && Object.entries(chartData.chart_of_accounts).map(([key, group]) => (
                  <Box key={key} mb={3}>
                    <Typography variant="h6" color="primary" gutterBottom>
                      {group.type} ({group.normal_balance.toUpperCase()})
                    </Typography>
                    
                    <TableContainer component={Paper} sx={{ bgcolor: 'rgba(20, 27, 45, 0.5)' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Code</TableCell>
                            <TableCell>Account Name</TableCell>
                            <TableCell align="right">Balance</TableCell>
                            <TableCell align="right">Health</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {group.accounts.map((account) => (
                            <TableRow key={account.code} hover>
                              <TableCell>
                                <Chip 
                                  label={account.code} 
                                  size="small" 
                                  variant="outlined"
                                  color="primary"
                                />
                              </TableCell>
                              <TableCell>{account.name}</TableCell>
                              <TableCell align="right">
                                <Typography 
                                  variant="body2"
                                  fontWeight="bold"
                                  color={account.balance >= 0 ? 'inherit' : 'error'}
                                >
                                  ${account.balance.toLocaleString()}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(100, (account.balance / 50000) * 100)}
                                  sx={{
                                    width: 60,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    '& .MuiLinearProgress-bar': {
                                      backgroundColor: account.balance > 25000 ? '#00e676' : '#ff9800'
                                    }
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Actions & AI Insights */}
          <Grid item xs={12} lg={4}>
            <Grid container spacing={3}>
              {/* Quick Actions */}
              <Grid item xs={12}>
                <Card className="glass-card">
                  <CardContent>
                    <Typography variant="h6" className="gradient-text" gutterBottom>
                      ⚡ Quick Actions
                    </Typography>
                    
                    <List>
                      <ListItem>
                        <ListItemIcon>
                          <AIIcon sx={{ color: '#00f5ff' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary="AI Transaction Analysis"
                          secondary="Analyze new transactions with AI"
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemIcon>
                          <ReportIcon sx={{ color: '#7c4dff' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary="Generate Reports"
                          secondary="Trial balance, P&L, Balance sheet"
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemIcon>
                          <SpeedIcon sx={{ color: '#00e676' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary="Real-time Validation"
                          secondary="Check transaction balance"
                        />
                      </ListItem>
                    </List>

                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<AIIcon />}
                      href="/"
                      sx={{ mt: 2 }}
                    >
                      Go to AI Analysis
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              {/* Financial Health */}
              <Grid item xs={12}>
                <Card className="glass-card">
                  <CardContent>
                    <Typography variant="h6" className="gradient-text" gutterBottom>
                      💚 Financial Health
                    </Typography>
                    
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Asset Coverage Ratio
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (totals.assets / totals.liabilities) * 20)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          '& .MuiLinearProgress-bar': {
                            background: 'linear-gradient(45deg, #00f5ff, #00e676)'
                          }
                        }}
                      />
                      <Typography variant="caption" color="primary">
                        {((totals.assets / totals.liabilities) || 0).toFixed(2)}:1 ratio
                      </Typography>
                    </Box>

                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Profitability
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, Math.max(0, (netIncome / totals.revenue) * 100))}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          '& .MuiLinearProgress-bar': {
                            background: netIncome >= 0 
                              ? 'linear-gradient(45deg, #00e676, #7c4dff)' 
                              : 'linear-gradient(45deg, #f44336, #ff9800)'
                          }
                        }}
                      />
                      <Typography variant="caption" color={netIncome >= 0 ? 'success.main' : 'error.main'}>
                        {((netIncome / totals.revenue) * 100 || 0).toFixed(1)}% margin
                      </Typography>
                    </Box>

                    <Box display="flex" gap={1} mt={2}>
                      <Chip 
                        label="GAAP Compliant" 
                        color="success" 
                        size="small"
                        icon={<SpeedIcon />}
                      />
                      <Chip 
                        label="AI Monitored" 
                        color="primary" 
                        size="small"
                        icon={<AIIcon />}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Footer */}
        <Box textAlign="center" mt={4}>
          <Typography variant="body2" color="text.secondary">
            Financial AI Dashboard • Real-time Data • GAAP Compliant
          </Typography>
        </Box>
      </Container>
    </Layout>
  )
}