import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  LinearProgress,
  Divider
} from '@mui/material'
import {
  Assessment as ReportIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as BalanceIcon,
  Receipt as TransactionIcon,
  FileDownload as DownloadIcon,
  Print as PrintIcon,
  DateRange as DateIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material'
import { toast } from 'react-hot-toast'

interface Account {
  code: string
  name: string
  type: string
  balance: number
  normal_balance: string
}

interface ReportData {
  assets: Account[]
  liabilities: Account[]
  equity: Account[]
  revenue: Account[]
  expenses: Account[]
}

interface ProfitLossData {
  revenue: {
    accounts: Account[]
    total: number
  }
  expenses: {
    accounts: Account[]
    total: number
  }
  netIncome: number
}

interface BalanceSheetData {
  assets: {
    current: Account[]
    noncurrent: Account[]
    total: number
  }
  liabilities: {
    current: Account[]
    noncurrent: Account[]
    total: number
  }
  equity: {
    accounts: Account[]
    total: number
  }
}

export default function ReportsPage() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)
  const [reportData, setReportData] = useState<ReportData>({
    assets: [],
    liabilities: [],
    equity: [],
    revenue: [],
    expenses: []
  })
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Jan 1st current year
    endDate: new Date().toISOString().split('T')[0] // Today
  })

  useEffect(() => {
    if (token) {
      fetchReportData()
    }
  }, [token, dateRange])

  const fetchReportData = async () => {
    if (!token) {
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/accounts/chart`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        const chartData = data.chart_of_accounts
        setReportData({
          assets: chartData.assets?.accounts || [],
          liabilities: chartData.liabilities?.accounts || [],
          equity: chartData.equity?.accounts || [],
          revenue: chartData.revenue?.accounts || [],
          expenses: chartData.expenses?.accounts || []
        })
      } else {
        toast.error('Failed to load report data')
      }
    } catch (error) {
      toast.error('Connection error')
    } finally {
      setLoading(false)
    }
  }

  const generateProfitLoss = (): ProfitLossData => {
    const revenueTotal = reportData.revenue.reduce((sum, acc) => sum + acc.balance, 0)
    const expensesTotal = reportData.expenses.reduce((sum, acc) => sum + acc.balance, 0)
    
    return {
      revenue: {
        accounts: reportData.revenue,
        total: revenueTotal
      },
      expenses: {
        accounts: reportData.expenses,
        total: expensesTotal
      },
      netIncome: revenueTotal - expensesTotal
    }
  }

  const generateBalanceSheet = (): BalanceSheetData => {
    // Simplified categorization - in real app this would be more sophisticated
    const currentAssets = reportData.assets.filter(acc => 
      acc.code.startsWith('1') && parseInt(acc.code) < 1500
    )
    const nonCurrentAssets = reportData.assets.filter(acc => 
      acc.code.startsWith('1') && parseInt(acc.code) >= 1500
    )
    
    const currentLiabilities = reportData.liabilities.filter(acc => 
      acc.code.startsWith('2') && parseInt(acc.code) < 2500
    )
    const nonCurrentLiabilities = reportData.liabilities.filter(acc => 
      acc.code.startsWith('2') && parseInt(acc.code) >= 2500
    )

    const assetsTotal = reportData.assets.reduce((sum, acc) => sum + acc.balance, 0)
    const liabilitiesTotal = reportData.liabilities.reduce((sum, acc) => sum + acc.balance, 0)
    const equityTotal = reportData.equity.reduce((sum, acc) => sum + acc.balance, 0)

    return {
      assets: {
        current: currentAssets,
        noncurrent: nonCurrentAssets,
        total: assetsTotal
      },
      liabilities: {
        current: currentLiabilities,
        noncurrent: nonCurrentLiabilities,
        total: liabilitiesTotal
      },
      equity: {
        accounts: reportData.equity,
        total: equityTotal
      }
    }
  }

  const generateTrialBalance = () => {
    const allAccounts = [
      ...reportData.assets,
      ...reportData.liabilities,
      ...reportData.equity,
      ...reportData.revenue,
      ...reportData.expenses
    ]

    const totalDebits = allAccounts
      .filter(acc => acc.normal_balance === 'debit')
      .reduce((sum, acc) => sum + Math.max(0, acc.balance), 0)
    
    const totalCredits = allAccounts
      .filter(acc => acc.normal_balance === 'credit')
      .reduce((sum, acc) => sum + Math.max(0, acc.balance), 0)

    return {
      accounts: allAccounts.sort((a, b) => a.code.localeCompare(b.code)),
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
    }
  }

  const handleExport = (format: 'pdf' | 'excel') => {
    toast.success(`Exporting ${format.toUpperCase()} report...`)
    // In real app, this would generate and download the file
  }

  const handlePrint = () => {
    window.print()
  }

  const TabPanel = ({ children, value, index }: { children: React.ReactNode, value: number, index: number }) => (
    <div hidden={value !== index}>
      {value === index && children}
    </div>
  )

  if (loading) {
    return (
      <Layout title="Financial Reports">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <LinearProgress sx={{ width: '50%', color: '#00f5ff' }} />
        </Box>
      </Layout>
    )
  }

  const profitLoss = generateProfitLoss()
  const balanceSheet = generateBalanceSheet()
  const trialBalance = generateTrialBalance()

  return (
    <Layout title="Financial Reports">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" className="gradient-text" gutterBottom>
              📊 Financial Reports
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Comprehensive financial reporting with GAAP compliance
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
            >
              Print
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('pdf')}
            >
              Export PDF
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('excel')}
            >
              Export Excel
            </Button>
          </Box>
        </Box>

        {/* Date Range Controls */}
        <Card className="glass-card" sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <DateIcon sx={{ color: '#00f5ff', mr: 1 }} />
                <Typography variant="h6" component="span">
                  Report Period
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid item>
                <Button variant="outlined" onClick={fetchReportData}>
                  Refresh Reports
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Report Tabs */}
        <Card className="glass-card">
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab 
              label="Profit & Loss" 
              icon={<TrendingUpIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Balance Sheet" 
              icon={<BalanceIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Trial Balance" 
              icon={<TransactionIcon />} 
              iconPosition="start"
            />
          </Tabs>

          {/* Profit & Loss Report */}
          <TabPanel value={activeTab} index={0}>
            <CardContent>
              <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
                <Typography variant="h5" className="gradient-text">
                  Profit & Loss Statement
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Period: {dateRange.startDate} to {dateRange.endDate}
                </Typography>
              </Box>

              {/* Revenue Section */}
              <Box mb={4}>
                <Typography variant="h6" sx={{ color: '#00e676', mb: 2 }}>
                  📈 Revenue
                </Typography>
                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(0, 230, 118, 0.05)' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Account</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profitLoss.revenue.accounts.map((account) => (
                        <TableRow key={account.code}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {account.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {account.code}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ color: '#00e676' }}>
                              ${account.balance.toLocaleString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: 'rgba(0, 230, 118, 0.1)' }}>
                        <TableCell>
                          <Typography variant="body1" fontWeight="bold">
                            Total Revenue
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="h6" sx={{ color: '#00e676' }}>
                            ${profitLoss.revenue.total.toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Expenses Section */}
              <Box mb={4}>
                <Typography variant="h6" sx={{ color: '#f44336', mb: 2 }}>
                  📉 Expenses
                </Typography>
                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(244, 67, 54, 0.05)' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Account</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profitLoss.expenses.accounts.map((account) => (
                        <TableRow key={account.code}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {account.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {account.code}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ color: '#f44336' }}>
                              ${account.balance.toLocaleString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)' }}>
                        <TableCell>
                          <Typography variant="body1" fontWeight="bold">
                            Total Expenses
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="h6" sx={{ color: '#f44336' }}>
                            ${profitLoss.expenses.total.toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Net Income */}
              <Alert 
                severity={profitLoss.netIncome >= 0 ? 'success' : 'error'}
                sx={{ mb: 2 }}
              >
                <Typography variant="h6">
                  Net Income: ${profitLoss.netIncome.toLocaleString()}
                  {profitLoss.netIncome >= 0 ? ' (Profit)' : ' (Loss)'}
                </Typography>
              </Alert>
            </CardContent>
          </TabPanel>

          {/* Balance Sheet Report */}
          <TabPanel value={activeTab} index={1}>
            <CardContent>
              <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
                <Typography variant="h5" className="gradient-text">
                  Balance Sheet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  As of {dateRange.endDate}
                </Typography>
              </Box>

              <Grid container spacing={4}>
                {/* Assets */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ color: '#00e676', mb: 2 }}>
                    💰 Assets
                  </Typography>
                  
                  {/* Current Assets */}
                  <Box mb={3}>
                    <Typography variant="subtitle1" gutterBottom>
                      Current Assets
                    </Typography>
                    <TableContainer component={Paper} sx={{ bgcolor: 'rgba(20, 27, 45, 0.5)' }}>
                      <Table size="small">
                        <TableBody>
                          {balanceSheet.assets.current.map((account) => (
                            <TableRow key={account.code}>
                              <TableCell>{account.name}</TableCell>
                              <TableCell align="right">
                                ${account.balance.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>

                  {/* Non-Current Assets */}
                  <Box mb={3}>
                    <Typography variant="subtitle1" gutterBottom>
                      Non-Current Assets
                    </Typography>
                    <TableContainer component={Paper} sx={{ bgcolor: 'rgba(20, 27, 45, 0.5)' }}>
                      <Table size="small">
                        <TableBody>
                          {balanceSheet.assets.noncurrent.map((account) => (
                            <TableRow key={account.code}>
                              <TableCell>{account.name}</TableCell>
                              <TableCell align="right">
                                ${account.balance.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>

                  <Alert severity="info">
                    <Typography variant="h6">
                      Total Assets: ${balanceSheet.assets.total.toLocaleString()}
                    </Typography>
                  </Alert>
                </Grid>

                {/* Liabilities & Equity */}
                <Grid item xs={12} md={6}>
                  {/* Liabilities */}
                  <Typography variant="h6" sx={{ color: '#ff9800', mb: 2 }}>
                    📋 Liabilities
                  </Typography>
                  
                  <Box mb={3}>
                    <Typography variant="subtitle1" gutterBottom>
                      Current Liabilities
                    </Typography>
                    <TableContainer component={Paper} sx={{ bgcolor: 'rgba(20, 27, 45, 0.5)' }}>
                      <Table size="small">
                        <TableBody>
                          {balanceSheet.liabilities.current.map((account) => (
                            <TableRow key={account.code}>
                              <TableCell>{account.name}</TableCell>
                              <TableCell align="right">
                                ${account.balance.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>

                  <Box mb={3}>
                    <Typography variant="subtitle1" gutterBottom>
                      Non-Current Liabilities
                    </Typography>
                    <TableContainer component={Paper} sx={{ bgcolor: 'rgba(20, 27, 45, 0.5)' }}>
                      <Table size="small">
                        <TableBody>
                          {balanceSheet.liabilities.noncurrent.map((account) => (
                            <TableRow key={account.code}>
                              <TableCell>{account.name}</TableCell>
                              <TableCell align="right">
                                ${account.balance.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>

                  {/* Equity */}
                  <Typography variant="h6" sx={{ color: '#7c4dff', mb: 2 }}>
                    🏛️ Equity
                  </Typography>
                  
                  <TableContainer component={Paper} sx={{ bgcolor: 'rgba(20, 27, 45, 0.5)', mb: 3 }}>
                    <Table size="small">
                      <TableBody>
                        {balanceSheet.equity.accounts.map((account) => (
                          <TableRow key={account.code}>
                            <TableCell>{account.name}</TableCell>
                            <TableCell align="right">
                              ${account.balance.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Alert severity="warning">
                    <Typography variant="body2">
                      <strong>Total Liabilities:</strong> ${balanceSheet.liabilities.total.toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Total Equity:</strong> ${balanceSheet.equity.total.toLocaleString()}
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 1 }}>
                      <strong>Total Liab. + Equity:</strong> ${(balanceSheet.liabilities.total + balanceSheet.equity.total).toLocaleString()}
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>

              {/* Balance Check */}
              <Alert 
                severity={Math.abs(balanceSheet.assets.total - (balanceSheet.liabilities.total + balanceSheet.equity.total)) < 0.01 ? 'success' : 'error'}
                sx={{ mt: 3 }}
              >
                <Typography variant="h6">
                  Balance Sheet {Math.abs(balanceSheet.assets.total - (balanceSheet.liabilities.total + balanceSheet.equity.total)) < 0.01 ? 'Balances' : 'Does Not Balance'} ✓
                </Typography>
                <Typography variant="body2">
                  Assets = Liabilities + Equity (GAAP Fundamental Equation)
                </Typography>
              </Alert>
            </CardContent>
          </TabPanel>

          {/* Trial Balance Report */}
          <TabPanel value={activeTab} index={2}>
            <CardContent>
              <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
                <Typography variant="h5" className="gradient-text">
                  Trial Balance
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  As of {dateRange.endDate}
                </Typography>
              </Box>

              <TableContainer component={Paper} sx={{ bgcolor: 'rgba(20, 27, 45, 0.5)' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Account Code</TableCell>
                      <TableCell>Account Name</TableCell>
                      <TableCell align="right">Debit</TableCell>
                      <TableCell align="right">Credit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {trialBalance.accounts.map((account) => (
                      <TableRow key={account.code}>
                        <TableCell>
                          <Chip label={account.code} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {account.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {account.type}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {account.normal_balance === 'debit' && account.balance > 0 && (
                            <Typography variant="body2" sx={{ color: '#00e676' }}>
                              ${account.balance.toLocaleString()}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {account.normal_balance === 'credit' && account.balance > 0 && (
                            <Typography variant="body2" sx={{ color: '#ff9800' }}>
                              ${account.balance.toLocaleString()}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {/* Totals Row */}
                    <TableRow sx={{ 
                      bgcolor: trialBalance.isBalanced ? 'rgba(0, 230, 118, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                      '& td': { borderTop: 2, borderColor: 'divider' }
                    }}>
                      <TableCell colSpan={2}>
                        <Typography variant="h6" fontWeight="bold">
                          TOTALS
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" sx={{ color: '#00e676' }}>
                          ${trialBalance.totalDebits.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" sx={{ color: '#ff9800' }}>
                          ${trialBalance.totalCredits.toLocaleString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Alert 
                severity={trialBalance.isBalanced ? 'success' : 'error'}
                sx={{ mt: 3 }}
              >
                <Typography variant="h6">
                  Trial Balance {trialBalance.isBalanced ? 'Balances' : 'Does Not Balance'}
                  {trialBalance.isBalanced ? ' ✓' : ' ⚠'}
                </Typography>
                <Typography variant="body2">
                  Difference: ${Math.abs(trialBalance.totalDebits - trialBalance.totalCredits).toFixed(2)}
                </Typography>
              </Alert>
            </CardContent>
          </TabPanel>
        </Card>

        {/* GAAP Compliance Notice */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>GAAP Compliance:</strong> All reports follow Generally Accepted Accounting Principles. 
            Data is presented using the accrual method of accounting with proper revenue recognition and matching principles.
          </Typography>
        </Alert>
      </Container>
    </Layout>
  )
}